import { z } from 'zod'

const bodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  await ensureBootstrap()
  const body = bodySchema.parse(await readBody(event))

  const user = await prisma.user.findUnique({ where: { username: body.username } })
  if (!user || !user.active) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  const ok = await verifyPassword(body.password, user.passwordHash)
  if (!ok) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  const token = await createSessionToken({
    id: user.id,
    username: user.username,
    role: user.role,
  })
  setSessionCookie(event, token)

  return {
    id: user.id,
    username: user.username,
    role: user.role,
  }
})
