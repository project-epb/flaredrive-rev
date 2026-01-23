<template lang="pug">
.browser-gallery-view
  .sort-actions(flex, justify-center, mb-4)
    NButtonGroup
      NButton(
        v-for='item in sortActions',
        :key='item.key',
        :type='item.active ? "primary" : "default"',
        icon-placement='right',
        secondary,
        @click='item.onClick'
      ) 
        template(#icon, v-if='item.icon'): component(:is='item.icon')
        | {{ item.label }}

  .placeholder(v-if='list.length <= 0 && isLoading')
    .grid(grid-cols-4, gap-3)
      NSkeleton(v-for='_ in 20', h-200px, rounded-lg)

  Waterfall(
    v-else,
    ref='waterfallRef',
    :list='list',
    :breakpoints='{ 9999: { rowPerView: 5 }, 1160: { rowPerView: 4 }, 900: { rowPerView: 3 }, 580: { rowPerView: 2 }, 360: { rowPerView: 1 } }',
    :has-around-gutter='false',
    :delay='100',
    :animation-delay='150',
    :animation-duration='500',
    :pos-duration='150',
    min-h='50vh'
  )
    template(#item='{ item, url, index }')
      NCard.file-item-card(
        @click='onClickItem(item)',
        :content-style='{ padding: 0 }',
        :style='item.key === "/" ? { opacity: "50%", pointerEvents: "none" } : { cursor: "pointer" }',
        overflow-hidden
      )
        template(#cover)
          NImage(
            v-if='item.previewType === "image"',
            @click.stop,
            @load='resizeWaterfall',
            :src='bucket.getThumbnailUrl(item, 400, 400)',
            :preview-src='item.cdnUrl',
            :alt='item.key',
            w-full,
            h-auto,
            max-h-60vh,
            loading='lazy',
            lazy,
            inline-flex,
            leading-0,
            :width='item?.customMetadata?.width || undefined',
            :height='item?.customMetadata?.height || undefined'
          )
          .folder-icon-wrapper(v-else, flex, items-center, justify-center, py-6, bg='gray-100 dark:gray-800')
            component(:is='item.icon', w='64px', h='64px', opacity-60)
        template(#default)
          .p-4
            NEllipsis(text-4, max-w-full) {{ item.key === '/' ? '/(root)' : item.key.replace(payload.prefix, '').replace(/\/$/, '') }}
            .flex(items-center)
              .file-info.flex-1
                NText(v-if='item.key.endsWith("/")', depth='3', block, text-3) {{ item.key === '/' ? 'root' : item.key === '../' ? 'parent' : 'folder' }}
                NText(v-if='!item.key.endsWith("/")', depth='3', block, text-3) {{ new Date(item.uploaded || 0).toLocaleString() }}
                NText(v-if='!item.key.endsWith("/")', depth='3', block, text-3) {{ FileHelper.formatFileSize(item.size) }}
              .file-actions(v-if='!item.key.endsWith("/")', @click.stop)
                NDropdown(:options='fileActionOptions', @select='(action) => onSelectAction(action, item)')
                  NButton(secondary, :render-icon='() => h(IconDots)', circle, size='small')
</template>

<script setup lang="tsx">
import type { StorageListObject, StorageListResult } from '@/models/BucketClient'
import { FileHelper } from '@/utils/FileHelper'
import {
  IconDots,
  IconDownload,
  IconForms,
  IconLink,
  IconSortAscending,
  IconSortDescending,
  IconTrash,
} from '@tabler/icons-vue'
import { useMessage } from 'naive-ui'
import type { Component } from 'vue'
import { Waterfall } from 'vue-waterfall-plugin-next'
import 'vue-waterfall-plugin-next/dist/style.css'
import type { GallerySortBy } from '@/stores/prefs'

const props = defineProps<{
  payload: StorageListResult
  isLoading?: boolean
}>()

const emit = defineEmits<{
  rename: [item: StorageListObject]
  delete: [item: StorageListObject]
  download: [item: StorageListObject]
  navigate: [item: StorageListObject]
}>()

const nmessage = useMessage()

const bucket = useBucketStore()

const prefs = usePrefsStore()
const { gallerySortBy: sortBy, gallerySortOrder: sortOrder } = storeToRefs(prefs)
const changeSort = (key: GallerySortBy) => {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'ascend' ? 'descend' : 'ascend'
  } else {
    sortBy.value = key
    sortOrder.value = 'ascend'
  }
}
const sortActions = computed(() => {
  return [
    { label: 'Name', key: 'key', onClick: () => changeSort('key') },
    { label: 'Size', key: 'size', onClick: () => changeSort('size') },
    { label: 'Date', key: 'uploaded', onClick: () => changeSort('uploaded') },
  ].map((item) => {
    return {
      ...item,
      active: item.key === sortBy.value,
      icon:
        item.key === sortBy.value ? (sortOrder.value === 'ascend' ? IconSortAscending : IconSortDescending) : undefined,
    }
  })
})

const list = computed<
  (StorageListObject & {
    cdnUrl?: string
    icon?: Component
    previewType?: ReturnType<typeof FileHelper.getPreviewType>
  })[]
>(() => {
  if (!props.payload) return [] as any
  return [
    props.payload.prefix === '' ? FileHelper.createNullObject('/') : FileHelper.createNullObject('../'),
    ...props.payload.folders.map(FileHelper.createNullObject),
    ...props.payload.objects.sort((a, b) => {
      if (sortBy.value === 'key') {
        return sortOrder.value === 'ascend' ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key)
      } else if (sortBy.value === 'size') {
        return sortOrder.value === 'ascend' ? a.size - b.size : b.size - a.size
      } else if (sortBy.value === 'uploaded') {
        const aDate = new Date(a.uploaded || 0).getTime()
        const bDate = new Date(b.uploaded || 0).getTime()
        return sortOrder.value === 'ascend' ? aDate - bDate : bDate - aDate
      }
      return 0
    }),
  ].map(
    (
      item: StorageListObject & {
        cdnUrl?: string
        icon?: Component
        previewType?: ReturnType<typeof FileHelper.getPreviewType>
      }
    ) => {
      item.cdnUrl = bucket.getCDNUrl(item)
      item.previewType = FileHelper.getPreviewType(item)
      item.icon = FileHelper.getObjectIcon(item)
      return item
    }
  )
})

const waterfallRef = useTemplateRef('waterfallRef')
const resizeWaterfall = () => {
  waterfallRef.value?.renderer()
}
useEventListener('resize', resizeWaterfall)
watch(
  computed(() => list.value.length),
  () => {
    nextTick(() => {
      resizeWaterfall()
    })
  }
)

function onClickItem(item: StorageListObject) {
  emit('navigate', item)
}
const fileActionOptions = ref([
  {
    label: 'Copy URL',
    key: 'copy_url',
    icon: () => <IconLink />,
  },
  { label: 'Download', key: 'download', icon: () => <IconDownload /> },
  { label: 'Rename', key: 'rename', icon: () => <IconForms /> },
  { label: () => <NText type="error">Delete</NText>, key: 'delete', icon: () => <IconTrash /> },
])
const onSelectAction = (action: string, item: StorageListObject) => {
  switch (action) {
    case 'copy_url':
      navigator.clipboard
        .writeText(bucket.getCDNUrl(item))
        .then(() => {
          nmessage.success('URL copied to clipboard')
        })
        .catch((err) => {
          nmessage.error('Failed to copy URL')
        })
      break
    case 'download':
      emit('download', item)
      break
    case 'rename':
      emit('rename', item)
      break
    case 'delete':
      emit('delete', item)
      break
  }
}
</script>

<style scoped lang="sass">
:deep(.waterfall-list)
  background-color: transparent

.file-item-card
  :deep(.n-card-cover)
    line-height: 0
    img
      transition: transform 0.25s ease-in-out
    &:hover
      img
        transform: scale(1.05)
</style>
