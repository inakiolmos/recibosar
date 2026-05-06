import { FastifyInstance } from 'fastify'
import sql from '../lib/db'

const TICKET_WINDOW_MINUTES = parseInt(process.env.TICKET_WINDOW_MINUTES ?? '5', 10)

export async function merchantRoutes(app: FastifyInstance) {
  // GET /api/merchants/:slug/latest-ticket
  // Devuelve el merchant y su último ticket dentro de la ventana temporal.
  // Usado por el frontend para renderizar la página pública del ticket.
  app.get('/merchants/:slug/latest-ticket', async (req, reply) => {
    const { slug } = req.params as { slug: string }

    const [merchant] = await sql<
      {
        id: string
        name: string
        slug: string
        logo_url: string | null
        brand_color: string
        subscription_status: string
        created_at: string
      }[]
    >`
      SELECT id, name, slug, logo_url, brand_color, subscription_status, created_at
      FROM merchants
      WHERE slug = ${slug}
    `

    if (!merchant) {
      return reply.status(404).send({ error: 'Comercio no encontrado' })
    }

    const [ticket] = await sql<
      {
        id: string
        merchant_id: string
        tile_id: string | null
        items: unknown
        subtotal: string | null
        tax: string | null
        total: string
        currency: string
        emitted_at: string
        fiscal_reference: string | null
        fiscal_url: string | null
        created_at: string
      }[]
    >`
      SELECT
        id, merchant_id, tile_id, items,
        subtotal, tax, total, currency,
        emitted_at, fiscal_reference, fiscal_url, created_at
      FROM tickets
      WHERE merchant_id = ${merchant.id}
        AND emitted_at > NOW() - (${TICKET_WINDOW_MINUTES} * INTERVAL '1 minute')
      ORDER BY emitted_at DESC
      LIMIT 1
    `

    return {
      merchant,
      ticket: ticket
        ? {
            ...ticket,
            subtotal: ticket.subtotal ? parseFloat(ticket.subtotal) : null,
            tax: ticket.tax ? parseFloat(ticket.tax) : null,
            total: parseFloat(ticket.total),
          }
        : null,
    }
  })
}
