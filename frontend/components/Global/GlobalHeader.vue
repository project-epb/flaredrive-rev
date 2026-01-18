<template lang="pug">
NLayoutHeader.global-header(bordered, fixed, top-0, left-0, right-0, z-10)
  .flex(h-60px, px-4, py-2, gap-4, items-center, justify-between, h-full)
    //- Left Side
    .flex(items-center, gap-6)
      //- Logo / Home Link
      router-link(to='/', style='text-decoration: none; color: inherit; display: flex; align-items: center; gap: 8px')
        img(src='/favicon.png', alt='Site Logo', width='24', height='24')
        span.font-bold.text-lg FlareDrive

      //- Navigation Links
      NButton(quaternary, @click='$router.push("/")')
        template(#icon)
          NIcon(:component='IconBucket')
        | All Buckets

    //- Right Side
    .flex(items-center, gap-3)
      NDropdown(:options='themeOptions', @select='theme.setTheme', :value='theme.rawTheme')
        NButton(quaternary, circle, @click='switchThemes'): component(:is='currentThemeOption.icon')

      GlobalUserMenu
</template>

<script setup lang="ts">
import type { DropdownOption } from 'naive-ui/es/dropdown/src/interface'
import { IconBucket } from '@tabler/icons-vue'

const theme = useThemeStore()
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
const switchThemes = () => {
  const currentIndex = themeOptions.value.findIndex((option) => option.key === theme.rawTheme)
  const nextIndex = (currentIndex + 1) % themeOptions.value.length
  const nextTheme = themeOptions.value[nextIndex]!.key as 'auto' | 'light' | 'dark'
  theme.setTheme(nextTheme)
}
</script>

<style scoped lang="sass">
.global-header
  backdrop-filter: blur(16px)
  background-color: rgba(255, 255, 255, 0.85)
  html.dark &
    background-color: rgba(0, 0, 0, 0.85)
</style>
