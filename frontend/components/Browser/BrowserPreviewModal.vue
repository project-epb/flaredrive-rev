<template lang="pug">
NModal.file-preview-modal(preset='card', v-model:show='show', :title='fileName')
  BrowserFilePreview(
    :item,
    @download='emit("download", $event)',
    @delete='emit("delete", $event)',
    @toggle-public='emit("togglePublic", $event)'
  )
</template>

<script setup lang="ts">
import type { StorageListObject } from '@/models/BucketClient'

const show = defineModel('show', { type: Boolean, default: false })
const props = defineProps<{
  item?: StorageListObject | null
}>()
const emit = defineEmits<{
  download: [item: StorageListObject]
  delete: [item: StorageListObject]
  togglePublic: [item: StorageListObject]
}>()

const fileName = computed(() => {
  if (!props.item) return ''
  return props.item.key.split('/').pop() || ''
})
</script>

<style scoped lang="sass"></style>
