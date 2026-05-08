import { redirect } from 'next/navigation'
import { getSession, logoutAction } from '@/lib/auth'
import { NavLinks } from './NavLinks'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const initials = session.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0F2F5' }}>
      {/* Top nav */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center">
              <span className="text-white text-xs font-bold">RT</span>
            </div>
          </div>

          {/* Pills nav */}
          <NavLinks />

          {/* Right icons */}
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <form action={logoutAction} className="contents">
              <button
                type="submit"
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold transition-opacity hover:opacity-80"
                style={{ backgroundColor: session.brand_color ?? '#6D28D9' }}
                title="Cerrar sesión"
              >
                {initials}
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}

