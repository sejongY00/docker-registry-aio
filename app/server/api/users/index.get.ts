export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await ensureBootstrap()

  const users = await prisma.user.findMany({
    orderBy: { username: 'asc' },
    include: { acls: true },
  })

  return {
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      acls: u.acls,
    })),
  }
})
