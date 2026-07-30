export default defineEventHandler(async (event) => {
  clearSessionCookie(event)
  return { ok: true }
})
