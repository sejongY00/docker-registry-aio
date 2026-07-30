import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

function resolvePath(envName: string, fallback: string): string {
  return resolve(process.env[envName] || fallback)
}

/** Token Auth용 RSA 키/인증서가 없으면 openssl로 생성합니다. */
export function ensureTokenCerts(): { keyPath: string; certPath: string } {
  const keyPath = resolvePath('TOKEN_KEY_PATH', '../certs/token.key')
  const certPath = resolvePath('TOKEN_CERT_PATH', '../certs/token.crt')

  if (existsSync(keyPath) && existsSync(certPath)) {
    return { keyPath, certPath }
  }

  mkdirSync(dirname(keyPath), { recursive: true })
  mkdirSync(dirname(certPath), { recursive: true })

  const result = spawnSync(
    'openssl',
    [
      'req',
      '-new',
      '-newkey',
      'rsa:4096',
      '-days',
      '3650',
      '-nodes',
      '-x509',
      '-subj',
      '/CN=registry-aio-token',
      '-keyout',
      keyPath,
      '-out',
      certPath,
    ],
    { encoding: 'utf8' },
  )

  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr || result.stdout || 'unknown error'
    throw new Error(
      `Failed to generate token certs at ${keyPath} / ${certPath}. ` +
        `Install openssl (Compose certs 서비스가 자동 생성합니다). (${detail})`,
    )
  }

  console.info(`[certs] generated ${keyPath} and ${certPath}`)
  return { keyPath, certPath }
}
