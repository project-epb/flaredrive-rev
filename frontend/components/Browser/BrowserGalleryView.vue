<template lang="pug">
.browser-gallery-view Gallery View
</template>

<script setup lang="ts">
import type { R2BucketListResponse } from '@/models/R2BucketClient'

const props = defineProps<{
  payload: R2BucketListResponse
}>()
</script>

<style scoped lang="sass"></style>
