<template lang="pug">
.min-h-screen.flex.flex-col.bg-gray-50(class='dark:bg-gray-950')
  header.sticky.top-0.z-50.border-b.backdrop-blur-lg(class='bg-white/80 dark:bg-gray-900/80')
    UContainer
      .h-16.flex.items-center.justify-between.gap-4
        .min-w-0.flex.items-center.gap-4
          NuxtLink.flex.items-center.gap-2.font-bold.text-xl.transition-colors(to='/', class='hover:text-primary')
            img(src='/favicon.png', alt='FlareDrive', width='32', height='32')
            span FlareDrive

          .flex.items-center.gap-1.text-sm(v-if='breadcrumbs.length')
            template(v-for='(item, index) in breadcrumbs', :key='item.path')
              UIcon.size-4.text-gray-400(name='i-lucide-chevron-right')
              NuxtLink.text-gray-700.truncate.transition-colors(:to='item.path', class='dark:text-gray-300 hover:text-primary dark:hover:text-primary') {{ item.label }}

        .flex.items-center.gap-3
          UButton(
            :icon='currentThemeIcon',
            color='gray',
            variant='ghost',
            square,
            @click='toggleTheme'
          )

          UDropdown(:items='userMenuItems', :popper='{ placement: "bottom-end" }')
            UButton(icon='i-lucide-user', color='gray', variant='ghost', square)

  main.flex-1
    UContainer.py-8
      slot

  footer.border-t.mt-auto(class='bg-white dark:bg-gray-900')
    UContainer
      .py-6.text-center.text-sm.text-gray-600(class='dark:text-gray-400')
        | Copyright © {{ new Date().getFullYear() }} FlareDrive. All rights reserved.
</template>

<script setup lang="ts">
import type { DropdownItem } from '#ui/types'

const router = useRouter()
const route = useRoute()

// 主题管理
const colorMode = useColorMode()

const currentThemeIcon = computed(() => (colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'))

const toggleTheme = () => {
  colorMode.value = colorMode.value === 'dark' ? 'light' : 'dark'
}

// 面包屑导航
const breadcrumbs = computed(() => {
  const paths = route.path.split('/').filter(Boolean)
  if (paths.length === 0) return []

  const crumbs = []
  let currentPath = ''

  for (const part of paths) {
    currentPath += `/${part}`
    crumbs.push({
      label: decodeURIComponent(part),
      path: currentPath,
    })
  }

  return crumbs
})

const userMenuItems = computed<DropdownItem[][]>(() => {
  return [
    [
      {
        label: '设置',
        icon: 'i-lucide-settings',
        click: () => {
          // TODO: 跳转到设置页面
        },
      },
    ],
    [
      {
        label: '退出登录',
        icon: 'i-lucide-log-out',
        click: () => {
          // TODO: 实现登出逻辑
          router.push('/auth/login')
        },
      },
    ],
  ]
})
</script>
