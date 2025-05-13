<template lang="pug">
NLayoutHeader.global-header(bordered, fixed, top-0, left-0, right-0, z-10)
  NScrollbar(x-scrollable, w-full, overflow-y-hidden, ref='scrollRef')
    .flex(h-60px, p-4, gap-6, items-center, justify-between, h-full, whitespace-nowrap)
      //- NButtonLink(quaternary, to='/') FlareDrive
      .router-links
        NBreadcrumb
          NBreadcrumbItem(key='__ROOT__', @click='$router.push("/")')
            NText(quaternary, text)
              img(inline, src='/favicon.png', alt='Site Logo', width='14', height='14', mr-2)
              | FlareDrive
          NBreadcrumbItem(v-for='(item, index) in breadParts', :key='item.key', @click='onBreadClick(item, index)') {{ item.label }}
      .site-configs-container
        NDropdown(:options='themeOptions', @select='theme.setTheme', :value='theme.rawTheme')
          NButton(secondary, circle, size='small'): component(:is='currentThemeOption.icon')
</template>

<script setup lang="ts">
import type { DropdownOption } from 'naive-ui/es/dropdown/src/interface'

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

const route = useRoute()
const router = useRouter()
const breadParts = computed<
  {
    label: string // display name
    key: string // real path
  }[]
>(() => {
  const parts = route.path.split('/').filter(Boolean)
  return parts.map((part, index) => {
    return {
      label: part,
      key: parts.slice(0, index + 1).join('/'),
    }
  })
})
const onBreadClick = (item: { label: string; key: string }, index: number) => {
  if (index + 1 === breadParts.value.length) {
    return // current route
  }
  router.push({ name: '@browser', params: { path: item.key } })
}

const scrollRef = useTemplateRef('scrollRef')
watch(route, async () => {
  await nextTick()
  scrollRef.value?.scrollTo({ left: Number.MAX_SAFE_INTEGER, behavior: 'smooth' })
})
</script>

<style scoped lang="sass">
.global-header
  backdrop-filter: blur(16px)
  background-color: rgba(255, 255, 255, 0.85)
  html.dark &
    background-color: rgba(0, 0, 0, 0.85)
</style>
