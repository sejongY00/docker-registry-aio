import type { PrismaClient } from '../../generated/prisma/client'
import { hashPassword } from '../server/utils/password'

type SeedPrisma = Pick<PrismaClient, 'user'>

export async function seedAdmin(prisma: SeedPrisma) {
  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'admin123'

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
