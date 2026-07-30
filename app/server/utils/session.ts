import type { H3Event } from 'h3'
import { SignJWT, jwtVerify } from 'jose'
import type { Role } from '../../generated/prisma/client'

export type SessionUser = {
  id: string
  username: string
  role: Role
}

const COOKIE_NAME = 'registry_aio_session'

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET || 'dev-session-secret-change-me'
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    username: user.username,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function readSessionUser(event: H3Event): Promise<SessionUser | null> {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (
      typeof payload.id !== 'string' ||
      typeof payload.username !== 'string' ||
      (payload.role !== 'ADMIN' && payload.role !== 'USER')
    ) {
      return null
    }
    return {
      id: payload.id,
      username: payload.username,
      role: payload.role,
    }
  } catch {
    return null
  }
}

export function setSessionCookie(event: H3Event, token: string) {
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.AUTH_PUBLIC_URL?.startsWith('https://') ?? false,
  })
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

export async function requireSession(event: H3Event): Promise<SessionUser> {
  const user = await readSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return user
}

export async function requireAdmin(event: H3Event): Promise<SessionUser> {
  const user = await requireSession(event)
  if (user.role !== 'ADMIN') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return user
}
