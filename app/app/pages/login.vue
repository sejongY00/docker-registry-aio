<template>
  <div class="fixed inset-0 grid min-h-screen place-items-center bg-muted/30 p-4">
    <div class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_var(--color-muted),_transparent_45%)]" />
    <Card class="w-full max-w-sm shadow-xl">
      <CardHeader class="space-y-4 text-center">
        <div class="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Boxes class="size-6" />
        </div>
        <div>
          <CardTitle class="text-2xl">Registry AIO</CardTitle>
          <CardDescription class="mt-2">관리 콘솔에 로그인하세요</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form class="space-y-4" @submit.prevent="submit">
          <div class="space-y-2">
            <Label for="username">사용자명</Label>
            <Input id="username" v-model="username" autocomplete="username" placeholder="admin" required autofocus />
          </div>
          <div class="space-y-2">
            <Label for="password">비밀번호</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>

          <Alert v-if="error" variant="destructive">
            <CircleAlert class="size-4" />
            <AlertTitle>로그인 실패</AlertTitle>
            <AlertDescription>{{ error }}</AlertDescription>
          </Alert>

          <Button class="w-full" type="submit" :disabled="pending">
            <LoaderCircle v-if="pending" class="size-4 animate-spin" />
            {{ pending ? '로그인 중…' : '로그인' }}
          </Button>
        </form>
      </CardContent>
      <CardFooter class="justify-center border-t py-4 text-xs text-muted-foreground">
        Docker Registry Token Authentication
      </CardFooter>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { Boxes, CircleAlert, LoaderCircle } from '@lucide/vue'

definePageMeta({
  layout: false,
})

useHead({ title: '로그인', htmlAttrs: { class: 'dark' } })

const username = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)

const { data, refresh } = await useFetch<{ user: unknown | null }>('/api/auth/me', { key: 'auth-me' })
if (data.value?.user) {
  await navigateTo('/')
}

async function submit() {
  error.value = ''
  pending.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username: username.value, password: password.value },
    })
    await refresh()
    await navigateTo('/')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || '로그인에 실패했습니다'
  } finally {
    pending.value = false
  }
}
</script>
