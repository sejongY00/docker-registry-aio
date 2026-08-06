import { z } from 'zod'

const aclSchema = z.object({
  repository: z.string().min(1),
  canPull: z.boolean().default(true),
  canPush: z.boolean().default(false),
  canDelete: z.boolean().default(false),
})

const bodySchema = z.object({
  username: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username may contain letters, numbers, . _ -'),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'USER']).default('USER'),
  active: z.boolean().default(true),
  acls: z.array(aclSchema).default([]),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await ensureBootstrap()

  const body = bodySchema.parse(await readBody(event))
  if (isEveryoneUsername(body.username)) {
    throw createError({ statusCode: 409, statusMessage: 'Username "everyone" is reserved' })
  }

  const existing = await prisma.user.findUnique({ where: { username: body.username } })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Username already exists' })
  }

  const user = await prisma.user.create({
    data: {
      username: body.username,
      passwordHash: await hashPassword(body.password),
      role: body.role,
      active: body.active,
      acls: {
        create: body.acls.map((acl) => ({
          repository: acl.repository,
          canPull: acl.canPull,
          canPush: acl.canPush,
          canDelete: acl.canDelete,
        })),
      },
    },
    include: { acls: true },
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
