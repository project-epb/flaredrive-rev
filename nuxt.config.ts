import { defineNuxtConfig } from 'nuxt/config'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-01-17',
  devtools: { enabled: true },
  ssr: false,
  app: {
    head: {
      title: 'FlareDrive',
      meta: [{ name: 'description', content: 'S3-compatible storage manager' }],
    },
  },
  modules: ['@nuxtjs/color-mode', '@nuxt/icon', 'nuxtjs-naive-ui', '@pinia/nuxt', '@vueuse/nuxt'],
  css: ['~/assets/styles/main.css'],
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
  vite: {
    plugins: [
      tailwindcss(),
      AutoImport({
        imports: [
          {
            'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar'],
          },
        ],
        dts: 'types/auto-imports.d.ts',
      }),
      Components({
        resolvers: [NaiveUiResolver()],
      }),
    ],
  },
})
