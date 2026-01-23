<template lang="pug">
.not-found-container
  NResult(status='404', title='Don\'t Panic!', description='This page is mostly harmless... mostly.')
    template(#icon)
      .icon-wrapper
        .floating-icon.text-32 🛸
    template(#footer)
      NSpace(justify='center')
        NButton(type='primary', size='large', @click='router.push("/")')
          template(#icon)
            IconHome
          | Back to Earth
        NButton(size='large', @click='goBack')
          template(#icon)
            IconArrowLeft
          | Reverse the improbability
    p.fun-text The answer to life, the universe, and everything is 42, but this page is 404.
</template>

<script setup lang="ts">
import { IconMoodSad, IconHome, IconArrowLeft } from '@tabler/icons-vue'

definePage({
  name: '404-fallback',
})

const router = useRouter()

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<style scoped lang="scss">
.not-found-container {
  min-height: 75vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.icon-wrapper {
  .floating-icon {
    animation: float 3s ease-in-out infinite;
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

.fun-text {
  margin-top: 1rem;
  font-size: 1rem;
  opacity: 0.7;
}
</style>
