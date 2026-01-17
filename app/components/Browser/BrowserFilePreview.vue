<template lang="pug">
.file-preview
  NSkeleton(v-if='!item', height='200px')
  .file-preview-main(v-else)
    .file-preview-file-container
      .preview-file-image.text-center.flex.justify-center(v-if='previewType === "image"')
        NImage.max-w-full(:src='cdnUrl', :alt='simpleInfo.name', object-fit='contain', class='max-h-[60vh]')
      .preview-file-video.text-center(v-else-if='previewType === "video"')
        video.w-full(:src='cdnUrl', controls, class='max-h-[60vh]')
      .preview-file-audio.text-center(v-else-if='previewType === "audio"')
        audio.w-full(:src='cdnUrl', controls)
      .preview-file-markdown(v-else-if='previewType === "markdown"')
        .overflow-auto.border.p-4.rounded.bg-white(
          v-if='rawTextContent !== null',
          class='min-h-[200px] max-h-[60vh] dark:bg-gray-900'
        )
          MarkdownRender(:value='rawTextContent', tag='div')
        .flex.justify-center.py-8(v-else)
          NSpin(show, size='small')
      .preview-file-text(v-else-if='previewType === "text"')
        .overflow-auto.p-4.rounded.bg-gray-50(
          v-if='rawTextContent !== null',
          class='min-h-[200px] max-h-[60vh] dark:bg-gray-900'
        )
          Hljs(:code='rawTextContent', :lang='simpleInfo.ext')
        .flex.justify-center.py-8(v-else)
          NSpin(show, size='small')
      .preview-file-iframe.text-center(v-else-if='previewType === "iframe" || previewType === "pdf"')
        iframe.w-full(:src='cdnUrl', class='h-[60vh]', frameborder='0')
      .preview-file-unknown.text-center.py-12(v-else)
        Icon.text-gray-400.mb-2(name='i-lucide-file-question', size='48')
        p.text-gray-500 Preview not supported

    .preview-actions.mt-6.text-center(v-if='showActions')
      NButtonGroup
        NButton(size='small', type='primary', @click='emit("download", item)')
          template(#icon): Icon(name='i-lucide-download')
          | Download
        NButton(size='small', type='info', @click='handleCopyURL')
          template(#icon): Icon(name='i-lucide-copy')
          | Copy URL
        NButton(size='small', type='error', @click='emit("delete", item)')
          template(#icon): Icon(name='i-lucide-trash')

    .preview-details.mt-6.flex.flex-col.gap-4(v-if='item && showDetails')
      NTable(size='small', striped)
        tbody
          tr
            th.w-32 Name
            td {{ simpleInfo.name }}
          tr
            th Size
            td {{ formatBytes(item.size) }}
          tr
            th Last Modified
            td {{ new Date(item.lastModified).toLocaleString() }}
          tr
            th Key
            td.break-all {{ item.key }}
          tr
            th Link
            td: a.text-primary-500.hover-underline(:href='cdnUrl', target='_blank') Open in new tab
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMessage, NImage, NSkeleton, NSpin, NTable, NButton, NButtonGroup } from 'naive-ui'
import { FileHelper } from '~/../shared/utils/file-helper'
import type { S3ObjectInfo } from '~/composables/bucket'
import MarkdownRender from '~/components/MarkdownRender.vue'
import Hljs from '~/components/Hljs.vue'

const props = withDefaults(
  defineProps<{
    item?: S3ObjectInfo | null
    bucketId: string
    showActions?: boolean
    showDetails?: boolean
  }>(),
  {
    showActions: true,
    showDetails: true,
  }
)

const emit = defineEmits<{
  download: [item: S3ObjectInfo]
  delete: [item: S3ObjectInfo]
}>()

const message = useMessage()

const simpleInfo = computed(() => {
  if (!props.item) return { name: '', ext: '' }
  return FileHelper.getSimpleFileInfo(props.item.key)
})

const cdnUrl = computed(() => {
  if (!props.item) return ''
  // Use the API route to proxy content
  return `/api/raw/${props.bucketId}/${props.item.key}`
})

const previewType = computed(() => {
  if (!props.item) return 'unknown'
  return FileHelper.getPreviewType(props.item.key)
})

const rawTextContent = ref<string | null>(null)
const formatBytes = FileHelper.formatBytes

watch(
  () => props.item?.key,
  async (newKey) => {
    if (!newKey || !props.item) {
      rawTextContent.value = null
      return
    }

    const type = FileHelper.getPreviewType(newKey)
    if (['text', 'markdown'].includes(type)) {
      rawTextContent.value = null
      try {
        const res = await fetch(cdnUrl.value)
        if (res.ok) {
          rawTextContent.value = await res.text()
        }
      } catch (e) {
        console.error('Failed to load text content', e)
      }
    }
  },
  { immediate: true }
)

const handleCopyURL = () => {
  if (!cdnUrl.value) return
  const fullUrl = window.location.origin + cdnUrl.value
  navigator.clipboard
    .writeText(fullUrl)
    .then(() => message.success('URL copied to clipboard'))
    .catch(() => message.error('Failed to copy URL'))
}
</script>

<style scoped>
/* Ensure images in preview don't overflow */
.preview-file-image :deep(img) {
  max-width: 100%;
}
</style>
