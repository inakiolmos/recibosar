const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export interface TicketItem {
  description: string
  qty: number
  unit_price: number
  total: number
}

export interface Merchant {
  id: string
  name: string
  slug: string
  logo_url: string | null
  brand_color: string
  subscription_status: string
}

export interface Ticket {
  id: string
  items: TicketItem[]
  subtotal: number | null
  tax: number | null
  total: number
  currency: string
  emitted_at: string
  fiscal_reference: string | null
  fiscal_url: string | null
}

export interface LatestTicketResponse {
  merchant: Merchant
  ticket: Ticket | null
}

export async function getLatestTicket(slug: string): Promise<LatestTicketResponse | null> {
  const res = await fetch(`${API_URL}/api/merchants/${slug}/latest-ticket`, {
    next: { revalidate: 0 }, // no cache — cada tap es fresco
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function logView(ticketId: string, action: string, userAgent?: string) {
  await fetch(`${API_URL}/api/tickets/${ticketId}/views`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action_taken: action, user_agent: userAgent }),
  }).catch(() => {
    // analytics no bloqueantes
  })
}
