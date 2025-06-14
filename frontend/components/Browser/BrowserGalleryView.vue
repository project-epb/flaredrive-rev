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

  Waterfall(
    v-if='list.length > 0',
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
      NCard(
        :key='item.key',
        @click='onClickItem(item)',
        :content-style='{ padding: 0 }',
        :style='item.key === "/" ? { opacity: "50%", pointerEvents: "none" } : { cursor: "pointer" }',
        overflow-hidden
      )
        .file-thumbnail
          img(
            v-if='item.thumbnailUrl',
            @load='resizeWaterfall',
            :src='item.thumbnailUrl',
            :alt='item.key',
            w-full,
            h-auto,
            max-h-60vh,
            loading='lazy',
            :width='item?.customMetadata?.width || undefined',
            :height='item?.customMetadata?.height || undefined'
          )
          component(v-else, :is='item.icon', w='full', h='auto')
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

  NSkeleton(v-if='list.length === 0', h-200px)
</template>

<script setup lang="ts">
import type { R2BucketListResponse } from '@/models/R2BucketClient'
import { FileHelper } from '@/utils/FileHelper'
import type { R2Object } from '@cloudflare/workers-types/2023-07-01'
import { IconDots, IconSortAscending, IconSortDescending } from '@tabler/icons-vue'
import { useMessage } from 'naive-ui'
import type { Component } from 'vue'
import { Waterfall } from 'vue-waterfall-plugin-next'
import 'vue-waterfall-plugin-next/dist/style.css'

const props = defineProps<{
  payload: R2BucketListResponse
}>()

const emit = defineEmits<{
  rename: [item: R2Object]
  delete: [item: R2Object]
  download: [item: R2Object]
  navigate: [item: R2Object]
}>()

const nmessage = useMessage()

const bucket = useBucketStore()

const sortBy = useLocalStorage<'key' | 'size' | 'uploaded'>('flaredrive:gallery/sort-by', 'key')
const sortOrder = useLocalStorage<'ascend' | 'descend'>('flaredrive:gallery/sort-order', 'ascend')
const changeSort = (key: 'key' | 'size' | 'uploaded') => {
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
  (R2Object & {
    thumbnailUrl?: string
    icon?: Component
  })[]
>(() => {
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
      item: R2Object & {
        thumbnailUrl?: string
        icon?: Component
      }
    ) => {
      const thumb = bucket.getThumbnailUrls(item)
      if (thumb) {
        item.thumbnailUrl = thumb.medium
      }
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

function onClickItem(item: R2Object) {
  emit('navigate', item)
}
const fileActionOptions = ref([
  { label: 'Copy URL', key: 'copy_url' },
  { label: 'Download', key: 'download' },
  { label: 'Rename', key: 'rename' },
  { label: 'Delete', key: 'delete' },
])
const onSelectAction = (action: string, item: R2Object) => {
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

:deep(.file-thumbnail)
  overflow: hidden
  img
    transition: transform 0.25s ease-in-out
  &:hover
    img
      transform: scale(1.1)
</style>
