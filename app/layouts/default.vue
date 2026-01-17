<template lang="pug">
.min-h-screen.flex.flex-col.bg-gray-50(class='dark:bg-gray-950')
  header.sticky.top-0.z-50.border-b.backdrop-blur-lg(class='bg-white/80 dark:bg-gray-900/80')
    .container.mx-auto.px-4
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
          NButton(quaternary, circle, @click='toggleTheme')
            template(#icon)
              Icon(:name='currentThemeIcon')

          NDropdown(:options='userMenuOptions', trigger='click')
            NButton(quaternary, circle)
              template(#icon)
                Icon(name='i-lucide-user')

  main.flex-1
    .container.mx-auto.px-4.py-8
      slot

  footer.border-t.mt-auto.bg-white(class='dark:bg-gray-900')
    .container.mx-auto.px-4
      .py-6.text-center.text-sm.text-gray-600(class='dark:text-gray-400')
        | Copyright © {{ new Date().getFullYear() }} FlareDrive. All rights reserved.
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'

const router = useRouter()
// const route = useRoute()  <-- route 也没用了，除非别的用了

// 主题管理
const colorMode = useColorMode()

const currentThemeIcon = computed(() => (colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'))

const toggleTheme = () => {
  colorMode.value = colorMode.value === 'dark' ? 'light' : 'dark'
}

const renderIcon = (iconName: string) => {
  return () => h(resolveComponent('Icon'), { name: iconName })
}

const userMenuOptions = [
  {
    label: '设置',
    key: 'settings',
    icon: renderIcon('i-lucide-settings'),
    props: {
      onClick: () => {
        // TODO: 跳转到设置页面
      }
    }
  },
  {
     type: 'divider',
     key: 'd1'
  },
  {
    label: '退出登录',
    key: 'logout',
    icon: renderIcon('i-lucide-log-out'),
    props: {
        onClick: () => {
          // TODO: 实现登出逻辑
          router.push('/auth/login')
        }
    }
  },
]
</script>
