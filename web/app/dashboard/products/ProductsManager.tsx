'use client'

import { useState, useTransition, useOptimistic } from 'react'
import { createProduct, updateProduct, deleteProduct } from './actions'
import type { Product, Variant, Addon } from './actions'

function ars(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

const VARIANT_PRESETS = ['Chico', 'Mediano', 'Grande', 'S', 'M', 'L', 'XL', 'Simple', 'Doble']
const ADDON_PRESETS = ['Extra shot', 'Leche de avena', 'Leche de almendras', 'Sin azúcar', 'Con crema', 'Descafeinado', 'Syrup de vainilla']

function emptyForm() {
  return { name: '', price: '', category: '', variants: [] as Variant[], addons: [] as Addon[] }
}

export function ProductsManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [form, setForm] = useState(emptyForm())

  // Variant editing
  const [newVariantLabel, setNewVariantLabel] = useState('')
  const [newVariantPrice, setNewVariantPrice] = useState('')
  // Addon editing
  const [newAddonLabel, setNewAddonLabel] = useState('')
  const [newAddonPrice, setNewAddonPrice] = useState('')

  function openNew() {
    setEditProduct(null)
    setForm(emptyForm())
    setNewVariantLabel(''); setNewVariantPrice('')
    setNewAddonLabel(''); setNewAddonPrice('')
    setError('')
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setEditProduct(p)
    setForm({ name: p.name, price: String(parseFloat(p.price)), category: p.category ?? '', variants: p.variants ?? [], addons: p.addons ?? [] })
    setNewVariantLabel(''); setNewVariantPrice('')
    setNewAddonLabel(''); setNewAddonPrice('')
    setError('')
    setShowForm(true)
  }

  function addVariant() {
    if (!newVariantLabel || !newVariantPrice) return
    setForm((f) => ({ ...f, variants: [...f.variants, { label: newVariantLabel, price: parseFloat(newVariantPrice) }] }))
    setNewVariantLabel(''); setNewVariantPrice('')
  }

  function removeVariant(i: number) {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }))
  }

  function addAddon() {
    if (!newAddonLabel) return
    setForm((f) => ({ ...f, addons: [...f.addons, { label: newAddonLabel, extra_price: parseFloat(newAddonPrice) || 0 }] }))
    setNewAddonLabel(''); setNewAddonPrice('')
  }

  function removeAddon(i: number) {
    setForm((f) => ({ ...f, addons: f.addons.filter((_, idx) => idx !== i) }))
  }

  function handleSave() {
    if (!form.name || !form.price) { setError('Completá nombre y precio'); return }
    setError('')
    startTransition(async () => {
      const payload = {
        name: form.name,
        price: parseFloat(form.price),
        category: form.category || null,
        variants: form.variants,
        addons: form.addons,
      }
      let result
      if (editProduct) {
        result = await updateProduct(editProduct.id, payload)
      } else {
        result = await createProduct(payload)
      }
      if (!result.ok) { setError(result.error ?? 'Error al guardar'); return }

      // Optimistic update
      if (editProduct) {
        setProducts((prev) => prev.map((p) => p.id === editProduct.id
          ? { ...p, ...payload, price: String(payload.price) } : p))
      } else {
        // Re-fetch to get new id (or just reload)
        setProducts((prev) => [...prev, { ...payload, id: Date.now().toString(), active: true, sort_order: 0, price: String(payload.price) }])
      }
      setShowForm(false)
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteProduct(id)
      setProducts((prev) => prev.filter((p) => p.id !== id))
    })
  }

  function handleToggle(p: Product) {
    startTransition(async () => {
      await updateProduct(p.id, { active: !p.active })
      setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, active: !x.active } : x))
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-400 mt-0.5">Armá tu carta para cobrar desde el POS</p>
        </div>
        <button onClick={openNew} className="bg-gray-900 text-white rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors">
          + Nuevo producto
        </button>
      </div>

      {/* Form sheet */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">{editProduct ? 'Editar producto' : 'Nuevo producto'}</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-2xl px-4 py-2">{error}</p>}

              {/* Basic fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Café con leche"
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Precio base (ARS)</label>
                    <input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="1200"
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Categoría (opcional)</label>
                    <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      placeholder="Bebidas"
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200" />
                  </div>
                </div>
              </div>

              {/* Variants */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tamaños / Variantes</label>
                  <span className="text-xs text-gray-400">Si hay variantes, reemplazan el precio base</span>
                </div>

                {form.variants.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {form.variants.map((v, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-2xl px-3 py-2">
                        <span className="text-sm text-gray-700 font-medium">{v.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{ars(v.price)}</span>
                          <button onClick={() => removeVariant(i)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick preset chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {VARIANT_PRESETS.filter((p) => !form.variants.find((v) => v.label === p)).map((preset) => (
                    <button key={preset} onClick={() => setNewVariantLabel(preset)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${newVariantLabel === preset ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input value={newVariantLabel} onChange={(e) => setNewVariantLabel(e.target.value)}
                    placeholder="Nombre (ej: Grande)"
                    className="flex-1 border border-gray-200 rounded-2xl px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200" />
                  <input type="number" value={newVariantPrice} onChange={(e) => setNewVariantPrice(e.target.value)}
                    placeholder="Precio"
                    className="w-24 border border-gray-200 rounded-2xl px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200" />
                  <button onClick={addVariant} disabled={!newVariantLabel || !newVariantPrice}
                    className="px-3 py-2 bg-gray-900 text-white rounded-2xl text-sm font-semibold disabled:opacity-40">
                    +
                  </button>
                </div>
              </div>

              {/* Add-ons */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Extras / Add-ons</label>
                  <span className="text-xs text-gray-400">Opcionales, se suman al precio</span>
                </div>

                {form.addons.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {form.addons.map((a, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-2xl px-3 py-2">
                        <span className="text-sm text-gray-700 font-medium">{a.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">+{ars(a.extra_price)}</span>
                          <button onClick={() => removeAddon(i)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Addon preset chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ADDON_PRESETS.filter((p) => !form.addons.find((a) => a.label === p)).map((preset) => (
                    <button key={preset} onClick={() => setNewAddonLabel(preset)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${newAddonLabel === preset ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input value={newAddonLabel} onChange={(e) => setNewAddonLabel(e.target.value)}
                    placeholder="Extra (ej: Extra shot)"
                    className="flex-1 border border-gray-200 rounded-2xl px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200" />
                  <input type="number" value={newAddonPrice} onChange={(e) => setNewAddonPrice(e.target.value)}
                    placeholder="+precio"
                    className="w-24 border border-gray-200 rounded-2xl px-3 py-2 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200" />
                  <button onClick={addAddon} disabled={!newAddonLabel}
                    className="px-3 py-2 bg-gray-900 text-white rounded-2xl text-sm font-semibold disabled:opacity-40">
                    +
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 rounded-full py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={isPending}
                  className="flex-1 bg-gray-900 text-white rounded-full py-3 text-sm font-semibold disabled:opacity-50 hover:bg-gray-800 transition-colors">
                  {isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products list */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        {products.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm mb-4">Aún no hay productos. Creá el primero.</p>
            <button onClick={openNew} className="bg-gray-900 text-white rounded-full px-5 py-2.5 text-sm font-semibold">+ Nuevo producto</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {products.map((p) => (
              <div key={p.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    {p.category && <span className="text-xs text-gray-400">{p.category}</span>}
                    {p.variants?.length > 0 && (
                      <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                        {p.variants.length} tamaños
                      </span>
                    )}
                    {p.addons?.length > 0 && (
                      <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                        {p.addons.length} extras
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
                  {p.variants?.length > 0
                    ? `desde ${ars(Math.min(...p.variants.map((v) => v.price)))}`
                    : ars(parseFloat(p.price))}
                </p>
                <button onClick={() => handleToggle(p)}
                  className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${p.active ? 'bg-gray-900' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${p.active ? 'left-4' : 'left-0.5'}`} />
                </button>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(p)}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(p.id)}
                    className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
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
        )}
      </div>
    </div>
  )
}
