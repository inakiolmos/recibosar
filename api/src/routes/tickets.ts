import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import sql from '../lib/db'

const TicketItemSchema = z.object({
  description: z.string(),
  qty: z.number().positive(),
  unit_price: z.number().nonnegative(),
  total: z.number().nonnegative(),
})

const CreateTicketSchema = z.object({
  merchant_id: z.string().uuid(),
  tile_id: z.string().uuid().optional(),
  items: z.array(TicketItemSchema).min(1),
  subtotal: z.number().nonnegative().optional(),
  tax: z.number().nonnegative().optional(),
  total: z.number().nonnegative(),
  currency: z.string().default('ARS'),
  emitted_at: z.string().datetime(),
  fiscal_reference: z.string().optional(),
  fiscal_url: z.string().url().optional(),
  raw_payload: z.record(z.unknown()).optional(),
})

const CreateViewSchema = z.object({
  user_agent: z.string().optional(),
  action_taken: z.enum(['pdf', 'wallet', 'email', 'photo', 'none']).default('none'),
})

export async function ticketRoutes(app: FastifyInstance) {
  // POST /api/tickets — el bridge sube un ticket nuevo
  app.post('/tickets', async (req, reply) => {
    const body = CreateTicketSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Datos inválidos', details: body.error.issues })
    }

    const {
      merchant_id,
      tile_id,
      items,
      subtotal,
      tax,
      total,
      currency,
      emitted_at,
      fiscal_reference,
      fiscal_url,
      raw_payload,
    } = body.data

    // Verificar que el merchant existe
    const [merchant] = await sql<{ id: string }[]>`
      SELECT id FROM merchants WHERE id = ${merchant_id}
    `
    if (!merchant) {
      return reply.status(404).send({ error: 'Merchant no encontrado' })
    }

    const [ticket] = await sql<{ id: string }[]>`
      INSERT INTO tickets (
        merchant_id, tile_id, raw_payload, items,
        subtotal, tax, total, currency,
        emitted_at, fiscal_reference, fiscal_url
      ) VALUES (
        ${merchant_id},
        ${tile_id ?? null},
        ${raw_payload ? sql.json(raw_payload as import('postgres').JSONValue) : null},
        ${sql.json(items)},
        ${subtotal ?? null},
        ${tax ?? null},
        ${total},
        ${currency},
        ${emitted_at},
        ${fiscal_reference ?? null},
        ${fiscal_url ?? null}
      )
      RETURNING id
    `

    return reply.status(201).send({ id: ticket.id })
  })

  // POST /api/tickets/:id/views — registra un tap/visualización
  app.post('/tickets/:id/views', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = CreateViewSchema.safeParse(req.body ?? {})
    if (!body.success) {
      return reply.status(400).send({ error: 'Datos inválidos' })
    }

    const userAgent = body.data.user_agent ?? (req.headers['user-agent'] || null)
    const actionTaken = body.data.action_taken

    const [ticket] = await sql<{ id: string }[]>`
      SELECT id FROM tickets WHERE id = ${id}
    `
    if (!ticket) {
      return reply.status(404).send({ error: 'Ticket no encontrado' })
    }

    await sql`
      INSERT INTO ticket_views (ticket_id, user_agent, action_taken)
      VALUES (${id}, ${userAgent}, ${actionTaken})
    `

    return reply.status(201).send({ ok: true })
  })
}
