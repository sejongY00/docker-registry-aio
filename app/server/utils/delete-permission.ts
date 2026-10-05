import type { SessionUser } from './session'

export async function requireDeletePermission(session: SessionUser, repository: string) {
  if (session.role === 'ADMIN') return

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: { acls: true },
  })
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const allowed = allowedActionsForRepo(user, repository)
  if (!allowed.includes('delete') && !allowed.includes('*')) {
    throw createError({ statusCode: 403, statusMessage: 'Delete not allowed' })
  }
}
