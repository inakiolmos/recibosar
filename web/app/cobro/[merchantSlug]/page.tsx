'use client'

import { useEffect, useState, useTransition, use } from 'react'

interface Variant { label: string; price: number }
interface Addon { label: string; extra_price: number }

interface Product {
  id: string
  name: string
  price: string
  category: string | null
  variants: Variant[]
  addons: Addon[]
}

interface CartItem {
  key: string
  product_id: string
  name: string
  price: number
  qty: number
  variant?: string
  addons: string[]
  addons_extra: number
}

interface Merchant {
  id: string
  name: string
  brand_color: string
  logo_url: string | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function ars(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

type PaymentMethod = 'cash' | 'card' | 'mp'

export default function CobroPage({ params }: { params: Promise<{ merchantSlug: string }> }) {
  const { merchantSlug } = use(params)

  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [apiError, setApiError] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Variant picker state
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([])

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    fetch(`${API_URL}/api/pos/${merchantSlug}/products`, { signal: controller.signal })
      .then((r) => { if (!r.ok) { setNotFound(true); return null } return r.json() })
      .then((d) => {
        if (!d) return
        setMerchant(d.merchant)
        setProducts(d.products)
        const cats = [...new Set<string>(d.products.map((p: Product) => p.category ?? 'General'))]
        setActiveCategory(cats[0] ?? null)
      })
      .catch(() => setApiError(true))
      .finally(() => { clearTimeout(timeout); setLoading(false) })
  }, [merchantSlug])

  const categories = [...new Set(products.map((p) => p.category ?? 'General'))]
  const filtered = activeCategory ? products.filter((p) => (p.category ?? 'General') === activeCategory) : products

  function tapProduct(p: Product) {
    const hasVariants = p.variants?.length > 0
    const hasAddons = p.addons?.length > 0
    if (hasVariants || hasAddons) {
      setPickerProduct(p)
      setSelectedVariant(hasVariants ? p.variants[0] : null)
      setSelectedAddons([])
    } else {
      addDirectToCart(p, null, [])
    }
  }

  function addDirectToCart(p: Product, variant: Variant | null, addons: Addon[]) {
    const basePrice = variant ? variant.price : parseFloat(p.price)
    const addonsExtra = addons.reduce((s, a) => s + a.extra_price, 0)
    const variantLabel = variant?.label
    const addonLabels = addons.map((a) => a.label)
    const key = `${p.id}|${variantLabel ?? ''}|${addonLabels.join(',')}`

    setCart((prev) => {
      const existing = prev.find((i) => i.key === key)
      if (existing) return prev.map((i) => i.key === key ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, {
        key, product_id: p.id,
        name: variantLabel ? `${p.name} (${variantLabel})` : p.name,
        price: basePrice + addonsExtra,
        qty: 1,
        variant: variantLabel,
        addons: addonLabels,
        addons_extra: addonsExtra,
      }]
    })
  }

  function confirmPicker() {
    if (!pickerProduct) return
    addDirectToCart(pickerProduct, selectedVariant, selectedAddons)
    setPickerProduct(null)
  }

  function toggleAddon(a: Addon) {
    setSelectedAddons((prev) =>
      prev.find((x) => x.label === a.label) ? prev.filter((x) => x.label !== a.label) : [...prev, a]
    )
  }

  function removeFromCart(key: string) {
    setCart((prev) => {
      const item = prev.find((i) => i.key === key)
      if (item && item.qty > 1) return prev.map((i) => i.key === key ? { ...i, qty: i.qty - 1 } : i)
      return prev.filter((i) => i.key !== key)
    })
  }

