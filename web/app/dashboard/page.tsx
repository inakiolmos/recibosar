import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession, getToken } from '@/lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Stats {
  today: { count: number; total: number }
  week: { count: number; total: number }
  month: { count: number; total: number }
}

interface Ticket {
  id: string
  total: number
  currency: string
  emitted_at: string
  items: { description: string; qty: number; total: number }[]
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

async function fetchDashboardData(token: string) {
  const headers = { Authorization: `Bearer ${token}` }
  const [statsRes, ticketsRes, merchantRes] = await Promise.all([
    fetch(`${API_URL}/api/dashboard/stats`, { headers, next: { revalidate: 30 } }),
    fetch(`${API_URL}/api/dashboard/tickets?limit=10`, { headers, next: { revalidate: 30 } }),
    fetch(`${API_URL}/api/dashboard/merchant`, { headers, next: { revalidate: 60 } }),
  ])

  if (!statsRes.ok || !ticketsRes.ok || !merchantRes.ok) return null

  const [stats, ticketsData, merchant] = await Promise.all([
    statsRes.json() as Promise<Stats>,
    ticketsRes.json() as Promise<{ tickets: Ticket[]; total: number }>,
    merchantRes.json(),
  ])

  return { stats, recentTickets: ticketsData.tickets, totalTickets: ticketsData.total, merchant }
}

function StatCard({
  label,
  count,
  total,
  color,
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mb-1">{formatARS(total)}</p>
      <p className="text-sm text-gray-500">
        {count} ticket{count !== 1 ? 's' : ''}
      </p>
      <div className="mt-3 h-1 rounded-full bg-gray-100">
        <div className="h-1 rounded-full" style={{ width: '100%', backgroundColor: color }} />
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const token = await getToken()
  if (!token) redirect('/login')

  const data = await fetchDashboardData(token)

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        Error cargando datos. Intentá de nuevo.
      </div>
    )
  }

  const { stats, recentTickets, totalTickets, merchant } = data
  const color = merchant.brand_color ?? '#111827'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{merchant.name}</h1>
          <p className="text-sm text-gray-400">
            Ticket pública:{' '}
            <a
              href={`/r/${merchant.slug}`}
              target="_blank"
              rel="noopener"
              className="text-blue-500 hover:underline"
            >
              /r/{merchant.slug}
            </a>
          </p>
        </div>
        <span
          className="text-xs font-medium px-3 py-1 rounded-full"
          style={{ backgroundColor: color + '20', color }}
        >
          {merchant.subscription_status === 'trial' ? 'Prueba' : 'Activo'}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Hoy" count={stats.today.count} total={stats.today.total} color={color} />
        <StatCard
          label="Esta semana"
          count={stats.week.count}
          total={stats.week.total}
          color={color}
        />
        <StatCard
          label="Este mes"
          count={stats.month.count}
          total={stats.month.total}
          color={color}
        />
      </div>

      {/* Tickets recientes */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Tickets recientes</h2>
          {totalTickets > 10 && (
            <Link
              href="/dashboard/tickets"
              className="text-sm text-blue-500 hover:underline"
            >
              Ver todos ({totalTickets})
            </Link>
          )}
        </div>

        {recentTickets.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">
            Todavía no hay tickets. Cuando el bridge suba el primer ticket, va a aparecer acá.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentTickets.map((ticket) => {
              const firstItem = Array.isArray(ticket.items) ? ticket.items[0] : null
              return (
                <div key={ticket.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {firstItem?.description ?? 'Ticket'}
                      {Array.isArray(ticket.items) && ticket.items.length > 1 && (
                        <span className="text-gray-400 font-normal">
                          {' '}
                          +{ticket.items.length - 1} más
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(ticket.emitted_at)}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-800" style={{ color }}>
                    {formatARS(ticket.total)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Info setup */}
      <div className="bg-blue-50 rounded-2xl p-5 text-sm text-blue-700">
        <p className="font-semibold mb-1">Tu Merchant ID (para el bridge)</p>
        <code className="bg-blue-100 px-2 py-1 rounded text-xs font-mono break-all">
          {merchant.id}
        </code>
        <p className="text-blue-500 text-xs mt-2">
          Usá este ID en el bridge para que los tickets aparezcan acá.
        </p>
      </div>
    </div>
  )
}
