import jwt from 'jsonwebtoken'

interface Payload {
  userId: string
  merchantId: string
}

const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
const EXPIRES_IN = '30d'

export function signToken(payload: Payload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN })
}

export function verifyToken(token: string): Payload {
  return jwt.verify(token, SECRET) as Payload
}
