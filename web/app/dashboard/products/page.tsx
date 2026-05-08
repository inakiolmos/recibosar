'use client'

import { useEffect, useState, useTransition } from 'react'

interface Product {
  id: string
  name: string
  price: string
  category: string | null
  active: boolean
  sort_order: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function getToken() {
  return document.cookie.split('; ').find((c) => c.startsWith('token='))?.split('=')[1] ?? ''
}

function ars(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch(`${API_URL}/api/dashboard/products`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (res.ok) {
      const d = await res.json()
      setProducts(d.products)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditProduct(null)
    setName('')
    setPrice('')
    setCategory('')
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setEditProduct(p)
    setName(p.name)
    setPrice(String(parseFloat(p.price)))
    setCategory(p.category ?? '')
    setShowForm(true)
  }

  function handleSave() {
    startTransition(async () => {
      const payload = { name, price: parseFloat(price), category: category || null }
      const url = editProduct
        ? `${API_URL}/api/dashboard/products/${editProduct.id}`
        : `${API_URL}/api/dashboard/products`
      const method = editProduct ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setShowForm(false)
        load()
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await fetch(`${API_URL}/api/dashboard/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      load()
    })
  }

  async function toggleActive(p: Product) {
    await fetch(`${API_URL}/api/dashboard/products/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ active: !p.active }),
    })
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-400 mt-0.5">Armá tu carta para cobrar desde el POS</p>
        </div>
        <button
          onClick={openNew}
          className="bg-gray-900 text-white rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          + Nuevo producto
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              {editProduct ? 'Editar producto' : 'Nuevo producto'}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Café con leche"
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Precio (ARS)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="1200"
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Categoría <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Bebidas calientes"
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-200 rounded-full py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!name || !price || isPending}
                className="flex-1 bg-gray-900 text-white rounded-full py-3 text-sm font-semibold disabled:opacity-50 hover:bg-gray-800 transition-colors"
              >
                {isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm mb-4">Aún no hay productos. Creá el primero.</p>
            <button
              onClick={openNew}
              className="bg-gray-900 text-white rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              + Nuevo producto
            </button>
          </div>
        ) : (
          <>
            <div className="hidden sm:grid grid-cols-[1fr_120px_140px_80px] gap-4 px-6 py-3 border-b border-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <span>Nombre</span>
              <span>Categoría</span>
              <span className="text-right">Precio</span>
              <span className="text-right">Activo</span>
            </div>
            <div className="divide-y divide-gray-50">
              {products.map((p) => (
                <div key={p.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    {p.category && <p className="text-xs text-gray-400 mt-0.5">{p.category}</p>}
                  </div>
                  <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
                    {ars(parseFloat(p.price))}
                  </p>
                  <button
                    onClick={() => toggleActive(p)}
                    className={`w-9 h-5 rounded-full transition-colors relative ${p.active ? 'bg-gray-900' : 'bg-gray-200'}`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${p.active ? 'left-4' : 'left-0.5'}`}
                    />
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <polyline points="3,6 5,6 21,6" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
