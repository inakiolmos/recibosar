import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import sql from '../lib/db'
import { verifyToken } from '../lib/jwt'

function getAuth(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'No autorizado' })
    return null
  }
  try {
    return verifyToken(authHeader.slice(7))
  } catch {
    reply.status(401).send({ error: 'Token inválido' })
    return null
  }
}

const UpdateMerchantSchema = z.object({
  name: z.string().min(2).optional(),
  brand_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido (ej: #c1440e)')
    .optional(),
  logo_url: z.string().url().nullable().optional(),
})

export async function dashboardRoutes(app: FastifyInstance) {
  // GET /api/dashboard/stats
  app.get('/dashboard/stats', async (req, reply) => {
    const auth = getAuth(req, reply)
    if (!auth) return

    const [stats] = await sql<
      {
        today_count: string
        today_total: string | null
        week_count: string
        week_total: string | null
        month_count: string
        month_total: string | null
      }[]
    >`
      SELECT
        COUNT(*) FILTER (WHERE emitted_at >= NOW() - INTERVAL '1 day')   AS today_count,
        SUM(total) FILTER (WHERE emitted_at >= NOW() - INTERVAL '1 day')  AS today_total,
        COUNT(*) FILTER (WHERE emitted_at >= NOW() - INTERVAL '7 days')  AS week_count,
        SUM(total) FILTER (WHERE emitted_at >= NOW() - INTERVAL '7 days') AS week_total,
        COUNT(*) FILTER (WHERE emitted_at >= NOW() - INTERVAL '30 days') AS month_count,
        SUM(total) FILTER (WHERE emitted_at >= NOW() - INTERVAL '30 days') AS month_total
      FROM tickets
      WHERE merchant_id = ${auth.merchantId}
    `

    return {
      today: {
        count: Number(stats.today_count),
        total: Number(stats.today_total ?? 0),
      },
      week: {
        count: Number(stats.week_count),
        total: Number(stats.week_total ?? 0),
      },
      month: {
        count: Number(stats.month_count),
        total: Number(stats.month_total ?? 0),
      },
    }
  })

  // GET /api/dashboard/tickets?page=1&limit=20
  app.get('/dashboard/tickets', async (req, reply) => {
    const auth = getAuth(req, reply)
    if (!auth) return

    const { page = '1', limit = '20' } = req.query as {
      page?: string
      limit?: string
    }
    const pageNum = Math.max(1, parseInt(page, 10))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))
    const offset = (pageNum - 1) * limitNum

    const tickets = await sql<
      {
        id: string
        total: string
        currency: string
        emitted_at: string
        items: unknown
        tile_id: string | null
      }[]
    >`
      SELECT id, total, currency, emitted_at, items, tile_id
      FROM tickets
      WHERE merchant_id = ${auth.merchantId}
      ORDER BY emitted_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `

    const [{ count }] = await sql<{ count: string }[]>`
      SELECT COUNT(*) FROM tickets WHERE merchant_id = ${auth.merchantId}
    `

    return {
      tickets: tickets.map((t) => ({ ...t, total: Number(t.total) })),
      total: Number(count),
      page: pageNum,
      limit: limitNum,
    }
  })

  // GET /api/dashboard/merchant
  app.get('/dashboard/merchant', async (req, reply) => {
    const auth = getAuth(req, reply)
    if (!auth) return

    const [merchant] = await sql`
      SELECT id, name, slug, logo_url, brand_color, subscription_status, created_at
      FROM merchants
      WHERE id = ${auth.merchantId}
    `
    if (!merchant) return reply.status(404).send({ error: 'Comercio no encontrado' })
    return merchant
  })

  // GET /api/dashboard/daily?days=30
  app.get('/dashboard/daily', async (req, reply) => {
    const auth = getAuth(req, reply)
    if (!auth) return

    const { days = '30' } = req.query as { days?: string }
    const daysNum = Math.min(90, Math.max(1, parseInt(days, 10)))

    const rows = await sql<{ day: string; total: string; count: string }[]>`
      SELECT
        DATE(emitted_at AT TIME ZONE 'America/Argentina/Buenos_Aires') AS day,
        SUM(total)  AS total,
        COUNT(*)    AS count
      FROM tickets
      WHERE merchant_id = ${auth.merchantId}
        AND emitted_at >= NOW() - (${daysNum} * INTERVAL '1 day')
      GROUP BY 1
      ORDER BY 1 ASC
    `

    const today = new Date()
    const result = []
    for (let i = daysNum - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dayStr = d.toISOString().split('T')[0]
      const found = rows.find((r) => String(r.day).startsWith(dayStr))
      result.push({
        day: dayStr,
        total: found ? Number(found.total) : 0,
        count: found ? Number(found.count) : 0,
      })
    }
    return result
  })

  // PUT /api/dashboard/merchant
  app.put('/dashboard/merchant', async (req, reply) => {
    const auth = getAuth(req, reply)
    if (!auth) return

    const body = UpdateMerchantSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({
        error: body.error.issues[0]?.message ?? 'Datos inválidos',
      })
    }

    const { name, brand_color, logo_url } = body.data

    await sql`
      UPDATE merchants
      SET
        name        = COALESCE(${name ?? null}, name),
        brand_color = COALESCE(${brand_color ?? null}, brand_color),
        logo_url    = CASE WHEN ${logo_url !== undefined} THEN ${logo_url ?? null} ELSE logo_url END
      WHERE id = ${auth.merchantId}
    `

    const [merchant] = await sql`
      SELECT id, name, slug, logo_url, brand_color, subscription_status
      FROM merchants WHERE id = ${auth.merchantId}
    `
    return merchant
  })
}
