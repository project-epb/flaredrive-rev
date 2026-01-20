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
import BrowserListView from './BrowserListView.vue'
import type { StorageListObject, StorageListResult } from '@/models/BucketClient'

const show = defineModel('show', { type: Boolean, default: false })
const props = defineProps<{
  list: StorageListObject[]
}>()
const emit = defineEmits<{
  rename: [item: StorageListObject]
  delete: [item: StorageListObject]
  download: [item: StorageListObject]
  navigate: [item: StorageListObject]
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
  } as StorageListResult
})
</script>

<style scoped lang="sass"></style>
