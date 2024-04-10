<script setup>
import { computed } from 'vue'

const props = defineProps({
  contentType: {
    type: String,
    default: "",
  },
  thumbnail: {
    type: String,
    default: "",
  },
  size: {
    type: Number,
    default: 36,
  },
});

const computedIconImg = computed(() => {
  if (props.thumbnail) {
    return thumbnail;
  } else if (
    [
      'application/gzip',
      'application/vnd.rar',
      'application/zip',
    ].includes(props.contentType)
  ) {
    return 'https://unpkg.com/@tabler/icons@3.1.0/icons/outline/file-type-zip.svg'
  } else if (props.contentType === 'application/pdf') {
    return 'https://unpkg.com/@tabler/icons@3.1.0/icons/outline/file-type-pdf.svg'
  } else if (props.contentType.startsWith('video/')) {
    return 'https://unpkg.com/@tabler/icons@3.1.0/icons/outline/movie.svg'
  } else if (props.contentType.startsWith('audio/')) {
    return 'https://unpkg.com/@tabler/icons@3.1.0/icons/outline/file-music.svg'
  } else {
    return 'https://unpkg.com/@tabler/icons@3.1.0/icons/outline/file-unknown.svg'
  }
});
</script>

<template>
  <div class="file-icon">
    <img
      :src="computedIconImg"
      :width="size"
      :height="size"
      alt="Image"
      loading="lazy"
    />
  </div>
</template>
