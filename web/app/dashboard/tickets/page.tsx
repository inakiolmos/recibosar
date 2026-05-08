import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getToken } from '@/lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Ticket {
  id: string
  total: number
  currency: string
  emitted_at: string
  items: { description: string; qty: number; unit_price: number; total: number }[]
  tile_id: string | null
}

function ars(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(n)
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const token = await getToken()
  if (!token) redirect('/login')

  const { page = '1' } = await searchParams
  const pageNum = Math.max(1, parseInt(page, 10))
  const limit = 20

  const res = await fetch(
    `${API_URL}/api/dashboard/tickets?page=${pageNum}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 30 } }
  )
  if (!res.ok) redirect('/login')

  const { tickets, total } = (await res.json()) as {
    tickets: Ticket[]
    total: number
    page: number
    limit: number
  }
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} en total</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        {tickets.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            Aún no hay tickets. Corré el seed para ver datos demo.
          </div>
        ) : (
          <>
            <div className="hidden sm:grid grid-cols-[1fr_140px_140px] gap-4 px-6 py-3 border-b border-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <span>Descripción</span>
              <span className="text-right">Monto</span>
              <span className="text-right">Fecha</span>
            </div>

            <div className="divide-y divide-gray-50">
              {tickets.map((ticket) => {
                const first = Array.isArray(ticket.items) ? ticket.items[0] : null
                const extra = Array.isArray(ticket.items) ? ticket.items.length - 1 : 0
                return (
                  <div key={ticket.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {first?.description ?? 'Ticket'}
                        {extra > 0 && (
                          <span className="text-gray-400 font-normal ml-1">+{extra} más</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 sm:hidden">{fmtDate(ticket.emitted_at)}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 whitespace-nowrap">{ars(ticket.total)}</p>
                    <p className="text-xs text-gray-400 whitespace-nowrap hidden sm:block">{fmtDate(ticket.emitted_at)}</p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          {pageNum > 1 && (
            <Link
              href={`/dashboard/tickets?page=${pageNum - 1}`}
              className="px-5 py-2.5 rounded-full border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              ← Anterior
            </Link>
          )}
          <span className="text-sm text-gray-400 px-2">
            {pageNum} / {totalPages}
          </span>
          {pageNum < totalPages && (
            <Link
              href={`/dashboard/tickets?page=${pageNum + 1}`}
              className="px-5 py-2.5 rounded-full border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
