<template lang="pug">
NLayout.full-layout-container.default-layout(content-class='min-h-100vh flex flex-col', native-scrollbar)
  NLayoutContent.main-content-container(flex-1, native-scrollbar)
    slot
  GlobalHeader(fixed, top-0, left-0, right-0, z-10)
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

:deep(.root-router-view)
  width: 1200px
  max-width: calc(100vw - 2rem)
  margin: 0 auto
  padding-top: 1rem

:deep(.n-layout)
  &, .n-layout-scroll-container
    overflow: unset
</style>
