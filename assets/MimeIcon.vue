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
  filename: {
    type: String,
    default: "",
  },
  size: {
    type: Number,
    default: 36,
  },
});

const validExtIcons = [
    "bmp",
    "css",
    "csv",
    "doc",
    "docx",
    "html",
    "jpg",
    "js",
    "jsx",
    "pdf",
    "php",
    "png",
    "ppt",
    "rs",
    "sql",
    "svg",
    "ts",
    "tsx",
    "txt",
    "vue",
    "xls",
    "xml",
    "zip"
];

const computedIconImg = computed(() => {
  if (props.thumbnail) {
    return props.thumbnail;
  } else if (
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
    return 'https://unpkg.com/@tabler/icons@3.1.0/icons/outline/file-zip.svg'
  } else if (props.contentType === 'application/pdf') {
    return 'https://unpkg.com/@tabler/icons@3.1.0/icons/outline/file-type-pdf.svg'
  } else if (props.contentType.startsWith('video/')) {
    return 'https://unpkg.com/@tabler/icons@3.1.0/icons/outline/movie.svg'
  } else if (props.contentType.startsWith('audio/')) {
    return 'https://unpkg.com/@tabler/icons@3.1.0/icons/outline/file-music.svg'
  }

  const ext = props.filename.split('.').pop().toLowerCase();
  if (validExtIcons.includes(ext)) {
    return `https://unpkg.com/@tabler/icons@3.1.0/icons/outline/file-type-${ext}.svg`;
  }

  return 'https://unpkg.com/@tabler/icons@3.1.0/icons/outline/file-unknown.svg'
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
