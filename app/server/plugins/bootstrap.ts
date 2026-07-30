export default defineNitroPlugin(async () => {
  try {
    await ensureBootstrap()
    console.log('[bootstrap] admin ready')
  } catch (err) {
    console.error('[bootstrap] failed on startup', err)
  }
})
