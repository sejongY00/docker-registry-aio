<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">가이드</h1>
      <p class="mt-1 text-muted-foreground">로컬 기동부터 프록시 연동까지 순서대로 안내합니다.</p>
    </div>

    <Alert>
      <Info class="size-4" />
      <AlertTitle>Token Auth 사용</AlertTitle>
      <AlertDescription>
        사용자 정보는 Prisma DB에서 관리하며, UI 계정과 <code class="font-mono">docker login</code> 계정이 같습니다.
      </AlertDescription>
    </Alert>

    <div class="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-base">
            <span class="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">1</span>
            서비스 기동
          </CardTitle>
          <CardDescription>프로젝트 루트에서 실행합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre class="overflow-x-auto rounded-lg border bg-muted/40 p-4 font-mono text-sm leading-7"><code>cp .env.example .env
docker compose up -d --build</code></pre>
          <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-lg border p-3">
              <div class="text-muted-foreground">UI / Auth</div>
              <code class="mt-1 block break-all font-mono">{{ authPublicHost }}</code>
            </div>
            <div class="rounded-lg border p-3">
              <div class="text-muted-foreground">Registry</div>
              <code class="mt-1 block break-all font-mono">{{ registryHost }}</code>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-base">
            <span class="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">2</span>
            Docker 로그인
          </CardTitle>
          <CardDescription>UI에서 생성한 계정으로 로그인합니다.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <pre class="overflow-x-auto rounded-lg border bg-muted/40 p-4 font-mono text-sm leading-7"><code>docker login {{ registryHost }}
docker pull {{ registryHost }}/demo/alpine:latest</code></pre>
          <p class="text-sm text-muted-foreground">
            Registry가 Nuxt의 <code class="font-mono">/auth/token</code>에서 JWT를 발급받아 요청 권한을 검증합니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-base">
            <span class="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">3</span>
            NPM / Traefik
          </CardTitle>
          <CardDescription>TLS는 기존 리버스 프록시에서 종료합니다.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between gap-3 rounded-lg border p-3">
              <code class="break-all font-mono">{{ registryHost }}</code>
              <Badge variant="outline">:{{ registryPort }}</Badge>
            </div>
            <div class="flex items-center justify-between gap-3 rounded-lg border p-3">
              <code class="break-all font-mono">{{ authPublicHost }}</code>
              <Badge variant="outline">:{{ appPort }}</Badge>
            </div>
          </div>
          <pre class="overflow-x-auto rounded-lg border bg-muted/40 p-4 font-mono text-sm leading-7"><code>AUTH_PUBLIC_URL={{ authPublicUrl }}
REGISTRY_PUBLIC_URL={{ registryHost }}</code></pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-base">
            <span class="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">4</span>
            ACL 패턴
          </CardTitle>
          <CardDescription>사용자별 저장소 접근 범위를 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <Alert>
            <Globe2 class="size-4" />
            <AlertTitle>계정 없는 pull</AlertTitle>
            <AlertDescription>
              사용자 메뉴의 <code class="font-mono">everyone</code>에 저장소 패턴을 추가하면 해당 이미지를 로그인 없이
              pull할 수 있습니다. 익명 push/delete는 허용되지 않습니다.
            </AlertDescription>
          </Alert>
          <Table>
            <TableBody>
              <TableRow v-for="item in aclPatterns" :key="item.pattern">
                <TableCell class="font-mono">{{ item.pattern }}</TableCell>
                <TableCell class="text-muted-foreground">{{ item.description }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Globe2, Info } from '@lucide/vue'

useHead({ title: '가이드' })

const config = useRuntimeConfig()

function stripUrl(value: string) {
  return value.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
}

const authPublicUrl = computed(() => String(config.public.authPublicUrl || 'http://localhost:3080'))
const authPublicHost = computed(() => stripUrl(authPublicUrl.value) || 'localhost:3080')
const registryHost = computed(() => {
  const raw = String(config.public.registryPublicUrl || '').trim()
  if (raw) return stripUrl(raw)
  return `localhost:${config.public.registryPort || '5050'}`
})
const registryPort = computed(() => String(config.public.registryPort || '5050'))
const appPort = computed(() => {
  const host = authPublicHost.value
  const match = host.match(/:(\d+)$/)
  return match?.[1] || '3080'
})

const aclPatterns = [
  { pattern: 'demo/app', description: '정확한 저장소' },
  { pattern: 'demo/*', description: 'demo 아래 한 단계' },
  { pattern: 'team/**', description: 'team 아래 전체' },
  { pattern: '*', description: '모든 저장소' },
]
</script>
