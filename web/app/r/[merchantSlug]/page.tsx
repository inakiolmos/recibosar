import { getLatestTicket, Ticket, Merchant } from '@/lib/api'
import { notFound } from 'next/navigation'
import TicketActions from '@/components/TicketActions'

export const dynamic = 'force-dynamic'

function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function NoTicket({ merchant }: { merchant: Merchant }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-gray-50">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-3xl"
        style={{ backgroundColor: merchant.brand_color + '20' }}
      >
        🧾
      </div>
      <h1 className="text-xl font-semibold text-gray-800 mb-2">{merchant.name}</h1>
      <p className="text-gray-500 text-sm max-w-xs">
        No hay un ticket disponible en este momento.
        <br />
        Pedile al cajero que lo emita de nuevo.
      </p>
    </div>
  )
}

function TicketView({ merchant, ticket }: { merchant: Merchant; ticket: Ticket }) {
  const color = merchant.brand_color

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header del comercio */}
      <header
        className="px-5 py-4 flex items-center gap-3"
        style={{ backgroundColor: color }}
      >
        {merchant.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={merchant.logo_url}
            alt={merchant.name}
            className="h-9 w-9 rounded-full object-cover bg-white"
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
            {merchant.name[0]}
          </div>
        )}
        <div>
          <p className="text-white font-semibold text-base leading-tight">{merchant.name}</p>
          <p className="text-white/70 text-xs">Ticket digital</p>
        </div>
      </header>

      {/* Cuerpo del ticket */}
      <main className="flex-1 px-4 py-5 max-w-md mx-auto w-full">
        {/* Fecha */}
        <p className="text-xs text-gray-400 mb-4 text-right">{formatDate(ticket.emitted_at)}</p>

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          {ticket.items.map((item, i) => (
            <div key={i} className="px-4 py-3 flex justify-between items-start gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{item.description}</p>
                {item.qty > 1 && (
                  <p className="text-xs text-gray-400">
                    {item.qty} × {formatARS(item.unit_price)}
                  </p>
                )}
              </div>
              <p className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                {formatARS(item.total)}
              </p>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className="bg-white rounded-2xl shadow-sm mt-3 px-4 py-3 space-y-2">
          {ticket.subtotal != null && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{formatARS(ticket.subtotal)}</span>
            </div>
          )}
          {ticket.tax != null && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>IVA</span>
              <span>{formatARS(ticket.tax)}</span>
            </div>
          )}
          <div
            className="flex justify-between text-base font-bold pt-2 border-t border-gray-100"
            style={{ color }}
          >
            <span>Total</span>
            <span>{formatARS(ticket.total)}</span>
          </div>
        </div>

        {/* Comprobante fiscal ARCA */}
        {ticket.fiscal_url && (
          <a
            href={ticket.fiscal_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 bg-white rounded-2xl shadow-sm px-4 py-3 text-sm text-blue-600"
          >
            <span>🔏</span>
            <span>
              Ver comprobante fiscal
              {ticket.fiscal_reference && (
                <span className="text-gray-400 ml-1">(CAE {ticket.fiscal_reference})</span>
              )}
            </span>
            <span className="ml-auto text-gray-400">›</span>
          </a>
        )}

        {/* Acciones: PDF, Wallet, Email, Foto */}
        <TicketActions ticketId={ticket.id} brandColor={color} />

        <p className="text-center text-xs text-gray-300 mt-8 mb-4">
          Ticket digital — sin registro, sin app
        </p>
      </main>
    </div>
  )
}

export default async function TicketPage({
  params,
}: {
  params: Promise<{ merchantSlug: string }>
}) {
  const { merchantSlug } = await params
  const data = await getLatestTicket(merchantSlug)

  if (!data) notFound()

  const { merchant, ticket } = data

  if (!ticket) {
    return <NoTicket merchant={merchant} />
  }

  return <TicketView merchant={merchant} ticket={ticket} />
}
