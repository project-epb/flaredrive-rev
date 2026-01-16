<template lang="pug">
NaiveuiProvider#full-app-container
  NLayout.full-layout-container(content-class='min-h-100vh flex flex-col', native-scrollbar)
    NLayoutContent.main-content-container(flex-1, native-scrollbar)
      RouterView.root-router-view(:data-route-name='$route.name')
    GlobalHeader
    GlobalFooter
</template>

<script setup lang="ts"></script>

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

:deep(.n-layout)
  &, .n-layout-scroll-container
    overflow: unset
</style>
