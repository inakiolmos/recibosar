'use client'

import { useActionState, useState } from 'react'

type State = { error?: string; success?: string } | null

async function saveAction(_prev: State, formData: FormData): Promise<State> {
  const name = formData.get('name') as string
  const brand_color = formData.get('brand_color') as string
  const logo_url = (formData.get('logo_url') as string) || null

  const token = document.cookie
    .split('; ')
    .find((c) => c.startsWith('token='))
    ?.split('=')[1]
  if (!token) return { error: 'Sesión expirada' }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
  const res = await fetch(`${apiUrl}/api/dashboard/merchant`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, brand_color, logo_url }),
  })

  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    return { error: d.error ?? 'Error al guardar' }
  }
  return { success: '¡Cambios guardados!' }
}

export default function SettingsPage() {
  const [state, formAction, isPending] = useActionState(saveAction, null)
  const [color, setColor] = useState('#6D28D9')

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-400 mt-0.5">Personalizá cómo se ve tu ticket público</p>
      </div>

      <form action={formAction} className="space-y-4">
        {state?.error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {state.success}
          </div>
        )}

        {/* Nombre */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
            Nombre del comercio
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="La Parrilla de Don Juan"
            className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 bg-gray-50"
          />
        </div>

        {/* Color */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Color principal
          </label>
          <div className="flex items-center gap-3 mb-4">
            <input
              name="brand_color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-11 w-16 rounded-xl border border-gray-200 cursor-pointer"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              pattern="#[0-9a-fA-F]{6}"
              className="flex-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-mono bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>

          {/* Preview */}
          <p className="text-xs text-gray-400 mb-2">Vista previa del ticket</p>
          <div className="rounded-2xl overflow-hidden border border-gray-100">
            <div
              className="px-4 py-3 flex items-center gap-2.5"
              style={{ backgroundColor: color }}
            >
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                C
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">Tu comercio</p>
                <p className="text-white/60 text-xs">Ticket digital</p>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Café con leche</span>
                <span className="text-sm font-semibold" style={{ color }}>$1.200</span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <span className="text-sm font-bold" style={{ color }}>$1.200</span>
              </div>
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <label htmlFor="logo_url" className="block text-sm font-semibold text-gray-700 mb-1">
            URL del logo
            <span className="text-gray-400 font-normal ml-1">(opcional)</span>
          </label>
          <p className="text-xs text-gray-400 mb-2">Link directo a una imagen (JPG, PNG, SVG)</p>
          <input
            id="logo_url"
            name="logo_url"
            type="url"
            placeholder="https://mi-sitio.com/logo.png"
            className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 bg-gray-50"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-gray-900 text-white rounded-full py-3.5 text-sm font-semibold disabled:opacity-60 transition-opacity hover:bg-gray-800"
        >
          {isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}
