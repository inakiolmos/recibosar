import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession, getToken } from '@/lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Stats {
  today: { count: number; total: number }
  week: { count: number; total: number }
  month: { count: number; total: number }
}

interface DailyPoint {
  day: string
  total: number
  count: number
}

interface Ticket {
  id: string
  total: number
  currency: string
  emitted_at: string
  items: { description: string; qty: number; total: number }[]
}

// ─── helpers ────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function ars(n: number, compact = false) {
  if (compact && n >= 1_000_000)
    return '$' + (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (compact && n >= 1_000)
    return '$' + (n / 1_000).toFixed(0) + 'k'
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
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

// ─── Chart components (pure SVG / CSS) ────────────────────────────────────

function Sparkline({
  data,
  color,
  height = 56,
}: {
  data: number[]
  color: string
  height?: number
}) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const W = 220
  const H = height
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - (v / max) * H * 0.85 - H * 0.05,
  ])
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  // filled area under the line
  const area = `${d} L${W},${H} L0,${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace('#', '')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* last dot */}
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill={color} />
    </svg>
  )
}

function BarChart({
  bars,
}: {
  bars: { label: string; value: number; sublabel?: string; color: string; highlight?: boolean }[]
}) {
  const max = Math.max(...bars.map((b) => b.value), 1)
  return (
    <div className="flex items-end gap-3 h-28">
      {bars.map((bar, i) => {
        const pct = Math.max((bar.value / max) * 100, 4)
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            {bar.sublabel && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={
                  bar.highlight
                    ? { backgroundColor: '#6D28D9', color: 'white' }
                    : { backgroundColor: '#F3F4F6', color: '#6B7280' }
                }
              >
                {bar.sublabel}
              </span>
            )}
            <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
              <div
                className="w-full rounded-xl transition-all"
                style={{
                  height: `${pct}%`,
                  backgroundColor: bar.color,
                  minHeight: '8px',
                }}
              />
            </div>
            <span className="text-[10px] text-gray-400 text-center leading-tight">{bar.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function MultiArcGauge({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: { value: number; color: string; label: string }[]
  centerValue: string
  centerLabel: string
}) {
  const total = segments.reduce((s, v) => s + v.value, 0) || 1
  const W = 200
  const H = 155
  const cx = W / 2
  const cy = H / 2 + 18
  const R = 66
  const SW = 14
  const GAP = 5 // degrees
  const START = -210
  const SWEEP = 240

  function toRad(deg: number) {
    return (deg * Math.PI) / 180
  }
  function point(a: number) {
    return [cx + R * Math.cos(toRad(a)), cy + R * Math.sin(toRad(a))]
  }
  function arc(a: number, b: number) {
    const [x1, y1] = point(a)
    const [x2, y2] = point(b)
    const large = b - a > 180 ? 1 : 0
    return `M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)}`
  }

  let acc = START
  const paths = segments.map((seg) => {
    const sweep = (seg.value / total) * SWEEP - GAP
    const s = acc + GAP / 2
    const e = s + sweep
    acc = e + GAP / 2
    return { d: arc(s, e), color: seg.color, label: seg.label }
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Track */}
      <path d={arc(START, START + SWEEP)} fill="none" stroke="#F3F4F6" strokeWidth={SW} strokeLinecap="round" />
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill="none" stroke={p.color} strokeWidth={SW} strokeLinecap="round" />
      ))}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="20" fontWeight="700" fill="#111827">
        {centerValue}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="11" fill="#9CA3AF">
        {centerLabel}
      </text>
    </svg>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

async function fetchAll(token: string) {
  const h = { Authorization: `Bearer ${token}` }
  const [sR, tR, mR, dR] = await Promise.all([
    fetch(`${API_URL}/api/dashboard/stats`, { headers: h, next: { revalidate: 30 } }),
    fetch(`${API_URL}/api/dashboard/tickets?limit=8`, { headers: h, next: { revalidate: 30 } }),
    fetch(`${API_URL}/api/dashboard/merchant`, { headers: h, next: { revalidate: 60 } }),
    fetch(`${API_URL}/api/dashboard/daily?days=30`, { headers: h, next: { revalidate: 60 } }),
  ])
  if (!sR.ok || !tR.ok || !mR.ok || !dR.ok) return null
  const [stats, ticketsData, merchant, daily] = await Promise.all([
    sR.json() as Promise<Stats>,
    tR.json() as Promise<{ tickets: Ticket[]; total: number }>,
    mR.json(),
    dR.json() as Promise<DailyPoint[]>,
  ])
  return { stats, recentTickets: ticketsData.tickets, totalTickets: ticketsData.total, merchant, daily }
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const token = await getToken()
  if (!token) redirect('/login')

  const data = await fetchAll(token)
  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Error cargando datos. Verificá que la API esté corriendo.
      </div>
    )
  }

  const { stats, recentTickets, totalTickets, merchant, daily } = data
  const color = merchant.brand_color ?? '#6D28D9'
  const greeting = getGreeting()

  // Sparkline — últimos 14 días
  const sparkData = daily.slice(-14).map((d: DailyPoint) => d.total)

  // Trend vs semana anterior
  const thisWeekTotal = stats.week.total
  const prevWeekData = daily.slice(-14, -7)
  const prevWeekTotal = prevWeekData.reduce((s: number, d: DailyPoint) => s + d.total, 0)
  const weekTrend =
    prevWeekTotal > 0
      ? Math.round(((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100)
      : null

  // Bar chart — comparar semanas
  const week1 = daily.slice(-21, -14).reduce((s: number, d: DailyPoint) => s + d.total, 0)
  const week2 = daily.slice(-14, -7).reduce((s: number, d: DailyPoint) => s + d.total, 0)
  const week3 = daily.slice(-7).reduce((s: number, d: DailyPoint) => s + d.total, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {session.name.split(' ')[0]}!
        </h1>
        <Link
          href={`/r/${merchant.slug}`}
          target="_blank"
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <span>+</span>
          <span>Ver ticket público</span>
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-full px-4 py-2 hover:bg-gray-50 transition-colors">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M7 12h10M11 18h2" /></svg>
            Filtrar
          </button>
          <button className="flex items-center gap-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-full px-4 py-2 hover:bg-gray-50 transition-colors">
            Último mes
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
          </button>
          <button className="flex items-center gap-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-full px-4 py-2 hover:bg-gray-50 transition-colors">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Exportar
          </button>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-400 w-48">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          Buscar…
        </div>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1 — Mis ventas (izquierda, alta) */}
        <div className="bg-white rounded-3xl shadow-sm p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Mis ventas</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              {totalTickets} tickets
            </span>
          </div>

          {/* Ticket card visual */}
          <div
            className="rounded-2xl p-4 text-white flex flex-col gap-1"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
          >
            {merchant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={merchant.logo_url} alt="" className="h-7 w-7 rounded-full object-cover mb-1" />
            ) : (
              <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold mb-1">
                {merchant.name[0]}
              </div>
            )}
            <span className="text-2xl font-bold">{ars(stats.month.total, true)}</span>
            <span className="text-white/70 text-xs">Este mes · {stats.month.count} tickets</span>
          </div>

          {/* Filas */}
          <div className="space-y-1">
            <MetricRow label="Hoy" value={ars(stats.today.total)} sub={`${stats.today.count} tickets`} />
            <MetricRow label="Esta semana" value={ars(stats.week.total)} sub={`${stats.week.count} tickets`} />
            <div className="border-t border-gray-100 pt-2 mt-2">
              <MetricRow
                label="Este mes"
                value={ars(stats.month.total)}
                sub={`${stats.month.count} tickets`}
                bold
              />
            </div>
          </div>
        </div>

        {/* Card 2 — Evolución semanal (centro) */}
        <div className="bg-white rounded-3xl shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Evolución</h2>
            <Link href="/dashboard/tickets" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
              Ver detalle <span>›</span>
            </Link>
          </div>

          <div>
            <div className="text-2xl font-bold text-gray-900">{ars(stats.month.total, true)}</div>
            <div className="text-xs text-gray-400">Total del mes</div>
          </div>

          {/* 3 valores */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Sem -2', value: week1 },
              { label: 'Sem -1', value: week2 },
              { label: 'Esta sem', value: week3 },
            ].map((w) => (
              <div key={w.label}>
                <div className="text-sm font-semibold text-gray-800">{ars(w.value, true)}</div>
                <div className="text-[10px] text-gray-400">{w.label}</div>
              </div>
            ))}
          </div>

          <BarChart
            bars={[
              { label: 'Sem -2', value: week1, color: '#111827' },
              {
                label: 'Sem -1',
                value: week2,
                sublabel: weekTrend !== null ? `${weekTrend > 0 ? '+' : ''}${weekTrend}%` : undefined,
                color: color,
                highlight: true,
              },
              { label: 'Esta', value: week3, color: `${color}55` },
            ]}
          />
        </div>

        {/* Card 3 — Gauge (derecha) */}
        <div className="bg-white rounded-3xl shadow-sm p-6 flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-900">Distribución</h2>
          </div>

          <MultiArcGauge
            segments={[
              { value: Math.max(stats.today.total, 1), color: '#EF4444', label: 'Hoy' },
              {
                value: Math.max(stats.week.total - stats.today.total, 1),
                color: '#F59E0B',
                label: 'Semana',
              },
              {
                value: Math.max(stats.month.total - stats.week.total, 1),
                color: color,
                label: 'Mes',
              },
            ]}
            centerValue={ars(stats.today.total, true)}
            centerLabel="Hoy"
          />

          <div className="w-full flex justify-center gap-5 mt-2">
            {[
              { color: '#EF4444', label: 'Hoy' },
              { color: '#F59E0B', label: 'Semana' },
              { color: color, label: 'Mes' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid inferior */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 4 — Tendencia sparkline */}
        <div className="bg-white rounded-3xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-gray-900">Tendencia</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">30 días</span>
          </div>
          <div className="flex items-end gap-3 mb-3">
            <span className="text-2xl font-bold text-gray-900">{ars(stats.month.total, true)}</span>
            {weekTrend !== null && (
              <span
                className={`text-sm font-semibold flex items-center gap-0.5 mb-0.5 ${
                  weekTrend >= 0 ? 'text-green-600' : 'text-red-500'
                }`}
              >
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    d={
                      weekTrend >= 0
                        ? 'M10 17a1 1 0 01-1-1V6.414L5.707 9.707a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L11 6.414V16a1 1 0 01-1 1z'
                        : 'M10 3a1 1 0 011 1v9.586l3.293-3.293a1 1 0 011.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 111.414-1.414L9 13.586V4a1 1 0 011-1z'
                    }
                  />
                </svg>
                {Math.abs(weekTrend)}%
              </span>
            )}
          </div>
          <Sparkline data={sparkData.length > 1 ? sparkData : [0, 1, 2, 3, 2, 4, 3, 5]} color={color} />
          <div className="flex justify-between mt-2 text-[10px] text-gray-300">
            <span>hace 14 días</span>
            <span>hoy</span>
          </div>
        </div>

        {/* Card 5 — Tickets recientes */}
        <div className="rounded-3xl shadow-sm p-6 text-white" style={{ backgroundColor: color }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Tickets recientes</h2>
            <span className="text-xs opacity-60 bg-white/10 px-2.5 py-1 rounded-full">30 días</span>
          </div>

          <div className="text-3xl font-bold mb-0.5">{ars(stats.today.total, true)}</div>
          <div className="text-sm opacity-70 mb-5">Ventas de hoy</div>

          <div className="space-y-2">
            {recentTickets.slice(0, 4).map((t) => {
              const first = Array.isArray(t.items) ? t.items[0] : null
              return (
                <div key={t.id} className="flex items-center justify-between bg-white/10 rounded-2xl px-3 py-2.5">
                  <div>
                    <p className="text-xs font-medium truncate max-w-[140px]">
                      {first?.description ?? 'Ticket'}
                    </p>
                    <p className="text-[10px] opacity-60">{fmtDate(t.emitted_at)}</p>
                  </div>
                  <span className="text-xs font-semibold">{ars(t.total, true)}</span>
                </div>
              )
            })}
            {recentTickets.length === 0 && (
              <p className="text-xs opacity-60 text-center py-4">
                Aún no hay tickets. Cargá el seed para la demo.
              </p>
            )}
          </div>

          {totalTickets > 4 && (
            <Link
              href="/dashboard/tickets"
              className="mt-4 flex items-center justify-center gap-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
            >
              Ver todos los tickets →
            </Link>
          )}
        </div>
      </div>

      {/* Merchant ID info */}
      <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-5 py-4 flex items-center justify-between gap-4 text-sm">
        <div>
          <p className="font-medium text-gray-700">Merchant ID para el bridge</p>
          <code className="text-xs text-gray-400 font-mono">{merchant.id}</code>
        </div>
        <a
          href={`/r/${merchant.slug}`}
          target="_blank"
          className="text-xs text-blue-500 hover:underline whitespace-nowrap"
        >
          /r/{merchant.slug} →
        </a>
      </div>
    </div>
  )
}

function MetricRow({
  label,
  value,
  sub,
  bold,
}: {
  label: string
  value: string
  sub: string
  bold?: boolean
}) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${bold ? '' : ''}`}>
      <div>
        <p className={`text-sm ${bold ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{label}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
      <p className={`text-sm font-semibold ${bold ? 'text-gray-900' : 'text-gray-700'}`}>{value}</p>
    </div>
  )
}
