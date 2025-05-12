<template lang="pug">
NModal.file-preview-modal(preset='card', v-model:show='show', :title='fileName')
  .file-preview-inner
    NSkeleton(v-if='!item', height='200px')
    .file-preview-main(v-else)
      .file-preview-file-container
        .preview-file-image(v-if='previewType === "image"', text-center)
          img(:src='cdnUrl', alt='preview', min-w='20px', h-auto, inline)
        .preview-file-video(v-else-if='previewType === "video"', text-center)
          video(:src='cdnUrl', controls, w-full, h-auto)
        .preview-file-audio(v-else-if='previewType === "audio"', text-center)
          audio(:src='cdnUrl', controls, w-full, h-auto)
        .preview-file-text(v-else-if='previewType === "text"')
          pre(v-if='rawText', :innerHTML='rawText')
          NSpin(v-else, :show='isLoading', size='small')
            NP Loading...
        .preview-file-iframe(v-else-if='previewType === "iframe"', text-center)
          iframe(:src='cdnUrl', w-full, h-auto)
            NP Loading...
        .preview-file-unknown(v-else, text-center)
          NIcon(size='40'): IconFileUnknown
          NP Unknown file type

      .preview-details(v-if='item', mt-4, flex, flex-col, gap-4)
        NTable
          tr
            th Name
            td {{ fileName }}
          tr
            th Size
            td {{ item.size }}
          tr
            th Type
            td {{ item.httpMetadata?.contentType || 'unknown' }}
          tr
            th Last Modified
            td {{ item.uploaded ? new Date(item.uploaded).toLocaleString() : 'unknown' }}
          tr
            th Custom Metadata
            td(v-if='!Object.keys(item?.customMetadata || {}).length') No metadata
            NTable(v-else, :bordered='false', size='small')
              tr(v-for='(value, key) in (item.customMetadata || {})')
                th(width='100') {{ key }}
                td: code {{ value }}
          tr
            th CDN URL
            td: NA(:href='cdnUrl', target='_blank') {{ cdnUrl }}
          tr(v-if='item?.customMetadata?.thumbnail')
            th Thumbnail URL
            td: NA(:href='bucket.getThumbnailUrl(item)?.square', target='_blank') {{ bucket.getThumbnailUrl(item)?.square }}

        details
          pre {{ item }}

        NButtonGroup
          NButton(size='small', type='primary', @click='() => emit("download")') Download
          NButton(size='small', type='error', @click='() => emit("delete")') Delete
</template>

<script setup lang="ts">
import type { R2Object } from '@cloudflare/workers-types/2023-07-01'
import { IconFileUnknown } from '@tabler/icons-vue'

const show = defineModel('show', { type: Boolean, default: false })
const props = defineProps<{
  item?: R2Object | null
}>()
const emit = defineEmits<{
  download: []
  delete: []
}>()

const bucket = useBucketStore()

const fileName = computed(() => {
  if (!props.item) return ''
  return props.item.key.split('/').pop() || ''
})
const cdnUrl = computed(() => {
  if (!props.item) return ''
  return bucket.getCDNUrl(props.item)
})

const getPreviewType = (item?: R2Object | null) => {
  if (!item) return 'unknown'
  const fileName = item.key.split('/').pop() || ''
  const ext = fileName.toLocaleLowerCase().split('.').pop() || ''
  const contentType = item.httpMetadata?.contentType || 'application/octet-stream'
  if (contentType.startsWith('image/')) return 'image'
  if (contentType.startsWith('video/')) return 'video'
  if (contentType.startsWith('audio/')) return 'audio'
  if (['txt', 'md', 'json'].includes(ext) || contentType.startsWith('text/')) return 'text'
  if (['pdf'].includes(ext)) return 'iframe'
  return 'unknown'
}
const previewType = computed(() => getPreviewType(props.item))

const isLoading = ref(false)
const rawText = ref('')
watch(
  computed<[boolean, R2Object | null | undefined]>(() => [show.value, props.item]),
  ([show, item], [_, prevItem]) => {
    if (!show || !item || item?.key === prevItem?.key) {
      return
    }
    rawText.value = ''
    const previewType = getPreviewType(item)
    if (previewType === 'text') {
      fetch(bucket.getCDNUrl(item))
        .then((response) => {
          if (response.ok) {
            return response.text()
          } else {
            throw new Error('Network response was not ok')
          }
        })
        .then((text) => {
          rawText.value = text
        })
        .catch((error) => {
          console.error('Error fetching text:', error)
        })
    }
  }
)
</script>

<style scoped lang="sass">
:global(.file-preview-modal)
  width: 860px
  max-width: 96vw
</style>
