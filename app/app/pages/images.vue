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
        <button
          type="button"
          class="flex w-full items-center gap-3 px-6 py-5 text-left transition-colors hover:bg-muted/50"
          @click="toggle(repo)"
        >
          <ChevronRight class="size-4 text-muted-foreground transition-transform" :class="{ 'rotate-90': open === repo }" />
          <Package class="size-5" />
          <span class="flex-1 font-mono text-sm font-medium">{{ repo }}</span>
          <Badge variant="outline">repository</Badge>
        </button>

        <CardContent v-if="open === repo" class="border-t px-0 pb-0">
          <div v-if="tagsPending" class="space-y-3 p-6">
            <Skeleton class="h-10 w-full" />
            <Skeleton class="h-10 w-full" />
          </div>
          <Table v-else-if="tags.length">
            <TableHeader>
              <TableRow>
                <TableHead class="pl-6">태그</TableHead>
                <TableHead class="w-24 pr-6 text-right">작업</TableHead>
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
                <TableCell class="pr-6 text-right">
                  <Button variant="ghost" size="icon" class="text-destructive hover:text-destructive" @click="removeTag(repo, tag)">
                    <Trash2 class="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p v-else class="p-6 text-sm text-muted-foreground">태그가 없습니다.</p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ChevronRight,
  CircleAlert,
  Package,
  PackageOpen,
  RefreshCw,
  Tag,
  Trash2,
} from '@lucide/vue'

useHead({ title: '이미지' })

const error = ref('')
const open = ref<string | null>(null)
const tags = ref<string[]>([])
const tagsPending = ref(false)

const {
  data,
  pending,
  refresh,
  error: fetchError,
} = await useFetch<{ repositories: string[] }>('/api/repositories')

const repositories = computed(() => data.value?.repositories || [])

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

async function toggle(repo: string) {
  if (open.value === repo) {
    open.value = null
    return
  }
  open.value = repo
  tagsPending.value = true
  tags.value = []
  try {
    const res = await $fetch<{ tags: string[] }>('/api/repo-tags', { query: { name: repo } })
    tags.value = res.tags
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '태그를 불러오지 못했습니다'
  } finally {
    tagsPending.value = false
  }
}

async function removeTag(name: string, tag: string) {
  if (!confirm(`${name}:${tag} 을(를) 삭제할까요?`)) return
  try {
    await $fetch('/api/repo-tags', { method: 'DELETE', body: { name, tag } })
    tags.value = tags.value.filter((t) => t !== tag)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || '삭제에 실패했습니다'
  }
}
</script>
