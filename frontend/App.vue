<template lang="pug">
NaiveuiProvider#full-app-container
  NLayout.full-layout-container(content-class='min-h-100vh flex flex-col')
    NLayoutContent.main-content-container(flex-1)
      RouterView.root-router-view(:data-route-name='$route.name')
    GlobalHeader
    GlobalFooter
</template>

<script setup lang="ts">
const route = useRouter()
const router = useRouter()
const lastRoute = useLocalStorage('flaredrive:last-route', '/')

onMounted(() => {
  if (lastRoute.value) {
    router.replace(lastRoute.value)
  }
})
router.afterEach((to) => {
  if (!to.path.startsWith('/@')) {
    lastRoute.value = to.fullPath
  }
})
</script>

<style scoped lang="sass">
#full-app-container
  min-height: 100vh
  display: flex
  flex-direction: column

.main-content-container
  flex: 1
  padding-top: 60px
  padding-bottom: 60px

.root-router-view
  width: 1200px
  max-width: calc(100vw - 2rem)
  margin: 0 auto
  padding-top: 1rem
</style>
