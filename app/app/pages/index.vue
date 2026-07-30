<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">대시보드</h1>
      <p class="mt-1 text-muted-foreground">레지스트리와 사용자 현황을 확인합니다.</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">사용자</CardTitle>
          <Users class="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-3xl font-bold">{{ stats?.users ?? '—' }}</div>
          <p class="mt-1 text-xs text-muted-foreground">등록된 로그인 계정</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">저장소</CardTitle>
          <Package class="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-3xl font-bold">{{ stats?.repositories ?? '—' }}</div>
          <p class="mt-1 text-xs text-muted-foreground">등록된 이미지 저장소</p>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Terminal class="size-5" />
          빠른 시작
        </CardTitle>
        <CardDescription>Docker CLI에서 로그인한 뒤 이미지를 push 하세요.</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="relative rounded-lg border bg-muted/40 p-4">
          <pre class="overflow-x-auto font-mono text-sm leading-7"><code>docker login {{ registryHost }}
docker tag alpine:latest {{ registryHost }}/demo/alpine:latest
docker push {{ registryHost }}/demo/alpine:latest</code></pre>
          <Button variant="ghost" size="icon" class="absolute right-2 top-2" title="명령 복사" @click="copyCommands">
            <Check v-if="copied" class="size-4 text-green-500" />
            <Copy v-else class="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { Check, Copy, Package, Terminal, Users } from '@lucide/vue'

useHead({ title: '대시보드' })

const config = useRuntimeConfig()
const copied = ref(false)
const { data: stats } = await useFetch<{
  users: number
  repositories: number
}>('/api/stats')

const registryHost = computed(() => {
  if (import.meta.client) {
    return `${window.location.hostname}:${config.public.registryPort || '5050'}`
  }
  return `localhost:${config.public.registryPort || '5050'}`
})

async function copyCommands() {
  const host = registryHost.value
  await navigator.clipboard.writeText(
    `docker login ${host}\ndocker tag alpine:latest ${host}/demo/alpine:latest\ndocker push ${host}/demo/alpine:latest`,
  )
  copied.value = true
  window.setTimeout(() => (copied.value = false), 1500)
}
</script>
