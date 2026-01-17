<template lang="pug">
.browser-gallery-view
  .sort-controls.flex.justify-center.mb-6
    NButtonGroup
      NButton(
        v-for='item in sortOptions',
        :key='item.key',
        :type='sortBy === item.key ? "primary" : "default"',
        :secondary='sortBy !== item.key',
        @click='setSortBy(item.key)'
      )
        template(#icon, v-if='sortBy === item.key')
          Icon(:name='sortOrder === "asc" ? "i-lucide-arrow-up" : "i-lucide-arrow-down"')
        | {{ item.label }}

  .gallery-waterfall(v-if='!loading && sortedItems.length > 0')
    Waterfall(
      :list='sortedItems',
      :breakpoints='breakpoints',
      :gutter='16',
      background-color='transparent',
      ref='waterfallRef'
    )
      template(#item='{ item }')
        .gallery-item.mb-4(@click='handleItemClick(item)')
          NCard.h-full.cursor-pointer.transition-all.group(
            class='hover:shadow-lg hover:scale-102',
            content-style='padding: 0',
            hoverable,
            :bordered='false'
          )
            .item-preview.relative.overflow-hidden.rounded-t
              LazyImg.w-full.h-auto.object-cover.transition-transform(
                v-if='item.thumbnailUrl',
                :url='item.thumbnailUrl',
                class='group-hover:scale-105'
              )
              .folder-preview.flex.items-center.justify-center.bg-gray-100.py-12(
                v-else-if='item.isFolder',
                class='dark:bg-gray-800'
              )
                Icon.text-6xl.text-gray-400(name='i-lucide-folder')
              .file-preview.flex.items-center.justify-center.bg-gray-50.py-12(
                v-else,
                class='dark:bg-gray-900',
                :class='{ "aspect-square": !item.thumbnailUrl }'
              )
                Icon.text-6xl(:name='item.icon', :class='`text-${item.iconColor}-500`')

            .item-info.p-3
              .item-name.font-medium.break-all.mb-2.line-clamp-2 {{ item.displayName }}
              .item-meta.flex.items-center.justify-between.text-xs.text-gray-500(class='dark:text-gray-400')
                .item-type
                  NTag(:type='colorToType(item.badgeColor)', size='small', :bordered='false') {{ item.typeLabel }}
                .item-size(v-if='!item.isFolder') {{ item.formattedSize }}
              .item-date.text-xs.text-gray-400.mt-2(v-if='!item.isFolder', class='dark:text-gray-500') {{ item.formattedDate }}

            .item-actions.absolute.top-2.right-2(v-if='!item.isFolder', @click.stop)
              NDropdown(:options='getActionOptions(item)', trigger='click')
                NButton.backdrop-blur-sm(quaternary, size='small', circle, color='white', class='bg-black/20 hover:bg-black/40')
                  template(#icon)
                    Icon.text-white(name='i-lucide-more-horizontal')

  .flex.justify-center.py-20(v-else-if='loading')
    Icon.size-8.text-gray-400.animate-spin(name='i-lucide-loader')

  NAlert(v-else, type='info', title='暂无内容')
</template>

<script setup lang="ts">
import { h, resolveComponent, ref, computed } from 'vue'
import { NButton, NDropdown, NTag, NButtonGroup, NCard, NAlert } from 'naive-ui'
import { Waterfall, LazyImg } from 'vue-waterfall-plugin-next'
import 'vue-waterfall-plugin-next/dist/style.css'
import type { S3ObjectInfo, BrowserItem, UIBadgeColor } from '~/composables/bucket'
import { FileHelper } from '~/../shared/utils/file-helper'

interface Props {
  objects: S3ObjectInfo[]
  prefixes: string[]
  currentPrefix: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  navigate: [item: S3ObjectInfo | string]
  preview: [item: S3ObjectInfo]
  download: [item: S3ObjectInfo]
  delete: [item: S3ObjectInfo]
  rename: [item: S3ObjectInfo]
}>()

const { formatFileSize } = useFileHelper()
const route = useRoute()
const bucketId = computed(() => route.params.id as string)

// 排序控制
const sortBy = ref<'name' | 'size' | 'date'>('name')
const sortOrder = ref<'asc' | 'desc'>('asc')

const sortOptions = [
  { key: 'name' as const, label: '名称' },
  { key: 'size' as const, label: '大小' },
  { key: 'date' as const, label: '日期' },
]

const breakpoints = {
  3000: { rowPerView: 6 },
  1800: { rowPerView: 5 },
  1200: { rowPerView: 4 },
  800: { rowPerView: 3 },
  500: { rowPerView: 2 },
  0: { rowPerView: 1 },
}

function setSortBy(key: 'name' | 'size' | 'date') {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = key
    sortOrder.value = 'asc'
  }
}

const colorToType = (color: string): 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error' => {
  if (color === 'neutral') return 'default'
  return color as any
}

const renderIcon = (name: string, props = {}) => {
  return h(resolveComponent('Icon'), { name, ...props })
}

const getActionOptions = (row: BrowserItem) => {
  return [
    {
      label: '下载',
      key: 'download',
      icon: () => renderIcon('i-lucide-download'),
      props: {
        onClick: () => emit('download', row as S3ObjectInfo),
      },
    },
    {
      label: '重命名',
      key: 'rename',
      icon: () => renderIcon('i-lucide-pencil'),
      props: {
        onClick: () => emit('rename', row as S3ObjectInfo),
      },
    },
    {
      label: '删除',
      key: 'delete',
      icon: () => renderIcon('i-lucide-trash'),
      props: {
        onClick: () => emit('delete', row as S3ObjectInfo),
      },
    },
  ]
}

const sortedItems = computed(() => {
  const items: BrowserItem[] = []

  // 返回上级目录
  if (props.currentPrefix) {
    items.push({
      key: '../',
      displayName: '..',
      isFolder: true,
      icon: 'i-lucide-corner-up-left',
      iconColor: 'neutral',
      typeLabel: '上级',
      badgeColor: 'neutral',
      sortKey: '',
    } as any)
  }

  // 文件夹
  props.prefixes.forEach((prefix) => {
    const folderName = prefix.split('/').filter(Boolean).slice(-1)[0] || prefix
    items.push({
      key: prefix,
      displayName: folderName,
      isFolder: true,
      icon: 'i-lucide-folder',
      iconColor: 'warning',
      typeLabel: '文件夹',
      badgeColor: 'warning',
      sortKey: folderName,
    } as any)
  })

  // 文件
  props.objects.forEach((obj) => {
    const fileName = obj.key.split('/').slice(-1)[0] || ''
    const { icon, color } = getFileIcon(obj)
    const previewType = FileHelper.getPreviewType(obj.key)
    const isImage = previewType === 'image'
    const thumbnail = isImage ? `/api/raw/${bucketId.value}/${obj.key}` : undefined

    items.push({
      ...obj,
      displayName: fileName,
      isFolder: false,
      icon,
      iconColor: color,
      badgeColor: color,
      typeLabel: getFileType(obj),
      formattedSize: formatFileSize(obj.size),
      formattedDate: new Date(obj.lastModified).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
      thumbnailUrl: thumbnail,
      sortKey: fileName,
    } as any)
  })

  // 排序逻辑
  items.sort((a, b) => {
    if (a.key === '../') return -1
    if (b.key === '../') return 1

    if (a.isFolder && !b.isFolder) return -1
    if (!a.isFolder && b.isFolder) return 1

    let compareResult = 0
    if (sortBy.value === 'name') {
      compareResult = (a.sortKey || '').localeCompare(b.sortKey || '')
    } else if (sortBy.value === 'size') {
      const sizeA = a.isFolder ? 0 : (a as S3ObjectInfo).size || 0
      const sizeB = b.isFolder ? 0 : (b as S3ObjectInfo).size || 0
      compareResult = sizeA - sizeB
    } else if (sortBy.value === 'date') {
      const dateA = a.isFolder ? 0 : new Date((a as S3ObjectInfo).lastModified || 0).getTime()
      const dateB = b.isFolder ? 0 : new Date((b as S3ObjectInfo).lastModified || 0).getTime()
      compareResult = dateA - dateB
    }

    return sortOrder.value === 'asc' ? compareResult : -compareResult
  })

  return items
})

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

function getFileIcon(obj: S3ObjectInfo): { icon: string; color: UIBadgeColor } {
  const ext = getFileExtension(obj.key)
  const previewType = FileHelper.getPreviewType(obj.key)

  if (previewType === 'image') return { icon: 'i-lucide-image', color: 'success' }
  if (previewType === 'video') return { icon: 'i-lucide-video', color: 'primary' }
  if (previewType === 'audio') return { icon: 'i-lucide-music', color: 'primary' }
  if (previewType === 'text') return { icon: 'i-lucide-file-text', color: 'info' }
  if (previewType === 'markdown') return { icon: 'i-lucide-file-text', color: 'info' }
  if (previewType === 'iframe') return { icon: 'i-lucide-file-type', color: 'error' }

  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { icon: 'i-lucide-file-archive', color: 'warning' }
  }

  return { icon: 'i-lucide-file', color: 'neutral' }
}

function getFileType(obj: S3ObjectInfo): string {
  return getFileExtension(obj.key).toUpperCase() || '文件'
}

function handleItemClick(item: BrowserItem) {
  if (item.isFolder) {
    emit('navigate', item.key === '../' ? '..' : item.key)
  } else {
    emit('preview', item as S3ObjectInfo)
  }
}
</script>

<style lang="scss" scoped>
.browser-gallery-view {
  :deep(.vue-waterfall-plugin-next__item) {
    margin-bottom: 20px;
  }
}
</style>
