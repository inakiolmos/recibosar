import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import sql from '../lib/db'
import { verifyToken } from '../lib/jwt'

function getAuth(req: FastifyRequest): { userId: string; merchantId: string } | null {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    return verifyToken(authHeader.slice(7))
  } catch {
    return null
  }
}

const VariantSchema = z.object({ label: z.string().min(1), price: z.number().positive() })
const AddonSchema = z.object({ label: z.string().min(1), extra_price: z.number().min(0) })

const ProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  category: z.string().optional().nullable(),
  active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  variants: z.array(VariantSchema).optional().default([]),
  addons: z.array(AddonSchema).optional().default([]),
})

export async function productRoutes(app: FastifyInstance) {
  // GET /api/dashboard/products
  app.get('/dashboard/products', async (req, reply) => {
    const auth = getAuth(req)
    if (!auth) return reply.status(401).send({ error: 'No autorizado' })

    const products = await sql<{
      id: string; name: string; price: string; category: string | null;
      active: boolean; sort_order: number; variants: unknown; addons: unknown; created_at: string
    }[]>`
      SELECT id, name, price, category, active, sort_order, variants, addons, created_at
      FROM products
      WHERE merchant_id = ${auth.merchantId}
      ORDER BY sort_order ASC, created_at ASC
    `
    return { products }
  })

  // POST /api/dashboard/products
  app.post('/dashboard/products', async (req, reply) => {
    const auth = getAuth(req)
    if (!auth) return reply.status(401).send({ error: 'No autorizado' })

    const body = ProductSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0]?.message ?? 'Datos inválidos' })

    const { name, price, category = null, active = true, sort_order = 0, variants, addons } = body.data
    const [product] = await sql<{ id: string }[]>`
      INSERT INTO products (merchant_id, name, price, category, active, sort_order, variants, addons)
      VALUES (${auth.merchantId}, ${name}, ${price}, ${category}, ${active}, ${sort_order},
              ${sql.json(variants as any)}, ${sql.json(addons as any)})
      RETURNING id
    `
    return reply.status(201).send({ id: product.id })
  })

  // PUT /api/dashboard/products/:id
  app.put('/dashboard/products/:id', async (req, reply) => {
    const auth = getAuth(req)
    if (!auth) return reply.status(401).send({ error: 'No autorizado' })

    const { id } = req.params as { id: string }
    const body = ProductSchema.partial().safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0]?.message ?? 'Datos inválidos' })

    const [row] = await sql`SELECT id FROM products WHERE id = ${id} AND merchant_id = ${auth.merchantId}`
    if (!row) return reply.status(404).send({ error: 'Producto no encontrado' })

    const { name, price, category, active, sort_order, variants, addons } = body.data
    await sql`
      UPDATE products SET
        name       = COALESCE(${name ?? null}, name),
        price      = COALESCE(${price ?? null}, price),
        category   = COALESCE(${category ?? null}, category),
        active     = COALESCE(${active ?? null}, active),
        sort_order = COALESCE(${sort_order ?? null}, sort_order),
        variants   = COALESCE(${variants != null ? sql.json(variants as any) : null}, variants),
        addons     = COALESCE(${addons != null ? sql.json(addons as any) : null}, addons)
      WHERE id = ${id}
    `
    return { ok: true }
  })

  // DELETE /api/dashboard/products/:id
  app.delete('/dashboard/products/:id', async (req, reply) => {
    const auth = getAuth(req)
    if (!auth) return reply.status(401).send({ error: 'No autorizado' })

    const { id } = req.params as { id: string }
    const [row] = await sql`DELETE FROM products WHERE id = ${id} AND merchant_id = ${auth.merchantId} RETURNING id`
    if (!row) return reply.status(404).send({ error: 'Producto no encontrado' })
    return { ok: true }
  })

  // GET /api/pos/:slug/products — public
  app.get('/pos/:slug/products', async (req, reply) => {
    const { slug } = req.params as { slug: string }

    const [merchant] = await sql<{ id: string; name: string; brand_color: string; logo_url: string | null }[]>`
      SELECT id, name, brand_color, logo_url FROM merchants WHERE slug = ${slug}
    `
    if (!merchant) return reply.status(404).send({ error: 'Comercio no encontrado' })

    const products = await sql<{
      id: string; name: string; price: string; category: string | null; variants: unknown; addons: unknown
    }[]>`
      SELECT id, name, price, category, variants, addons
      FROM products
      WHERE merchant_id = ${merchant.id} AND active = true
      ORDER BY sort_order ASC, name ASC
    `
    return { merchant, products }
  })
}
