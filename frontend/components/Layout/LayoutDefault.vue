<template lang="pug">
NLayout.full-layout-container.default-layout(
  content-class='min-h-100vh flex flex-col',
  native-scrollbar,
  position='absolute'
)
  GlobalHeader(fixed, left-0, top-0, w-full, z-10)
  NLayoutContent.main-content-container(flex-1, native-scrollbar, style='padding-top: 60px')
    slot
  GlobalFooter
</template>

<script setup lang="ts"></script>

<style scoped lang="sass">
:deep(.root-router-view)
  width: 1200px
  max-width: calc(100vw - 2rem)
  margin: 0 auto
  padding-top: 1rem

:deep(.n-layout)
  &, .n-layout-scroll-container
    overflow: unset
</style>
