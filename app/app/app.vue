<template>
  <div class="min-h-screen bg-background">
    <header
      v-if="showNav"
      class="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div class="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold tracking-tight">
          <span class="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes class="size-4" />
          </span>
          <span class="hidden sm:inline">Registry AIO</span>
        </NuxtLink>

        <nav class="flex flex-1 items-center gap-1">
          <Button
            v-for="item in navigation"
            :key="item.to"
            as-child
            variant="ghost"
            size="sm"
            :class="route.path === item.to ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'"
          >
            <NuxtLink :to="item.to" class="gap-2">
              <component :is="item.icon" class="size-4" />
              <span class="hidden md:inline">{{ item.label }}</span>
            </NuxtLink>
          </Button>
        </nav>

        <div class="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="테마 전환" @click="toggleTheme">
            <Sun v-if="isDark" class="size-4" />
            <Moon v-else class="size-4" />
          </Button>
          <Badge variant="secondary" class="hidden sm:inline-flex">{{ username }}</Badge>
          <Button variant="outline" size="sm" class="gap-2" @click="logout">
            <LogOut class="size-4" />
            <span class="hidden sm:inline">로그아웃</span>
          </Button>
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <NuxtPage />
    </main>
  </div>
</template>

<script setup lang="ts">
import { Boxes, CircleHelp, Gauge, Images, LogOut, Moon, Sun, Users } from '@lucide/vue'

const route = useRoute()
const { data, refresh } = await useFetch<{ user: { username: string; role: string } | null }>(
  '/api/auth/me',
  { key: 'auth-me' },
)

const showNav = computed(() => route.path !== '/login' && !!data.value?.user)
const username = computed(() => data.value?.user?.username || '')
const isAdmin = computed(() => data.value?.user?.role === 'ADMIN')
const isDark = ref(true)
const navigation = computed(() => [
  { to: '/', label: '대시보드', icon: Gauge },
  { to: '/images', label: '이미지', icon: Images },
  ...(isAdmin.value ? [{ to: '/users', label: '사용자', icon: Users }] : []),
  { to: '/guide', label: '가이드', icon: CircleHelp },
])

useHead({
  titleTemplate: (title) => (title ? `${title} · Registry AIO` : 'Registry AIO'),
})

onMounted(() => {
  const saved = localStorage.getItem('registry-aio-theme')
  isDark.value = saved ? saved === 'dark' : true
  applyTheme()
})

function applyTheme() {
  document.documentElement.classList.toggle('dark', isDark.value)
}

function toggleTheme() {
  isDark.value = !isDark.value
  localStorage.setItem('registry-aio-theme', isDark.value ? 'dark' : 'light')
  applyTheme()
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await refresh()
  await navigateTo('/login')
}
</script>
