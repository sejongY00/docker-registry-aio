import type { Acl, Role, User } from '../../generated/prisma/client'
import {
  actionsFromAcl,
  intersectActions,
  matchRepository,
  type Action,
} from './acl'
import type { RegistryAccess } from './token'

export type UserWithAcls = User & { acls: Acl[] }

export type ParsedScope = {
  type: string
  name: string
  actions: string[]
}

/** Parse Docker scope strings like `repository:library/nginx:pull,push` */
export function parseScopes(scopeParam: string | string[] | undefined): ParsedScope[] {
  if (!scopeParam) return []
  const raw = Array.isArray(scopeParam) ? scopeParam : [scopeParam]
  const scopes: ParsedScope[] = []

  for (const item of raw) {
    for (const part of item.split(' ')) {
      if (!part) continue
      const first = part.indexOf(':')
      const last = part.lastIndexOf(':')
      if (first < 0 || last <= first) continue
      const type = part.slice(0, first)
      const name = part.slice(first + 1, last)
      const actions = part
        .slice(last + 1)
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean)
      scopes.push({ type, name, actions })
    }
  }
  return scopes
}

export function allowedActionsForRepo(user: UserWithAcls, repository: string): Action[] {
  if (user.role === 'ADMIN') {
    return ['pull', 'push', 'delete', '*']
  }

  const allowed = new Set<Action>()
  for (const acl of user.acls) {
    if (!matchRepository(acl.repository, repository)) continue
    for (const action of actionsFromAcl(acl)) {
      allowed.add(action)
    }
  }
  return [...allowed]
}

export function authorizeScopes(user: UserWithAcls, scopes: ParsedScope[]): RegistryAccess[] {
  const access: RegistryAccess[] = []

  for (const scope of scopes) {
    if (user.role === 'ADMIN') {
      access.push({
        type: scope.type,
        name: scope.name,
        actions: scope.actions,
      })
      continue
    }

    if (scope.type !== 'repository') {
      continue
    }

    const allowed = allowedActionsForRepo(user, scope.name)
    const granted = intersectActions(scope.actions, allowed)
    if (granted.length > 0) {
      access.push({
        type: scope.type,
        name: scope.name,
        actions: granted,
      })
    }
  }

  return access
}

export function parseBasicAuth(header: string | undefined): { username: string; password: string } | null {
  if (!header?.startsWith('Basic ')) return null
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8')
    const idx = decoded.indexOf(':')
    if (idx < 0) return null
    return {
      username: decoded.slice(0, idx),
      password: decoded.slice(idx + 1),
    }
  } catch {
    return null
  }
}

export function assertRole(role: string): Role {
  if (role === 'ADMIN' || role === 'USER') return role
  throw createError({ statusCode: 400, statusMessage: 'Invalid role' })
}
