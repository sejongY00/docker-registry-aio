export default defineEventHandler(async (event) => {
  await ensureBootstrap()

  const query = getQuery(event)
  let scopes = parseScopes(query.scope as string | string[] | undefined)
  let account = typeof query.account === 'string' ? query.account : undefined
  const offline =
    query.offline_token === 'true' ||
    query.offline_token === true ||
    query.access_type === 'offline'

  let username: string | undefined
  let password: string | undefined
  let refreshTokenIn: string | undefined

  const basic = parseBasicAuth(getHeader(event, 'authorization'))
  if (basic) {
    username = basic.username
    password = basic.password
  }

  if (event.method === 'POST') {
    const body = ((await readBody(event).catch(() => null)) || {}) as Record<string, any>
    username = username || body.username || body.account
    password = password || body.password
    refreshTokenIn = typeof body.refresh_token === 'string' ? body.refresh_token : undefined
    account = account || body.account || username
    if (body.scope) {
      scopes = parseScopes(body.scope)
    }
  }

  let user =
    null as null | Awaited<ReturnType<typeof prisma.user.findUnique<{ include: { acls: true } }>>>

  if (refreshTokenIn) {
    const refreshUser = await verifyRefreshToken(refreshTokenIn)
    if (!refreshUser) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid refresh token' })
    }
    user = await prisma.user.findUnique({
      where: { username: refreshUser },
      include: { acls: true },
    })
  } else {
    if (!username || !password) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }
    user = await prisma.user.findUnique({
      where: { username },
      include: { acls: true },
    })
    if (!user || !user.active) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
    }
    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
    }
  }

  if (!user || !user.active) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  if (account && account !== user.username) {
    throw createError({ statusCode: 401, statusMessage: 'Account mismatch' })
  }

  const access = authorizeScopes(user, scopes)
  const { token, expiresIn, issuedAt } = await signRegistryToken({
    subject: user.username,
    access,
  })

  const response: Record<string, unknown> = {
    token,
    access_token: token,
    expires_in: expiresIn,
    issued_at: issuedAt,
  }

  if (offline || refreshTokenIn) {
    response.refresh_token = await createRefreshToken(user.username)
  }

  return response
})
