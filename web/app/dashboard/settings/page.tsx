'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'

type SettingsState = { error?: string; success?: string } | null

async function saveSettingsAction(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
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
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, brand_color, logo_url }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { error: data.error ?? 'Error al guardar' }
  }

  return { success: 'Cambios guardados' }
}

export default function SettingsPage() {
  const [state, formAction, isPending] = useActionState(saveSettingsAction, null)
  const [color, setColor] = useState('#111827')

  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-xl font-bold text-gray-900">Configuración</h1>

      <form action={formAction} className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        {state?.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
            {state.success}
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
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>

        <div>
          <label htmlFor="brand_color" className="block text-sm font-medium text-gray-700 mb-1">
            Color principal
          </label>
          <div className="flex items-center gap-3">
            <input
              id="brand_color"
              name="brand_color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-16 rounded-lg border border-gray-200 cursor-pointer"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              pattern="#[0-9a-fA-F]{6}"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Aparece en el header del ticket digital</p>
        </div>

        <div>
          <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 mb-1">
            URL del logo (opcional)
          </label>
          <input
            id="logo_url"
            name="logo_url"
            type="url"
            placeholder="https://..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
          />
          <p className="text-xs text-gray-400 mt-1">Link directo a la imagen (JPG, PNG, SVG)</p>
        </div>

        {/* Preview */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Vista previa del header</p>
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-2"
            style={{ backgroundColor: color }}
          >
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
              C
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-tight">Tu comercio</p>
              <p className="text-white/70 text-xs">Ticket digital</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-60 transition-opacity"
        >
          {isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}
