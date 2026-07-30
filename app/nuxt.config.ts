import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/css/tailwind.css'],
  modules: ['shadcn-nuxt'],
  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },
  runtimeConfig: {
    sessionSecret: process.env.SESSION_SECRET || '',
    databaseUrl: process.env.DATABASE_URL || '',
    registryInternalUrl: process.env.REGISTRY_INTERNAL_URL || 'http://registry:5000',
    tokenKeyPath: process.env.TOKEN_KEY_PATH || '',
    tokenCertPath: process.env.TOKEN_CERT_PATH || '',
    public: {
      authPublicUrl: process.env.AUTH_PUBLIC_URL || 'http://localhost:3080',
      registryPublicUrl: process.env.REGISTRY_PUBLIC_URL || 'localhost:5050',
      registryPort: process.env.REGISTRY_PORT || '5050',
    },
  },
  nitro: {
    esbuild: {
      options: {
        target: 'esnext',
      },
    },
    moduleSideEffects: ['better-sqlite3', '@prisma/adapter-better-sqlite3'],
    externals: {
      external: ['better-sqlite3', '@prisma/client', '@prisma/adapter-better-sqlite3'],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
})