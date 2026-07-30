import { ensureTokenCerts } from './certs'
import { prisma } from './prisma'
import { seedAdmin } from '../../prisma/seed'

let ready: Promise<void> | null = null

async function bootstrap() {
  ensureTokenCerts()
  await prisma.$connect()
  await seedAdmin(prisma)
}

export async function ensureBootstrap() {
  if (!ready) {
    ready = bootstrap().catch((err) => {
      console.error('[bootstrap] failed', err)
      ready = null
      throw err
    })
  }
  await ready
}
