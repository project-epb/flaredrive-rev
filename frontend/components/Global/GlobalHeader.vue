<template lang="pug">
NLayoutHeader.global-header(bordered, fixed, top-0, left-0, right-0, h-60px, z-10)
  .flex(p-4, items-center, justify-between, h-full)
    //- NButtonLink(quaternary, to='/') FlareDrive
    .router-links
      NBreadcrumb
        NBreadcrumbItem(key='__ROOT__', @click='$router.push("/")')
          NText(quaternary, text)
            img(inline, src='/favicon.png', alt='Site Logo', width='14', height='14', mr-2)
            | FlareDrive
        NBreadcrumbItem(
          v-for='(item, index) in $route.path.split("/").filter(Boolean)',
          :key='index',
          @click='() => $router.push({ name: "@browser", params: { path: $route.path.split("/").slice(0, index + 1).join("/"), }, })'
        )
          | {{ item || '(???)' }}
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

<style scoped lang="sass">
.global-header
  backdrop-filter: blur(16px)
  background-color: rgba(255, 255, 255, 0.85)
  html.dark &
    background-color: rgba(0, 0, 0, 0.85)
</style>
