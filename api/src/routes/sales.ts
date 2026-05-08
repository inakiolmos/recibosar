import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import sql from '../lib/db'
import { verifyToken } from '../lib/jwt'

const SaleItemSchema = z.object({
  product_id: z.string().uuid(),
  name: z.string(),
  price: z.number().positive(),
  qty: z.number().int().positive(),
})

const CreateSaleSchema = z.object({
  items: z.array(SaleItemSchema).min(1),
  payment_method: z.enum(['cash', 'card', 'mp']),
})

export async function salesRoutes(app: FastifyInstance) {
  // POST /api/pos/:slug/sales — create a sale (public, called from cobro page)
  app.post('/pos/:slug/sales', async (req, reply) => {
    const { slug } = req.params as { slug: string }

    const [merchant] = await sql<{ id: string }[]>`
      SELECT id FROM merchants WHERE slug = ${slug}
    `
    if (!merchant) return reply.status(404).send({ error: 'Comercio no encontrado' })

    const body = CreateSaleSchema.safeParse(req.body)
    if (!body.success) return reply.status(400).send({ error: body.error.issues[0]?.message ?? 'Datos inválidos' })

    const { items, payment_method } = body.data
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)

    const [sale] = await sql<{ id: string }[]>`
      INSERT INTO sales (merchant_id, items, total, payment_method)
      VALUES (${merchant.id}, ${sql.json(items as any)}, ${total}, ${payment_method})
      RETURNING id
    `
    return reply.status(201).send({ id: sale.id, total })
  })

  // GET /api/dashboard/sales — paginated sales for dashboard (protected)
  app.get('/dashboard/sales', async (req, reply) => {
    const authHeader = (req.headers as any).authorization as string | undefined
    if (!authHeader?.startsWith('Bearer ')) return reply.status(401).send({ error: 'No autorizado' })

    let payload: { userId: string; merchantId: string }
    try {
      payload = verifyToken(authHeader.slice(7))
    } catch {
      return reply.status(401).send({ error: 'Token inválido' })
    }

    const { page = '1', limit = '20' } = req.query as { page?: string; limit?: string }
    const pageNum = Math.max(1, parseInt(page, 10))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))
    const offset = (pageNum - 1) * limitNum

    const [{ count }] = await sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM sales WHERE merchant_id = ${payload.merchantId}
    `
    const sales = await sql<{
      id: string; total: string; payment_method: string; status: string; items: unknown; created_at: string
    }[]>`
      SELECT id, total, payment_method, status, items, created_at
      FROM sales
      WHERE merchant_id = ${payload.merchantId}
      ORDER BY created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `
    return { sales, total: parseInt(count, 10), page: pageNum, limit: limitNum }
  })
}
