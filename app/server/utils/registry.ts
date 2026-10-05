const DEFAULT_REGISTRY_URL = 'http://registry:5000'

export function registryBaseUrl(): string {
  return (process.env.REGISTRY_INTERNAL_URL || DEFAULT_REGISTRY_URL).replace(/\/$/, '')
}

async function serviceToken(access: RegistryAccess[]): Promise<string> {
  const { token } = await signRegistryToken({
    subject: 'registry-aio-service',
    access,
    expiresInSeconds: 120,
  })
  return token
}

export async function registryFetch(path: string, init: RequestInit = {}, access?: RegistryAccess[]) {
  const url = `${registryBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers(init.headers)

  if (!headers.has('Accept')) {
    headers.set(
      'Accept',
      'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.oci.image.index.v1+json, application/json',
    )
  }

  const granted =
    access ??
    ([
      { type: 'registry', name: 'catalog', actions: ['*'] },
      { type: 'repository', name: '**', actions: ['*'] },
    ] satisfies RegistryAccess[])

  // Distribution matches exact repository names in token access — for service calls
  // we mint tokens with requested repo scopes per operation instead of '**'.
  const token = await serviceToken(granted)
  headers.set('Authorization', `Bearer ${token}`)

  return fetch(url, { ...init, headers })
}

export async function listRepositories(): Promise<string[]> {
  const res = await registryFetch(
    '/v2/_catalog?n=1000',
    {},
    [{ type: 'registry', name: 'catalog', actions: ['*'] }],
  )
  if (!res.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: `Registry catalog failed: ${res.status}`,
    })
  }
  const data = (await res.json()) as { repositories?: string[] }
  return data.repositories ?? []
}

export async function listTags(name: string): Promise<string[]> {
  const res = await registryFetch(
    `/v2/${encodeURI(name)}/tags/list`,
    {},
    [{ type: 'repository', name, actions: ['pull'] }],
  )
  if (res.status === 404) return []
  if (!res.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: `Registry tags failed: ${res.status}`,
    })
  }
  const data = (await res.json()) as { tags?: string[] | null }
  return data.tags ?? []
}

export async function getManifestDigest(name: string, reference: string): Promise<string | null> {
  const res = await registryFetch(
    `/v2/${encodeURI(name)}/manifests/${encodeURIComponent(reference)}`,
    { method: 'HEAD' },
    [{ type: 'repository', name, actions: ['pull'] }],
  )
  if (!res.ok) return null
  return res.headers.get('docker-content-digest')
}

export async function deleteManifest(name: string, digest: string): Promise<void> {
  const res = await registryFetch(
    `/v2/${encodeURI(name)}/manifests/${encodeURIComponent(digest)}`,
    { method: 'DELETE' },
    [{ type: 'repository', name, actions: ['delete', 'pull'] }],
  )
  if (!res.ok && res.status !== 404) {
    throw createError({
      statusCode: 502,
      statusMessage: `Registry delete failed: ${res.status}`,
    })
  }
}

/**
 * Remove a single tag. Other tags pointing at the same manifest are kept; the
 * manifest itself is deleted only when no tag references it anymore, so blobs
 * become reclaimable by `registry garbage-collect`.
 */
export async function deleteTag(
  name: string,
  tag: string,
): Promise<{ digest: string; manifestDeleted: boolean }> {
  const digest = await getManifestDigest(name, tag)
  if (!digest) {
    throw createError({ statusCode: 404, statusMessage: 'Tag not found' })
  }

  const res = await registryFetch(
    `/v2/${encodeURI(name)}/manifests/${encodeURIComponent(tag)}`,
    { method: 'DELETE' },
    [{ type: 'repository', name, actions: ['delete', 'pull'] }],
  )
  if (!res.ok && res.status !== 404) {
    throw createError({
      statusCode: 502,
      statusMessage: `Registry tag delete failed: ${res.status}`,
    })
  }

  const remaining = await listTags(name)
  const remainingDigests = await Promise.all(remaining.map((t) => getManifestDigest(name, t)))
  if (remainingDigests.includes(digest)) {
    return { digest, manifestDeleted: false }
  }

  await deleteManifest(name, digest)
  return { digest, manifestDeleted: true }
}
