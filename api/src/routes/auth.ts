import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import sql from '../lib/db'
import { signToken, verifyToken } from '../lib/jwt'

const RegisterSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/register
  app.post('/auth/register', async (req, reply) => {
    const body = RegisterSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({
        error: body.error.issues[0]?.message ?? 'Datos inválidos',
      })
    }
    const { name, slug, email, password } = body.data

    const [existingSlug] = await sql`SELECT id FROM merchants WHERE slug = ${slug}`
    if (existingSlug) {
      return reply.status(409).send({ error: 'El slug ya está en uso' })
    }

    const [existingEmail] = await sql`SELECT id FROM users WHERE email = ${email}`
    if (existingEmail) {
      return reply.status(409).send({ error: 'El email ya está registrado' })
    }

    const hashed = await bcrypt.hash(password, 10)

    const [merchant] = await sql<{ id: string }[]>`
      INSERT INTO merchants (name, slug) VALUES (${name}, ${slug}) RETURNING id
    `
    const [user] = await sql<{ id: string }[]>`
      INSERT INTO users (merchant_id, email, hashed_password)
      VALUES (${merchant.id}, ${email}, ${hashed})
      RETURNING id
    `

    const token = signToken({ userId: user.id, merchantId: merchant.id })
    return reply.status(201).send({ token, merchantId: merchant.id, userId: user.id })
  })

  // POST /api/auth/login
  app.post('/auth/login', async (req, reply) => {
    const body = LoginSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Datos inválidos' })
    }
    const { email, password } = body.data

    const [user] = await sql<
      { id: string; merchant_id: string; hashed_password: string }[]
    >`
      SELECT id, merchant_id, hashed_password FROM users WHERE email = ${email}
    `
    if (!user) {
      return reply.status(401).send({ error: 'Email o contraseña incorrectos' })
    }

    const valid = await bcrypt.compare(password, user.hashed_password)
    if (!valid) {
      return reply.status(401).send({ error: 'Email o contraseña incorrectos' })
    }

    const token = signToken({ userId: user.id, merchantId: user.merchant_id })
    return { token, merchantId: user.merchant_id, userId: user.id }
  })

  // GET /api/auth/me
  app.get('/auth/me', async (req, reply) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'No autorizado' })
    }

    let payload: { userId: string; merchantId: string }
    try {
      payload = verifyToken(authHeader.slice(7))
    } catch {
      return reply.status(401).send({ error: 'Token inválido' })
    }

    const [row] = await sql<
      {
        id: string
        email: string
        merchant_id: string
        name: string
        slug: string
        logo_url: string | null
        brand_color: string
      }[]
    >`
      SELECT u.id, u.email, u.merchant_id,
             m.name, m.slug, m.logo_url, m.brand_color
      FROM users u
      JOIN merchants m ON m.id = u.merchant_id
      WHERE u.id = ${payload.userId}
    `
    if (!row) {
      return reply.status(401).send({ error: 'Sesión inválida' })
    }

    return row
  })
}
