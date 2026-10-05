<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">이미지</h1>
        <p class="mt-1 text-muted-foreground">레지스트리 저장소와 태그를 관리합니다.</p>
      </div>
      <Button variant="outline" :disabled="pending" class="gap-2" @click="refreshAll">
        <RefreshCw class="size-4" :class="{ 'animate-spin': pending }" />
        새로고침
      </Button>
    </div>

    <Alert v-if="error" variant="destructive">
      <CircleAlert class="size-4" />
      <AlertTitle>요청 실패</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <Card v-if="pending">
      <CardContent class="space-y-3 pt-6">
        <Skeleton class="h-6 w-1/3" />
        <Skeleton class="h-16 w-full" />
      </CardContent>
    </Card>

    <Card v-else-if="!repositories.length" class="border-dashed">
      <CardContent class="flex flex-col items-center justify-center py-16 text-center">
        <PackageOpen class="mb-4 size-10 text-muted-foreground" />
        <p class="font-medium">저장소가 없습니다</p>
        <p class="mt-1 text-sm text-muted-foreground">이미지를 push 하면 여기에 표시됩니다.</p>
      </CardContent>
    </Card>

    <div v-else class="space-y-3">
      <Card v-for="repo in repositories" :key="repo" class="overflow-hidden">
        <div class="flex items-center transition-colors hover:bg-muted/50">
          <button
            type="button"
            class="flex flex-1 items-center gap-3 py-5 pl-6 text-left"
            @click="toggle(repo)"
          >
            <ChevronRight class="size-4 text-muted-foreground transition-transform" :class="{ 'rotate-90': open === repo }" />
            <Package class="size-5" />
            <span class="flex-1 font-mono text-sm font-medium">{{ repo }}</span>
            <Badge variant="outline">repository</Badge>
          </button>
          <Button
            variant="ghost"
            size="icon"
            class="mx-4 text-destructive hover:text-destructive"
            title="저장소 삭제"
            :disabled="deleting === repo"
            @click.stop="removeRepository(repo)"
          >
            <LoaderCircle v-if="deleting === repo" class="size-4 animate-spin" />
            <Trash2 v-else class="size-4" />
          </Button>
        </div>

        <CardContent v-if="open === repo" class="border-t px-0 pb-0">
          <div v-if="tagsPending" class="space-y-3 p-6">
            <Skeleton class="h-10 w-full" />
            <Skeleton class="h-10 w-full" />
          </div>
          <Table v-else-if="tags.length">
            <TableHeader>
              <TableRow>
                <TableHead class="pl-6">태그</TableHead>
                <TableHead class="hidden md:table-cell">Pull 명령</TableHead>
                <TableHead class="w-28 pr-6 text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="tag in tags" :key="tag">
                <TableCell class="pl-6 font-mono">
                  <div class="flex items-center gap-2">
                    <Tag class="size-4 text-muted-foreground" />
                    {{ tag }}
                  </div>
                </TableCell>
                <TableCell class="hidden md:table-cell">
                  <code class="rounded bg-muted px-2 py-1 font-mono text-xs">{{ pullCommand(repo, tag) }}</code>
                </TableCell>
                <TableCell class="pr-6 text-right">
                  <div class="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      :title="copiedKey === copyKey(repo, tag) ? '복사됨' : 'Pull 명령 복사'"
                      @click.stop="copyPull(repo, tag)"
                    >
                      <Check v-if="copiedKey === copyKey(repo, tag)" class="size-4 text-green-500" />
                      <Copy v-else class="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="text-destructive hover:text-destructive"
                      title="태그 삭제"
                      @click.stop="removeTag(repo, tag)"
                    >
                      <Trash2 class="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div v-else class="flex flex-wrap items-center justify-between gap-3 p-6">
            <p class="text-sm text-muted-foreground">
              태그가 없는 저장소입니다. 레지스트리는 빈 저장소를 자동으로 지우지 않으므로 직접 삭제하세요.
            </p>
            <Button
              variant="destructive"
              size="sm"
              class="gap-2"
              :disabled="deleting === repo"
              @click="removeRepository(repo)"
            >
              <LoaderCircle v-if="deleting === repo" class="size-4 animate-spin" />
              <Trash2 v-else class="size-4" />
              저장소 삭제
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Check,
  ChevronRight,
  CircleAlert,
  Copy,
  LoaderCircle,
  Package,
  PackageOpen,
  RefreshCw,
  Tag,
  Trash2,
} from '@lucide/vue'

useHead({ title: '이미지' })

const config = useRuntimeConfig()
const error = ref('')
const open = ref<string | null>(null)
const tags = ref<string[]>([])
const tagsPending = ref(false)
const copiedKey = ref('')
const deleting = ref<string | null>(null)

const {
  data,
  pending,
  refresh,
  error: fetchError,
} = await useFetch<{ repositories: string[] }>('/api/repositories')

const repositories = computed(() => data.value?.repositories || [])

const registryHost = computed(() => {
  const raw = String(config.public.registryPublicUrl || '').trim()
  if (raw) {
    return raw.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  }
  return `localhost:${config.public.registryPort || '5050'}`
})

function pullCommand(repo: string, tag: string) {
  return `docker pull ${registryHost.value}/${repo}:${tag}`
}

function copyKey(repo: string, tag: string) {
  return `${repo}:${tag}`
}

async function copyPull(repo: string, tag: string) {
  await navigator.clipboard.writeText(pullCommand(repo, tag))
  copiedKey.value = copyKey(repo, tag)
  window.setTimeout(() => {
    if (copiedKey.value === copyKey(repo, tag)) copiedKey.value = ''
  }, 1500)
}

watchEffect(() => {
  if (fetchError.value) {
    error.value = fetchError.value.statusMessage || '레지스트리를 불러오지 못했습니다'
  }
})

async function refreshAll() {
  error.value = ''
  open.value = null
  tags.value = []
  await refresh()
}

async function loadTags(repo: string) {
  tagsPending.value = true
  tags.value = []
  try {
    const res = await $fetch<{ tags: string[] }>('/api/repo-tags', { query: { name: repo } })
    if (open.value === repo) tags.value = res.tags
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '태그를 불러오지 못했습니다'
  } finally {
    tagsPending.value = false
  }
}

async function toggle(repo: string) {
  if (open.value === repo) {
    open.value = null
    return
  }
  open.value = repo
  await loadTags(repo)
}

async function removeTag(name: string, tag: string) {
  if (!confirm(`${name}:${tag} 태그를 삭제할까요?\n같은 이미지를 가리키는 다른 태그는 유지됩니다.`)) return
  error.value = ''
  try {
    await $fetch('/api/repo-tags', { method: 'DELETE', body: { name, tag } })
    await loadTags(name)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '삭제에 실패했습니다'
  }
}

async function removeRepository(name: string) {
  if (!confirm(`저장소 ${name} 을(를) 모든 태그와 함께 삭제할까요?\n되돌릴 수 없습니다.`)) return
  error.value = ''
  deleting.value = name
  try {
    await $fetch('/api/repositories', { method: 'DELETE', body: { name } })
    if (open.value === name) {
      open.value = null
      tags.value = []
    }
    await refresh()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '저장소 삭제에 실패했습니다'
  } finally {
    deleting.value = null
  }
}
</script>
