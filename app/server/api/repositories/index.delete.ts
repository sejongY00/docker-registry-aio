import { z } from 'zod'

const bodySchema = z.object({
  name: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  await ensureBootstrap()

  const { name } = bodySchema.parse(await readBody(event))
  await requireDeletePermission(session, name)

  // Delete manifests through the API first so blobs become unreferenced for GC
  const tags = await listTags(name)
  const digests = new Set<string>()
  for (const tag of tags) {
    const digest = await getManifestDigest(name, tag)
    if (digest) digests.add(digest)
  }
  for (const digest of digests) {
    await deleteManifest(name, digest)
  }

  await removeRepositoryFromStorage(name)
  return { ok: true, name, deletedTags: tags.length }
})
