export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const { data } = await useFetch<{ user: { id: string; username: string; role: string } | null }>(
    '/api/auth/me',
    { key: 'auth-me' },
  )

  if (!data.value?.user) {
    return navigateTo('/login')
  }
})
