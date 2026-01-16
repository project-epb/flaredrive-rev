<template lang="pug">
.home-page
  .hero-section
    UContainer
      .hero-content
        .flex.flex-col.items-center.text-center
          .mb-8
            img.mx-auto(src='/favicon.png', alt='FlareDrive', width='96', height='96')
          h1.text-6xl.font-bold.mb-4 FlareDrive
          p.text-2xl.mb-2.opacity-90 通用 S3-compatible 存储桶管理器
          p.text-lg.mb-8.opacity-75 支持 Cloudflare R2、AWS S3、MinIO 等多种存储后端

          .flex.gap-4.justify-center
            UButton(color='primary', size='xl', icon='i-lucide-rocket', @click='handleGetStarted') 开始使用
            UButton(color='white', variant='outline', size='xl', @click='$router.push("/auth/login")') 登录

  .features-section.py-20
    UContainer
      h2.text-4xl.font-bold.text-center.mb-16 核心特性
      .grid.gap-8.grid-cols-1(class='md:grid-cols-2 lg:grid-cols-4')
        UCard(v-for='feature in features', :key='feature.title')
          template(#header='')
            .flex.justify-center.mb-4
              .p-4.rounded-full.bg-primary-100(class='dark:bg-primary-900/20')
                UIcon.size-8.text-primary(dynamic, :name='feature.icon')
          .text-center
            h3.text-xl.font-semibold.mb-2 {{ feature.title }}
            p.text-gray-600(class='dark:text-gray-400') {{ feature.description }}
</template>

<script setup lang="ts">
const router = useRouter()

const features = [
  {
    icon: 'i-lucide-cloud',
    title: '多后端支持',
    description: '支持 R2、S3、MinIO 等多种 S3 兼容存储',
  },
  {
    icon: 'i-lucide-upload',
    title: '便捷上传',
    description: '支持拖拽上传、批量上传、文件夹上传',
  },
  {
    icon: 'i-lucide-shield',
    title: '安全可靠',
    description: '基于 JWT 的身份认证和权限管理',
  },
  {
    icon: 'i-lucide-zap',
    title: '高性能',
    description: '基于 Cloudflare Workers 的边缘计算',
  },
]

const handleGetStarted = () => {
  router.push('/auth/register')
}

// 检查是否已登录，如果已登录则跳转到桶列表
onMounted(async () => {
  try {
    const { user, fetchUser } = useUser()
    const currentUser = await fetchUser()

    if (currentUser?.id) {
      router.push('/buckets')
    }
  } catch (error) {
    console.info('User not logged in', error)
    // 未登录，保持在首页
  }
})
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
}

.hero-section {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, theme('colors.primary.600') 0%, theme('colors.primary.800') 100%);

  @apply dark:from-slate-800 dark:to-slate-950;

  .hero-content {
    padding: 2rem;
  }
}

.features-section {
  @apply bg-gray-50 dark:bg-gray-900;
}
</style>
