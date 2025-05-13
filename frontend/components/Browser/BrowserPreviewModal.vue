<template lang="pug">
NModal.file-preview-modal(preset='card', v-model:show='show', :title='fileName')
  BrowserFilePreview(:item, @download='emit("download", $event)', @delete='emit("delete", $event)')
</template>

<script setup lang="ts">
import type { R2Object } from '@cloudflare/workers-types/2023-07-01'

const show = defineModel('show', { type: Boolean, default: false })
const props = defineProps<{
  item?: R2Object | null
}>()
const emit = defineEmits<{
  download: [item: R2Object]
  delete: [item: R2Object]
}>()

const fileName = computed(() => {
  if (!props.item) return ''
  return props.item.key.split('/').pop() || ''
})
</script>

<style scoped lang="sass"></style>
