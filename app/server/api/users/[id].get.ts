export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await ensureBootstrap()

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { acls: true },
  })
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      acls: user.acls,
    },
  }
})
