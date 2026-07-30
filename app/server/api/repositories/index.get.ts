export default defineEventHandler(async (event) => {
  await requireSession(event)
  await ensureBootstrap()

  try {
    const repositories = await listRepositories()
    return { repositories }
  } catch (err: any) {
    // Registry may be unreachable during local UI-only boot
    if (err?.statusCode) throw err
    throw createError({
      statusCode: 502,
      statusMessage: err?.message || 'Failed to reach registry',
    })
  }
})
