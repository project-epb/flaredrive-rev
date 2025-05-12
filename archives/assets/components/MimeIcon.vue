<script setup>
import { computed } from 'vue'
import TablerIcon from './TablerIcon.vue'

const props = defineProps({
  contentType: {
    type: String,
    default: '',
  },
  thumbnail: {
    type: String,
    default: '',
  },
  filename: {
    type: String,
    default: '',
  },
  size: {
    type: Number,
    default: 36,
  },
})

const validExtIcons = [
  'bmp',
  'css',
  'csv',
  'doc',
  'docx',
  'html',
  'jpg',
  'js',
  'jsx',
  'pdf',
  'php',
  'png',
  'ppt',
  'rs',
  'sql',
  'svg',
  'ts',
  'tsx',
  'txt',
  'vue',
  'xls',
  'xml',
  'zip',
]

const computedIconName = computed(() => {
  if (
    [
      'application/gzip',
      'application/vnd.rar',
      'application/zip',
      'application/x-7z-compressed',
      'application/x-bzip',
      'application/x-bzip2',
      'application/x-tar',
      'application/x-xz',
    ].includes(props.contentType)
  ) {
    return 'file-zip'
  } else if (props.contentType === 'application/pdf') {
    return 'file-type-pdf'
  } else if (props.contentType.startsWith('video/')) {
    return 'movie'
  } else if (props.contentType.startsWith('audio/')) {
    return 'file-music'
  }

  const ext = props.filename.split('.').pop().toLowerCase()
  if (validExtIcons.includes(ext)) {
    return `file-type-${ext}`
  }

  return 'file-unknown'
})
</script>

<template>
  <div class="file-icon">
    <img
      v-if="props.thumbnail"
      :src="props.thumbnail"
      :width="size"
      :height="size"
      alt="Image"
      loading="lazy"
    />
    <TablerIcon v-else :name="computedIconName" :size="size" loading="lazy" />
  </div>
</template>
