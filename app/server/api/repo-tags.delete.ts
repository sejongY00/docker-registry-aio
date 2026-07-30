import { z } from 'zod'

const bodySchema = z.object({
  name: z.string().min(1),
  tag: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  await ensureBootstrap()

  const body = bodySchema.parse(await readBody(event))

  if (session.role !== 'ADMIN') {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: { acls: true },
    })
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }
    const allowed = allowedActionsForRepo(user, body.name)
    if (!allowed.includes('delete') && !allowed.includes('*')) {
      throw createError({ statusCode: 403, statusMessage: 'Delete not allowed' })
    }
  }

  const digest = await getManifestDigest(body.name, body.tag)
  if (!digest) {
    throw createError({ statusCode: 404, statusMessage: 'Tag not found' })
  }

  await deleteManifest(body.name, digest)
  return { ok: true, name: body.name, tag: body.tag, digest }
})
