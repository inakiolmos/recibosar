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

function formatARS(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string) {
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
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 30 },
    }
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Tickets</h1>
        <span className="text-sm text-gray-400">{total} en total</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {tickets.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No hay tickets aún.</div>
        ) : (
          <>
            {/* Header tabla — solo desktop */}
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 bg-gray-50 text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <span>Descripción</span>
              <span className="text-right">Monto</span>
              <span className="text-right">Fecha</span>
              <span />
            </div>

            <div className="divide-y divide-gray-50">
              {tickets.map((ticket) => {
                const firstItem = Array.isArray(ticket.items) ? ticket.items[0] : null
                const extraItems = Array.isArray(ticket.items) ? ticket.items.length - 1 : 0
                return (
                  <div
                    key={ticket.id}
                    className="px-5 py-3 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {firstItem?.description ?? 'Ticket'}
                        {extraItems > 0 && (
                          <span className="text-gray-400 font-normal"> +{extraItems} más</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(ticket.emitted_at)}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                      {formatARS(ticket.total)}
                    </p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {pageNum > 1 && (
            <Link
              href={`/dashboard/tickets?page=${pageNum - 1}`}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50 transition-colors"
            >
              ← Anterior
            </Link>
          )}
          <span className="text-sm text-gray-400">
            {pageNum} / {totalPages}
          </span>
          {pageNum < totalPages && (
            <Link
              href={`/dashboard/tickets?page=${pageNum + 1}`}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50 transition-colors"
            >
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
