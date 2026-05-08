'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/dashboard', label: 'Resumen' },
  { href: '/dashboard/tickets', label: 'Tickets' },
  { href: '/dashboard/products', label: 'Productos' },
  { href: '/dashboard/settings', label: 'Config' },
]

export function NavLinks() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1 bg-gray-100 rounded-full px-1 py-1">
      {links.map(({ href, label }) => {
        const isActive =
          href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`text-sm px-4 py-1.5 rounded-full font-medium transition-colors ${
              isActive ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
