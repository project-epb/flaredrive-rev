<template lang="pug">
NLayoutHeader.global-header(bordered)
  .flex(h-60px, px-4, py-2, gap-4, items-center, justify-between, h-full, overflow-x-auto)
    //- Left Side
    .flex(items-center, gap-2)
      //- Logo / Home Link
      RouterLink(to='/', style='text-decoration: none; color: inherit; display: flex; align-items: center; gap: 8px')
        img(src='/logos/flaredrive-mascot.png', alt='Site Logo', width='24', height='24')
        span.font-bold.text-lg {{ site.siteName || 'FlareDrive' }}

      //- Navigation Links
      //- Current Bucket Link
      NButtonLink(
        v-if='$route.path.startsWith("/bucket/") && bucket.currentBucketInfo',
        :to='`/bucket/${bucket.currentBucketInfo.id}/`',
        quaternary,
        type='primary',
        size='small'
      ) 
        template(#icon)
          NIcon: IconBucket
        | {{ bucket.currentBucketInfo.name || bucket.currentBucketName }}
      NButtonLink(
        v-else-if='!isMobile',
        to='/',
        quaternary,
        :type='$route.path === "/" ? "primary" : "default"',
        size='small'
      )
        template(#icon)
          NIcon: IconDatabase
        | My Buckets

    //- Right Side
    .flex(items-center, gap-3)
      NButtonLink(
        quaternary,
        size='small',
        v-if='showDashboard',
        to='/admin',
        :type='$route.path.startsWith("/admin") ? "primary" : "default"'
      )
        template(#icon): IconDashboard
        template(v-if='!isMobile') Admin
      NDropdown(:options='themeOptions', @select='theme.setTheme', :value='theme.rawTheme')
        NButton(quaternary, circle, @click='switchThemes'): component(:is='currentThemeOption.icon')

      GlobalUserMenu
</template>

<script setup lang="ts">
import type { DropdownOption } from 'naive-ui/es/dropdown/src/interface'
import { IconBucket, IconDashboard, IconDatabase } from '@tabler/icons-vue'

const theme = useThemeStore()
const auth = useAuthStore()
const bucket = useBucketStore()
const site = useSiteStore()
const themeOptions = shallowRef<DropdownOption[]>([
  {
    type: '',
    label: 'Auto',
    key: 'auto',
    icon: () => '🌈',
  },
  {
    label: 'Light',
    key: 'light',
    icon: () => '🌞',
  },
  {
    label: 'Dark',
    key: 'dark',
    icon: () => '🌚',
  },
])
const currentThemeOption = computed(() => {
  return themeOptions.value.find((option) => option.key === theme.rawTheme)!
})
const showDashboard = computed(() => (auth.user?.authorizationLevel || 0) >= 3)
const switchThemes = () => {
  const currentIndex = themeOptions.value.findIndex((option) => option.key === theme.rawTheme)
  const nextIndex = (currentIndex + 1) % themeOptions.value.length
  const nextTheme = themeOptions.value[nextIndex]!.key as 'auto' | 'light' | 'dark'
  theme.setTheme(nextTheme)
}

const { width: windowWidth } = useWindowSize()
const isMobile = computed(() => windowWidth.value < 768)
</script>

<style scoped lang="sass">
.global-header
  backdrop-filter: blur(16px)
  background-color: rgba(255, 255, 255, 0.85)
  html.dark &
    background-color: rgba(0, 0, 0, 0.85)
</style>
