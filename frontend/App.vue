<template lang="pug">
NaiveuiProvider#full-app-container
  component(:is='CurrentLayout')
    RouterView.root-router-view(:data-route-name='$route.name')
</template>

<script setup lang="ts">
const route = useRoute()
import LayoutDefault from './components/Layout/LayoutDefault.vue'

const CurrentLayout = computed(() => {
  return route.meta.layout || LayoutDefault
})
</script>

<style scoped lang="sass"></style>
