<template lang="pug">
NModal(
  v-model:show='show',
  preset='card',
  :title='fileName',
  style='width: 800px; max-width: 95vw',
  :bordered='false',
  size='huge'
)
  BrowserFilePreview(
    v-if='item',
    :item='item',
    :bucket-id='bucketId',
    @download='emit("download", $event)',
    @delete='emit("delete", $event)'
  )
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NModal } from 'naive-ui'
import type { S3ObjectInfo } from '~/composables/bucket'
import BrowserFilePreview from './BrowserFilePreview.vue'

const props = defineProps<{
  item?: S3ObjectInfo | null
  bucketId: string
}>()

const show = defineModel<boolean>('show', { default: false })

const emit = defineEmits<{
  download: [item: S3ObjectInfo]
  delete: [item: S3ObjectInfo]
}>()

const fileName = computed(() => {
  if (!props.item) return ''
  return props.item.key.split('/').pop() || ''
})
</script>
