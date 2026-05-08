'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction } from '@/lib/auth'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🧾</div>
          <h1 className="text-2xl font-bold text-gray-900">Receiptile</h1>
          <p className="text-gray-500 text-sm mt-1">Ingresá a tu cuenta</p>
        </div>

        <form action={formAction} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          {state?.error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="tu@email.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-60 transition-opacity"
          >
            {isPending ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          ¿No tenés cuenta?{' '}
          <Link href="/register" className="text-gray-900 font-medium underline underline-offset-2">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  )
}
