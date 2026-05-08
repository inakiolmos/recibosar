'use server'

import { revalidatePath } from 'next/cache'
import { getToken } from '@/lib/auth'
import { redirect } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export interface Variant { label: string; price: number }
export interface Addon { label: string; extra_price: number }
export interface Product {
  id: string
  name: string
  price: string
  category: string | null
  active: boolean
  sort_order: number
  variants: Variant[]
  addons: Addon[]
}

async function authHeader() {
  const token = await getToken()
  if (!token) redirect('/login')
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export async function createProduct(data: {
  name: string; price: number; category?: string | null; variants: Variant[]; addons: Addon[]
}): Promise<{ ok: boolean; error?: string }> {
  const headers = await authHeader()
  const res = await fetch(`${API_URL}/api/dashboard/products`, {
    method: 'POST', headers, body: JSON.stringify(data), cache: 'no-store',
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    return { ok: false, error: d.error ?? 'Error al guardar' }
  }
  revalidatePath('/dashboard/products')
  return { ok: true }
}

export async function updateProduct(id: string, data: Partial<{
  name: string; price: number; category: string | null; active: boolean;
  variants: Variant[]; addons: Addon[]
}>): Promise<{ ok: boolean; error?: string }> {
  const headers = await authHeader()
  const res = await fetch(`${API_URL}/api/dashboard/products/${id}`, {
    method: 'PUT', headers, body: JSON.stringify(data), cache: 'no-store',
  })
  if (!res.ok) return { ok: false, error: 'Error al actualizar' }
  revalidatePath('/dashboard/products')
  return { ok: true }
}

export async function deleteProduct(id: string): Promise<{ ok: boolean }> {
  const headers = await authHeader()
  await fetch(`${API_URL}/api/dashboard/products/${id}`, {
    method: 'DELETE', headers, cache: 'no-store',
  })
  revalidatePath('/dashboard/products')
  return { ok: true }
}
