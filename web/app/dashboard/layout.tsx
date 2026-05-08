import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession, logoutAction } from '@/lib/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-gray-900">🧾 Receiptile</span>
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/dashboard"
                className="text-sm px-3 py-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                Resumen
              </Link>
              <Link
                href="/dashboard/tickets"
                className="text-sm px-3 py-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                Tickets
              </Link>
              <Link
                href="/dashboard/settings"
                className="text-sm px-3 py-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                Configuración
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:block">{session.name}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-xs text-gray-500 hover:text-gray-900 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="sm:hidden bg-white border-b border-gray-100 px-4 flex gap-1 overflow-x-auto">
        <Link
          href="/dashboard"
          className="text-sm px-3 py-2 text-gray-600 hover:text-gray-900 whitespace-nowrap"
        >
          Resumen
        </Link>
        <Link
          href="/dashboard/tickets"
          className="text-sm px-3 py-2 text-gray-600 hover:text-gray-900 whitespace-nowrap"
        >
          Tickets
        </Link>
        <Link
          href="/dashboard/settings"
          className="text-sm px-3 py-2 text-gray-600 hover:text-gray-900 whitespace-nowrap"
        >
          Config
        </Link>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
