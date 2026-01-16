<template lang="pug">
.file-preview
  NSkeleton(v-if='!item', height='200px')
  .file-preview-main(v-else)
    .file-preview-file-container
      .preview-file-image(v-if='previewType === "image"', text-center)
        NImage(
          :src='cdnUrl',
          :alt='fileNameParts.name',
          :width='300',
          :height='300',
          object-fit='contain',
          text-center
        )
      .preview-file-video(v-else-if='previewType === "video"', text-center)
        video(:src='cdnUrl', controls, w-full, h-auto)
      .preview-file-audio(v-else-if='previewType === "audio"', text-center)
        audio(:src='cdnUrl', controls, w-full, h-auto)
      .preview-file-markdown(v-else-if='previewType === "markdown"')
        div(v-if='rawTextContent !== null', min-h='200px', max-h='50vh', overflow-auto)
          MarkdownRender(:value='rawTextContent', tag='div')
        NSpin(v-else, show, size='small')
          NP Loading...
      .preview-file-text(v-else-if='previewType === "text"')
        div(v-if='rawTextContent !== null', min-h='200px', max-h='50vh', overflow-auto)
          Hljs(:code='rawTextContent', :lang='fileNameParts.ext')
        NSpin(v-else, show, size='small')
          NP Loading...
      .preview-file-iframe(v-else-if='previewType === "iframe"', text-center)
        iframe(:src='cdnUrl', w-full, h-50vh, onerror='this.replaceWith("Error loading file")')
      .preview-file-unknown(v-else, text-center)
        NIcon(size='40'): IconFileUnknown
        NP Preview not supported

    .preview-actions(mt-4, text-center)
      NButtonGroup
        NButton(size='small', type='primary', @click='emit("download", item)') Download
        NButton(size='small', type='info', @click='handleCopyURL') Copy URL
        NButton(size='small', type='error', @click='emit("delete", item)'): NIcon: IconTrash

    .preview-details(v-if='item', mt-4, flex, flex-col, gap-4)
      NTable
        tr
          th Name
          td {{ fileNameParts.name }}
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
              th(width='100') {{ decodeURIComponent(key) }}
              td: code {{ decodeURIComponent(value) }}
        tr
          th CDN URL
          td: NA(:href='cdnUrl', target='_blank') {{ cdnUrl }}
        tr(v-if='item?.customMetadata?.thumbnail')
          th Thumbnail URL
          td: NA(:href='bucket.getThumbnailUrls(item)?.square', target='_blank') {{ bucket.getThumbnailUrls(item)?.square }}

      details
        pre {{ item }}
</template>

<script setup lang="ts">
import { FileHelper } from '@/utils/FileHelper'
import type { R2Object } from '@cloudflare/workers-types/2023-07-01'
import { IconFileUnknown, IconTrash } from '@tabler/icons-vue'
import { useMessage } from 'naive-ui'

const Hljs = defineAsyncComponent(() => import('@/components/Hljs.vue'))
const MarkdownRender = defineAsyncComponent(() => import('@/components/MarkdownRender.vue'))

const props = defineProps<{
  item?: R2Object | null
}>()
const emit = defineEmits<{
  download: [item: R2Object]
  delete: [item: R2Object]
}>()

const bucket = useBucketStore()

const fileNameParts = computed(() => {
  return FileHelper.getSimpleFileInfoByObject(props.item)
})
const cdnUrl = computed(() => {
  if (!props.item) return ''
  return bucket.getCDNUrl(props.item)
})

const previewType = computed(() => FileHelper.getPreviewType(props.item))

const rawTextContent = ref<string | null>(null)
watch(
  computed(() => props.item),
  (item, prevItem) => {
    if (!item || item?.key === prevItem?.key) {
      return
    }
    rawTextContent.value = null
    const previewType = FileHelper.getPreviewType(item)
    if (['text', 'markdown'].includes(previewType)) {
      fetch(bucket.getCDNUrl(item))
        .then((response) => {
          if (response.ok) {
            return response.text()
          } else {
            throw new Error('Network response was not ok')
          }
        })
        .then((text) => {
          rawTextContent.value = text
        })
        .catch((error) => {
          console.error('Error fetching text:', error)
        })
    }
  },
  { immediate: true }
)

const nmessage = useMessage()
const handleCopyURL = () => {
  if (!props.item) return
  navigator.clipboard
    .writeText(bucket.getCDNUrl(props.item))
    .then(() => {
      nmessage.success('URL copied to clipboard')
    })
    .catch((error) => {
      console.error('Error copying URL:', error)
      nmessage.error('Failed to copy URL')
    })
}
</script>

<style scoped lang="sass"></style>
