import { z } from 'zod'

const aclSchema = z.object({
  repository: z.string().min(1),
  canPull: z.boolean().default(true),
  canPush: z.boolean().default(false),
  canDelete: z.boolean().default(false),
})

const bodySchema = z.object({
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'USER']).optional(),
  active: z.boolean().optional(),
  acls: z.array(aclSchema).optional(),
})

export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)
  await ensureBootstrap()

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  }

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const body = bodySchema.parse(await readBody(event))

  if (existing.username === (process.env.ADMIN_USERNAME || 'admin') && body.active === false) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot deactivate bootstrap admin' })
  }

  if (session.id === id && body.role && body.role !== 'ADMIN') {
    throw createError({ statusCode: 400, statusMessage: 'Cannot demote yourself' })
  }

  const user = await prisma.$transaction(async (tx) => {
    if (body.acls) {
      await tx.acl.deleteMany({ where: { userId: id } })
      await tx.acl.createMany({
        data: body.acls.map((acl) => ({
          userId: id,
          repository: acl.repository,
          canPull: acl.canPull,
          canPush: acl.canPush,
          canDelete: acl.canDelete,
        })),
      })
    }

    return tx.user.update({
      where: { id },
      data: {
        ...(body.role ? { role: body.role } : {}),
        ...(typeof body.active === 'boolean' ? { active: body.active } : {}),
        ...(body.password ? { passwordHash: await hashPassword(body.password) } : {}),
      },
      include: { acls: true },
    })
  })

  return {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      acls: user.acls,
    },
  }
})
