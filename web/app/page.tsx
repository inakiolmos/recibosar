import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🧾</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Receiptile</h1>
        <p className="text-gray-500 mb-8">
          Recibos digitales para cafés y comercios.
          <br />
          El cliente apoya el celu y recibe su comprobante.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-medium text-center hover:bg-gray-800 transition-colors"
          >
            Ir al dashboard →
          </Link>
          <Link
            href="/register"
            className="w-full bg-white text-gray-700 rounded-xl py-3 text-sm font-medium text-center border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Crear cuenta
          </Link>
        </div>
        <p className="text-xs text-gray-300 mt-8">Demo: /r/don-juan</p>
      </div>
    </div>
  )
}
