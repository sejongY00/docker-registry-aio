export default defineEventHandler(async (event) => {
  const user = await readSessionUser(event)
  if (!user) {
    return { user: null }
  }
  return { user }
})
