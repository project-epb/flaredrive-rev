<template lang="pug">
NLayoutHeader.global-header(bordered, fixed, top-0, left-0, right-0, h-60px, z-10)
  .flex(p-4, items-center, justify-between, h-full)
    NButtonLink(quaternary, to='/') FlareDrive
    .site-configs-container
      NDropdown(:options='themeOptions', @select='theme.setTheme')
        NButton(secondary, circle, size='small') {{ currentThemeOption.icon }}
</template>

<script setup lang="ts">
const theme = useThemeStore()
const themeOptions = [
  {
    label: 'Auto',
    key: 'auto',
    icon: '🌈',
  },
  {
    label: 'Light',
    key: 'light',
    icon: '🌞',
  },
  {
    label: 'Dark',
    key: 'dark',
    icon: '🌚',
  },
]
const currentThemeOption = computed(() => {
  return themeOptions.find((option) => option.key === theme.rawTheme)!
})
</script>

<style scoped lang="sass"></style>
