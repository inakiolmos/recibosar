'use client'

import { useState } from 'react'
import { logView } from '@/lib/api'

interface Props {
  ticketId: string
  brandColor: string
}

export default function TicketActions({ ticketId, brandColor }: Props) {
  const [emailSent, setEmailSent] = useState(false)
  const [email, setEmail] = useState('')
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [sending, setSending] = useState(false)

  async function handleAction(action: string) {
    await logView(ticketId, action, navigator.userAgent)
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setSending(true)
    await handleAction('email')
    // En Fase 4 esto llama a POST /api/tickets/:id/email
    // Por ahora solo loguea la acción
    setTimeout(() => {
      setSending(false)
      setEmailSent(true)
      setShowEmailInput(false)
    }, 800)
  }

  const buttonBase =
    'flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-medium transition-opacity active:opacity-70'

  return (
    <div className="mt-4 space-y-2">
      {/* Descargar PDF */}
      <a
        href={`${process.env.NEXT_PUBLIC_API_URL}/api/tickets/${ticketId}/pdf`}
        onClick={() => handleAction('pdf')}
        className={buttonBase}
        style={{ backgroundColor: brandColor, color: 'white' }}
      >
        <span>📄</span> Descargar PDF
      </a>

      {/* Apple Wallet */}
      <a
        href={`${process.env.NEXT_PUBLIC_API_URL}/api/tickets/${ticketId}/wallet`}
        onClick={() => handleAction('wallet')}
        className={`${buttonBase} bg-black text-white`}
      >
        <span>🎫</span> Agregar a Apple Wallet
      </a>

      {/* Enviar por email */}
      {!emailSent ? (
        <>
          <button
            onClick={() => setShowEmailInput((v) => !v)}
            className={`${buttonBase} bg-gray-100 text-gray-700`}
          >
            <span>✉️</span> Enviar por email
          </button>
          {showEmailInput && (
            <form onSubmit={handleEmail} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                required
              />
              <button
                type="submit"
                disabled={sending}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white"
                style={{ backgroundColor: brandColor }}
              >
                {sending ? '...' : 'Enviar'}
              </button>
            </form>
          )}
        </>
      ) : (
        <div className="text-center text-sm text-green-600 py-2">
          ✓ Te lo mandamos a {email}
        </div>
      )}
    </div>
  )
}
