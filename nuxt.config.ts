// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    tursoUrl: process.env.TURSO_URL || '',
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN || '',
  },
})
