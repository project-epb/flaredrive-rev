<template lang="pug">
#upload-view
  NCard(title='Upload file')
    UploadForm
</template>

<script setup lang="ts">
definePage({
  name: '@upload-standalone',
})
</script>

<style scoped lang="sass"></style>
