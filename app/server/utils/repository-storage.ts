import { readdir, rm, rmdir, stat } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'

// Distribution repository name grammar (path components separated by '/')
const REPOSITORY_NAME =
  /^[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*(?:\/[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*)*$/

// Per-repository metadata directories; anything else is a nested repository (e.g. foo/bar under foo)
const REPOSITORY_META_DIRS = ['_manifests', '_layers', '_uploads']

function repositoriesRoot(): string {
  const storage = process.env.REGISTRY_STORAGE_PATH || '/var/lib/registry'
  return resolve(storage, 'docker/registry/v2/repositories')
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

/**
 * The registry API cannot remove a repository from the catalog — even with zero tags it
 * keeps showing up. Remove its metadata directories directly from the shared storage
 * volume. Blobs are left for `registry garbage-collect`.
 */
export async function removeRepositoryFromStorage(name: string): Promise<void> {
  if (!REPOSITORY_NAME.test(name)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid repository name' })
  }

  const root = repositoriesRoot()
  if (!(await isDirectory(root))) {
    throw createError({
      statusCode: 501,
      statusMessage: 'Registry storage is not mounted in the app container (REGISTRY_STORAGE_PATH)',
    })
  }

  const dir = resolve(root, name)
  if (!dir.startsWith(root + sep)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid repository name' })
  }
  if (!(await isDirectory(join(dir, '_manifests')))) {
    throw createError({ statusCode: 404, statusMessage: 'Repository not found' })
  }

  for (const meta of REPOSITORY_META_DIRS) {
    await rm(join(dir, meta), { recursive: true, force: true })
  }

  // Drop now-empty directories up to the repositories root (keeps nested repositories)
  let current = dir
  while (current !== root) {
    if ((await readdir(current)).length) break
    await rmdir(current)
    current = resolve(current, '..')
  }
}
