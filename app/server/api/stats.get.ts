export default defineEventHandler(async (event) => {
  await requireSession(event)
  await ensureBootstrap()

  const [userCount, repositories] = await Promise.all([
    prisma.user.count(),
    listRepositories().catch(() => [] as string[]),
  ])

  return {
    users: userCount,
    repositories: repositories.length,
    authPublicUrl: process.env.AUTH_PUBLIC_URL || '',
    registryInternalUrl: process.env.REGISTRY_INTERNAL_URL || '',
  }
})
