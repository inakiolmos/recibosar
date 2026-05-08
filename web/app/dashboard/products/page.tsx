import { redirect } from 'next/navigation'
import { getToken } from '@/lib/auth'
import { ProductsManager } from './ProductsManager'
import type { Product } from './actions'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default async function ProductsPage() {
  const token = await getToken()
  if (!token) redirect('/login')

  const res = await fetch(`${API_URL}/api/dashboard/products`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) redirect('/login')

  const { products } = (await res.json()) as { products: Product[] }

  return <ProductsManager initialProducts={products} />
}
