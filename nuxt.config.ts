import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2026-01-17',
  devtools: { enabled: true },
  app: {
    head: {
      title: 'FlareDrive',
      meta: [{ name: 'description', content: 'S3-compatible storage manager' }],
    },
  },
  modules: ['@nuxt/ui', '@pinia/nuxt', '@vueuse/nuxt'],
  css: ['~/assets/styles/global.css'],
  fonts: {
    provider: 'local',
  },
  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      wrangler: {},
    },
  },
  typescript: {
    tsConfig: {
      vueCompilerOptions: {
        plugins: ['@vue/language-plugin-pug'],
      },
    },
  },
})