  function addToCartByKey(key: string) {
    setCart((prev) => prev.map((i) => i.key === key ? { ...i, qty: i.qty + 1 } : i))
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  const itemCount = cart.reduce((sum, i) => sum + i.qty, 0)

  function handlePay(method: PaymentMethod) {
    if (method === 'mp') return
    startTransition(async () => {
      const items = cart.map((i) => ({
        product_id: i.product_id,
        name: i.name,
        price: i.price,
        qty: i.qty,
      }))
      const res = await fetch(`${API_URL}/api/pos/${merchantSlug}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, payment_method: method }),
      })
      if (res.ok) {
        setCart([])
        setShowPayment(false)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    })
  }

  const color = merchant?.brand_color ?? '#111827'

  if (apiError) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="text-center">
        <p className="text-3xl mb-3">😴</p>
        <p className="text-gray-700 font-semibold">El servidor está despertando...</p>
        <p className="text-gray-400 text-sm mt-1 mb-4">Puede tardar hasta 30 segundos la primera vez.</p>
        <button onClick={() => window.location.reload()}
          className="bg-gray-900 text-white rounded-full px-5 py-2.5 text-sm font-semibold">
          Reintentar
        </button>
      </div>
    </div>
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-400 text-sm">Cargando...</div>
    </div>
  )

  if (notFound || !merchant) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="text-center">
        <p className="text-2xl mb-2">🤷</p>
        <p className="text-gray-700 font-semibold">Comercio no encontrado</p>
        <p className="text-gray-400 text-sm mt-1">Verificá el link o el QR.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" style={{ maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-4" style={{ backgroundColor: color }}>
        <div className="flex items-center gap-3">
          {merchant.logo_url
            ? <img src={merchant.logo_url} alt={merchant.name} className="w-10 h-10 rounded-full object-cover" />
            : <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">{merchant.name[0]}</div>
          }
          <div>
            <p className="text-white font-bold text-base leading-tight">{merchant.name}</p>
            <p className="text-white/60 text-xs">Seleccioná los productos</p>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      {categories.length > 1 && (
        <div className="flex gap-2 px-4 pt-4 pb-1 overflow-x-auto">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${activeCategory === cat ? 'text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
              style={activeCategory === cat ? { backgroundColor: color } : {}}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Products grid */}
      <div className="flex-1 px-4 pt-3 pb-32 grid grid-cols-2 gap-3 content-start">
        {filtered.map((p) => {
          const cartQty = cart.filter((i) => i.product_id === p.id).reduce((s, i) => s + i.qty, 0)
          const minPrice = p.variants?.length > 0 ? Math.min(...p.variants.map((v) => v.price)) : parseFloat(p.price)
          return (
            <button key={p.id} onClick={() => tapProduct(p)}
              className="relative bg-white rounded-2xl p-4 shadow-sm text-left transition-all active:scale-95">
              {cartQty > 0 && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
                  style={{ backgroundColor: color }}>
                  {cartQty}
                </span>
              )}
              <p className="text-sm font-semibold text-gray-900 leading-snug pr-5">{p.name}</p>
              {p.variants?.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">{p.variants.length} tamaños</p>
              )}
              <p className="text-sm font-bold mt-1" style={{ color }}>
                {p.variants?.length > 0 ? `desde ${ars(minPrice)}` : ars(minPrice)}
              </p>
            </button>
          )
        })}
      </div>

      {/* Success toast */}
      {success && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-lg z-50">
          ✓ Venta registrada
        </div>
      )}

      {/* Variant / addon picker */}
      {pickerProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full p-6 space-y-4" style={{ maxWidth: 480 }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{pickerProduct.name}</h2>
              <button onClick={() => setPickerProduct(null)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>

            {pickerProduct.variants?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tamaño</p>
                <div className="grid grid-cols-3 gap-2">
                  {pickerProduct.variants.map((v) => (
                    <button key={v.label} onClick={() => setSelectedVariant(v)}
                      className={`rounded-2xl py-3 px-2 border-2 transition-colors text-center ${selectedVariant?.label === v.label ? 'border-current' : 'border-gray-200'}`}
                      style={selectedVariant?.label === v.label ? { borderColor: color, backgroundColor: color + '10' } : {}}>
                      <p className="text-sm font-semibold text-gray-900">{v.label}</p>
                      <p className="text-xs font-bold mt-0.5" style={{ color }}>{ars(v.price)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {pickerProduct.addons?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Extras</p>
                <div className="space-y-2">
                  {pickerProduct.addons.map((a) => {
                    const checked = !!selectedAddons.find((x) => x.label === a.label)
                    return (
                      <button key={a.label} onClick={() => toggleAddon(a)}
                        className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 border-2 transition-colors ${checked ? 'border-current' : 'border-gray-200'}`}
                        style={checked ? { borderColor: color, backgroundColor: color + '10' } : {}}>
                        <span className="text-sm font-medium text-gray-900">{a.label}</span>
                        <span className="text-sm font-bold" style={{ color }}>+{ars(a.extra_price)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Subtotal */}
            <div className="flex justify-between items-center pt-1 border-t border-gray-100">
              <span className="text-sm text-gray-500">Subtotal</span>
              <span className="font-bold" style={{ color }}>
                {ars((selectedVariant?.price ?? parseFloat(pickerProduct.price)) + selectedAddons.reduce((s, a) => s + a.extra_price, 0))}
              </span>
            </div>

            <button onClick={confirmPicker}
              className="w-full text-white rounded-full py-4 font-bold text-sm"
              style={{ backgroundColor: color }}>
              Agregar al pedido
            </button>
          </div>
        </div>
      )}

      {/* Cart bar */}
      {cart.length > 0 && !showPayment && !pickerProduct && (
        <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-6 px-4">
          <div style={{ maxWidth: 480, width: '100%' }}>
            <button onClick={() => setShowPayment(true)}
              className="w-full text-white rounded-full py-4 flex items-center justify-between px-6 shadow-lg"
              style={{ backgroundColor: color }}>
              <span className="bg-white/20 rounded-full px-2.5 py-0.5 text-sm font-bold">{itemCount}</span>
              <span className="font-bold">Ver pedido</span>
              <span className="font-bold">{ars(total)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Payment sheet */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full p-6 space-y-4" style={{ maxWidth: 480 }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Pedido</h2>
              <button onClick={() => setShowPayment(false)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <button onClick={() => removeFromCart(item.key)}
                      className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm font-bold flex-shrink-0">−</button>
                    <span className="text-sm text-gray-700 truncate">{item.qty}× {item.name}</span>
                    <button onClick={() => addToCartByKey(item.key)}
                      className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm font-bold flex-shrink-0">+</button>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{ars(item.price * item.qty)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-xl font-bold" style={{ color }}>{ars(total)}</span>
            </div>

            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Forma de pago</p>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => handlePay('cash')} disabled={isPending}
                className="flex flex-col items-center gap-1.5 bg-gray-50 rounded-2xl py-4 hover:bg-gray-100 transition-colors">
                <span className="text-2xl">💵</span>
                <span className="text-xs font-semibold text-gray-700">Efectivo</span>
              </button>
              <button onClick={() => handlePay('card')} disabled={isPending}
                className="flex flex-col items-center gap-1.5 bg-gray-50 rounded-2xl py-4 hover:bg-gray-100 transition-colors">
                <span className="text-2xl">💳</span>
                <span className="text-xs font-semibold text-gray-700">Tarjeta</span>
              </button>
              <button disabled className="flex flex-col items-center gap-1.5 bg-gray-50 rounded-2xl py-4 opacity-40 cursor-not-allowed relative">
                <span className="text-2xl">🔵</span>
                <span className="text-xs font-semibold text-gray-700">Mercado Pago</span>
                <span className="absolute -top-1 -right-1 bg-gray-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Próximamente</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
