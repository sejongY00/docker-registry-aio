/**
 * Glob-like repository matching:
 * - exact match
 * - `*` matches within a single path segment (no `/`), so `test*`,
 *   `test-*` and `team/app-*` work as prefix/suffix wildcards
 * - `**` as a whole segment matches any remaining path
 */
export function matchRepository(pattern: string, repository: string): boolean {
  if (pattern === '*' || pattern === '**') return true
  if (pattern === repository) return true

  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regexSource = pattern
    .split('/')
    .map((segment) => {
      if (segment === '**') return '(.+)'
      if (segment === '*') return '([^/]+)'
      return escapeRegex(segment).replace(/\\\*/g, '[^/]*')
    })
    .join('/')

  return new RegExp(`^${regexSource}$`).test(repository)
}

export type Action = 'pull' | 'push' | 'delete' | '*'

export function actionsFromAcl(acl: {
  canPull: boolean
  canPush: boolean
  canDelete: boolean
}): Action[] {
  const actions: Action[] = []
  if (acl.canPull) actions.push('pull')
  if (acl.canPush) actions.push('push')
  if (acl.canDelete) actions.push('delete')
  return actions
}

export function intersectActions(requested: string[], allowed: string[]): string[] {
  if (allowed.includes('*')) return requested
  return requested.filter((a) => allowed.includes(a) || (a === '*' && allowed.length > 0))
}
