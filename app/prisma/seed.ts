import type { PrismaClient } from '../../generated/prisma/client'
import { randomUUID } from 'node:crypto'
import { hashPassword } from '../server/utils/password'
import { EVERYONE_USERNAME } from '../server/utils/system-users'

type SeedPrisma = Pick<PrismaClient, 'user'>

export async function seedAdmin(prisma: SeedPrisma) {
  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'admin123'

  if (username.toLowerCase() === EVERYONE_USERNAME) {
    throw new Error(`ADMIN_USERNAME cannot use reserved username "${EVERYONE_USERNAME}"`)
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    return existing
  }

  return prisma.user.create({
    data: {
      username,
      passwordHash: await hashPassword(password),
      role: 'ADMIN',
      active: true,
    },
  })
}

export async function seedEveryone(prisma: SeedPrisma) {
  const existing = await prisma.user.findUnique({
    where: { username: EVERYONE_USERNAME },
  })

  if (existing) {
    if (existing.role !== 'USER') {
      return prisma.user.update({
        where: { id: existing.id },
        data: { role: 'USER' },
      })
    }
    return existing
  }

  return prisma.user.create({
    data: {
      username: EVERYONE_USERNAME,
      passwordHash: await hashPassword(randomUUID()),
      role: 'USER',
      active: true,
    },
  })
}
