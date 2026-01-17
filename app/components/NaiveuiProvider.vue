<template lang="pug">
NConfigProvider(
  :theme-overrides='themeOverrides',
  :theme='naiveTheme',
  :locale='zhCN',
  :date-locale='dateZhCN',
  inline-theme-disabled
)
  NMessageProvider(:max='5', :duration='5000', placement='top')
    NNotificationProvider(:max='5', placement='top-right')
      NDialogProvider
        NModalProvider
          slot
</template>

<script setup lang="ts">
import { type GlobalThemeOverrides, darkTheme, lightTheme, dateZhCN, zhCN } from 'naive-ui'

const colorMode = useColorMode()
const naiveTheme = computed(() => (colorMode.value === 'dark' ? darkTheme : lightTheme))

// Cloudflare Orange Theme
const themeOverrides: GlobalThemeOverrides = {
  common: {
    borderRadius: '0.5rem',
    primaryColor: '#F6821F',
    primaryColorHover: '#FF9A3C',
    primaryColorPressed: '#E06E0A',
    primaryColorSuppl: '#FF8C2A',
  },
}
</script>
