'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { registerAction } from '@/lib/auth'

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAction, null)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🧾</div>
          <h1 className="text-2xl font-bold text-gray-900">Receiptile</h1>
          <p className="text-gray-500 text-sm mt-1">Creá tu cuenta de comerciante</p>
        </div>

        <form action={formAction} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          {state?.error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del comercio
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="La Parrilla de Don Juan"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
              Identificador único
            </label>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-black/10">
              <span className="px-3 py-3 bg-gray-50 text-gray-400 text-sm border-r border-gray-200 whitespace-nowrap">
                receiptile.ar/r/
              </span>
              <input
                id="slug"
                name="slug"
                type="text"
                required
                pattern="[a-z0-9-]+"
                placeholder="don-juan"
                className="flex-1 px-3 py-3 text-sm focus:outline-none"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Solo letras minúsculas, números y guiones</p>
          </div>

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
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="mínimo 8 caracteres"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-60 transition-opacity"
          >
            {isPending ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-gray-900 font-medium underline underline-offset-2">
            Ingresá
          </Link>
        </p>
      </div>
    </div>
  )
}
