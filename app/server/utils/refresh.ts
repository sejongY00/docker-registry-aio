import { SignJWT, jwtVerify } from 'jose'
import { randomUUID } from 'node:crypto'

function refreshSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET || 'dev-session-secret-change-me'
  return new TextEncoder().encode(`refresh:${secret}`)
}

export async function createRefreshToken(username: string): Promise<string> {
  return new SignJWT({ typ: 'refresh', username })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(refreshSecret())
}

export async function verifyRefreshToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, refreshSecret())
    if (payload.typ !== 'refresh' || typeof payload.username !== 'string') return null
    return payload.username
  } catch {
    return null
  }
}
