<template lang="pug">
NDrawer(v-model:show='show', placement='bottom', default-height='75vh', resizable)
  NDrawerContent(closable)
    template(#header) Upload History
    BrowserListView(
      :payload='payload',
      no-folder,
      default-sort-by='uploaded',
      default-sort-order='descend',
      @navigate='emit("navigate", $event)',
      @delete='emit("delete", $event)',
      @download='emit("download", $event)',
      @rename='emit("rename", $event)'
    )
</template>

<script setup lang="ts">
import type { R2BucketListResponse } from '@/models/R2BucketClient'
import BrowserListView from './BrowserListView.vue'
import type { R2Object } from '@cloudflare/workers-types/2023-07-01'

const show = defineModel('show', { type: Boolean, default: false })
const props = defineProps<{
  list: R2Object[]
}>()
const emit = defineEmits<{
  rename: [item: R2Object]
  delete: [item: R2Object]
  download: [item: R2Object]
  navigate: [item: R2Object]
}>()

const payload = computed(() => {
  return {
    prefix: '',
    objects: props.list,
    folders: [] as string[],
    limit: Infinity,
    startAfter: '',
    hasMore: false,
    moreAfter: null,
  } as R2BucketListResponse
})
</script>

<style scoped lang="sass"></style>
