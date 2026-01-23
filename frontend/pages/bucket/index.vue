<template lang="pug"></template>

<script setup lang="ts">
const router = useRouter()
onMounted(() => router.replace('/'))
definePage({
  name: 'bucket-root',
})
</script>

<style scoped lang="scss"></style>
