<template lang="pug">
NaiveuiProvider
  NuxtLayout
    NuxtPage
</template>

<script setup lang="ts">
useHead({
  title: 'FlareDrive',
  meta: [
    { name: 'description', content: 'S3-compatible 存储桶管理器' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  ],
  link: [{ rel: 'icon', type: 'image/png', href: '/favicon.png' }],
})
</script>
