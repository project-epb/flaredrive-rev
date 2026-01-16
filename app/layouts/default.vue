<template lang="pug">
.min-h-screen.flex.flex-col.bg-gray-50(class='dark:bg-gray-950')
  header.sticky.top-0.z-50.border-b.backdrop-blur-lg(class='bg-white/80 dark:bg-gray-900/80')
    UContainer
      .h-16.flex.items-center.justify-between.gap-4
        .min-w-0.flex.items-center.gap-4
          NuxtLink.flex.items-center.gap-2.font-bold.text-xl.transition-colors(to='/', class='hover:text-primary')
            img(src='/favicon.png', alt='FlareDrive', width='32', height='32')
            span FlareDrive

          .hidden.items-center.gap-6.ml-2(class='md:flex')
            NuxtLink.text-sm.font-medium.transition-colors.text-gray-600(
              to='/buckets',
              active-class='text-primary',
              class='dark:text-gray-300 hover:text-primary dark:hover:text-primary'
            ) 全部存储桶

        .flex.items-center.gap-3
          UButton(:icon='currentThemeIcon', color='neutral', variant='ghost', square, @click='toggleTheme')

          UDropdownMenu(:items='userMenuItems', :popper='{ placement: "bottom-end" }')
            UButton(icon='i-lucide-user', color='neutral', variant='ghost', square)

  main.flex-1
    UContainer.py-8
      slot

  footer.border-t.mt-auto.bg-white(class='dark:bg-gray-900')
    UContainer
      .py-6.text-center.text-sm.text-gray-600(class='dark:text-gray-400')
        | Copyright © {{ new Date().getFullYear() }} FlareDrive. All rights reserved.
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '#ui/types'

const router = useRouter()
// const route = useRoute()  <-- route 也没用了，除非别的用了

// 主题管理
const colorMode = useColorMode()

const currentThemeIcon = computed(() => (colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'))

const toggleTheme = () => {
  colorMode.value = colorMode.value === 'dark' ? 'light' : 'dark'
}

const userMenuItems = computed<DropdownMenuItem[][]>(() => {
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
