import { z } from 'zod'

const bodySchema = z.object({
  name: z.string().min(1),
  tag: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  await ensureBootstrap()

  const body = bodySchema.parse(await readBody(event))
  await requireDeletePermission(session, body.name)

  const { digest, manifestDeleted } = await deleteTag(body.name, body.tag)
  return { ok: true, name: body.name, tag: body.tag, digest, manifestDeleted }
})
