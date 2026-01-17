<template lang="pug">
.min-h-screen.flex.items-center.justify-center.relative.overflow-hidden
  //- 背景渐变
  .absolute.inset-0.bg-gradient-to-br.from-primary-600.via-primary-700.to-primary-900(
    class='dark:from-gray-900 dark:via-gray-800 dark:to-black'
  )

  //- 装饰元素
  .absolute.inset-0.opacity-20
    .absolute.top-0.left-0.w-96.h-96.bg-white.rounded-full.blur-3xl(class='dark:bg-primary-500')
    .absolute.bottom-0.right-0.w-96.h-96.bg-white.rounded-full.blur-3xl(class='dark:bg-primary-500')

  //- 主内容
  .relative.w-full.max-w-md.p-6.z-10
    //- Logo 和标题
    .text-center.mb-8
      img.mx-auto.mb-6.drop-shadow-lg(src='/favicon.png', alt='FlareDrive', width='64', height='64')
      h1.text-4xl.font-bold.text-white.mb-2 FlareDrive
      p.text-white.opacity-90 通用 S3-compatible 存储桶管理器

    //- 表单卡片
    .shadow-2xl
      slot

    //- 底部操作
    .mt-6.flex.justify-center
      NButton.text-white(quaternary, circle, size='large', @click='toggleTheme')
        template(#icon)
          Icon(:name='currentThemeIcon')
</template>

<script setup lang="ts">
const colorMode = useColorMode()

const currentThemeIcon = computed(() => {
  return colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'
})

const toggleTheme = () => {
  colorMode.value = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>
