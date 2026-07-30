export default defineEventHandler(async (event) => {
  await requireSession(event)
  await ensureBootstrap()

  const query = getQuery(event)
  const name = typeof query.name === 'string' ? query.name : ''
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Missing name query parameter' })
  }

  const tags = await listTags(name)
  return { name, tags }
})
