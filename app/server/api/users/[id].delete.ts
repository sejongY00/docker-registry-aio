export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)
  await ensureBootstrap()

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  }

  if (session.id === id) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot delete yourself' })
  }

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  if (existing.username === (process.env.ADMIN_USERNAME || 'admin')) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot delete bootstrap admin' })
  }

  if (isEveryoneUsername(existing.username)) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot delete system user "everyone"' })
  }

  await prisma.user.delete({ where: { id } })
  return { ok: true }
})
