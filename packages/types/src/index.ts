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
  created_at: string
}

export interface Ticket {
  id: string
  merchant_id: string
  tile_id: string | null
  items: TicketItem[]
  subtotal: number | null
  tax: number | null
  total: number
  currency: string
  emitted_at: string
  fiscal_reference: string | null
  fiscal_url: string | null
  created_at: string
}

// Respuesta de GET /api/merchants/:slug/latest-ticket
export interface LatestTicketResponse {
  merchant: Merchant
  ticket: Ticket | null
}

// Body de POST /api/tickets (viene del bridge)
export interface CreateTicketBody {
  merchant_id: string
  tile_id?: string
  items: TicketItem[]
  subtotal?: number
  tax?: number
  total: number
  currency?: string
  emitted_at: string
  fiscal_reference?: string
  fiscal_url?: string
  raw_payload?: Record<string, unknown>
}

// Body de POST /api/tickets/:id/views
export interface CreateViewBody {
  user_agent?: string
  action_taken?: 'pdf' | 'wallet' | 'email' | 'photo' | 'none'
}
