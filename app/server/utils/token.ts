import {
  createPrivateKey,
  randomUUID,
  X509Certificate,
} from 'node:crypto'
import { readFileSync } from 'node:fs'
import { SignJWT, importPKCS8 } from 'jose'
import { ensureTokenCerts } from './certs'

export type RegistryAccess = {
  type: string
  name: string
  actions: string[]
}

type TokenMaterial = {
  privateKeyPem: string
  x5c: string
}

let cached: TokenMaterial | null = null

function toPkcs8Pem(privateKeyPem: string): string {
  const key = createPrivateKey(privateKeyPem)
  return key.export({ type: 'pkcs8', format: 'pem' }).toString()
}

function pemToX5C(certPem: string): string {
  return certPem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '')
}

function loadTokenMaterial(): TokenMaterial {
  if (cached) return cached

  const { keyPath, certPath } = ensureTokenCerts()

  const rawPrivateKeyPem = readFileSync(keyPath, 'utf8')
  const privateKeyPem = toPkcs8Pem(rawPrivateKeyPem)
  const certPem = readFileSync(certPath, 'utf8')

  // Validate certificate parses
  void new X509Certificate(certPem)

  cached = {
    privateKeyPem,
    x5c: pemToX5C(certPem),
  }
  return cached
}

export async function signRegistryToken(options: {
  subject: string
  access: RegistryAccess[]
  expiresInSeconds?: number
}): Promise<{ token: string; expiresIn: number; issuedAt: string }> {
  const { privateKeyPem, x5c } = loadTokenMaterial()
  const privateKey = await importPKCS8(privateKeyPem, 'RS256')

  const issuer = process.env.REGISTRY_AUTH_ISSUER || 'registry-aio'
  const audience = process.env.REGISTRY_AUTH_SERVICE || 'registry'
  const expiresIn = options.expiresInSeconds ?? 600
  const now = Math.floor(Date.now() / 1000)
  const issuedAt = new Date(now * 1000).toISOString()

  const token = await new SignJWT({
    access: options.access,
  })
    .setProtectedHeader({
      alg: 'RS256',
      typ: 'JWT',
      // Registry v3 trusts tokens via x5c against rootcertbundle
      x5c: [x5c],
    })
    .setIssuer(issuer)
    .setSubject(options.subject)
    .setAudience(audience)
    .setIssuedAt(now)
    .setNotBefore(now - 10)
    .setExpirationTime(now + expiresIn)
    .setJti(randomUUID())
    .sign(privateKey)

  return { token, expiresIn, issuedAt }
}
