<template lang="pug">
.browser-gallery-view
  .sort-controls.flex.justify-center.mb-6
    UFieldGroup(size='sm', orientation='horizontal')
      UButton(
        v-for='item in sortOptions',
        :key='item.key',
        :color='sortBy === item.key ? "primary" : "neutral"',
        :variant='sortBy === item.key ? "solid" : "subtle"',
        @click='setSortBy(item.key)'
      )
        template(#leading, v-if='sortBy === item.key')
          UIcon(:name='sortOrder === "asc" ? "i-lucide-arrow-up" : "i-lucide-arrow-down"')
        | {{ item.label }}

  .gallery-grid(v-if='!loading && sortedItems.length > 0')
    .gallery-item(v-for='item in sortedItems', :key='item.key', @click='handleItemClick(item)')
      UCard.h-full.cursor-pointer.transition-all(class='hover:shadow-lg hover:scale-102', :ui='{ body: { padding: "p-0" } }')
        .item-preview.relative.overflow-hidden
          img.w-full.h-auto.object-cover.transition-transform(
            v-if='item.thumbnailUrl',
            :src='item.thumbnailUrl',
            :alt='item.displayName',
            loading='lazy',
            class='hover:scale-105'
          )
          .folder-preview.flex.items-center.justify-center.bg-gray-100.py-12(
            v-else-if='item.isFolder',
            class='dark:bg-gray-800'
          )
            UIcon.text-6xl.text-gray-400(name='i-lucide-folder')
          .file-preview.flex.items-center.justify-center.bg-gray-50.py-12(v-else, class='dark:bg-gray-900')
            UIcon.text-6xl(:name='item.icon', :class='`text-${item.iconColor}-500`')

        .item-info.p-4
          .item-name.font-medium.truncate.mb-2 {{ item.displayName }}
          .item-meta.flex.items-center.justify-between.text-sm.text-gray-500(class='dark:text-gray-400')
            .item-type
              UBadge(:color='item.badgeColor', variant='subtle', size='xs') {{ item.typeLabel }}
            .item-size(v-if='!item.isFolder') {{ item.formattedSize }}
          .item-date.text-xs.text-gray-400.mt-2(v-if='!item.isFolder', class='dark:text-gray-500') {{ item.formattedDate }}

        .item-actions.absolute.top-2.right-2(v-if='!item.isFolder', @click.stop)
          UDropdownMenu(:items='getActionItems(item)')
            UButton(color='neutral', variant='outline', icon='i-lucide-more-horizontal', size='xs')

  .flex.justify-center.py-20(v-else-if='loading')
    UIcon.size-8.text-gray-400.animate-spin(name='i-lucide-loader')

  UAlert(v-else, icon='i-lucide-image-off', color='gray', variant='subtle', title='暂无内容')
</template>

<script setup lang="ts">
import type { S3ObjectInfo } from '~/composables/bucket'

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
  download: [item: S3ObjectInfo]
  delete: [item: S3ObjectInfo]
  rename: [item: S3ObjectInfo]
}>()

const { formatFileSize } = useFileHelper()

// 排序控制
const sortBy = ref<'name' | 'size' | 'date'>('name')
const sortOrder = ref<'asc' | 'desc'>('asc')

const sortOptions = [
  { key: 'name' as const, label: '名称' },
  { key: 'size' as const, label: '大小' },
  { key: 'date' as const, label: '日期' },
]

function setSortBy(key: 'name' | 'size' | 'date') {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = key
    sortOrder.value = 'asc'
  }
}

const sortedItems = computed(() => {
  const items: any[] = []

  // 返回上级目录
  if (props.currentPrefix) {
    items.push({
      key: '../',
      displayName: '..',
      isFolder: true,
      icon: 'i-lucide-corner-up-left',
      iconColor: 'gray',
      typeLabel: '上级',
      badgeColor: 'gray',
      sortKey: '',
    })
  }

  // 文件夹
  props.prefixes.forEach((prefix) => {
    const folderName = prefix.split('/').filter(Boolean).slice(-1)[0] || prefix
    items.push({
      key: prefix,
      displayName: folderName,
      isFolder: true,
      icon: 'i-lucide-folder',
      iconColor: 'amber',
      typeLabel: '文件夹',
      badgeColor: 'amber',
      sortKey: folderName,
    })
  })

  // 文件
  props.objects.forEach((obj) => {
    const fileName = obj.key.split('/').slice(-1)[0]
    const { icon, color } = getFileIcon(obj)

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
      thumbnailUrl: getThumbnailUrl(obj),
      sortKey: fileName,
    })
  })

  // 排序
  const sorted = items.sort((a, b) => {
    // 上级目录始终在最前
    if (a.key === '../') return -1
    if (b.key === '../') return 1

    // 文件夹在文件之前
    if (a.isFolder && !b.isFolder) return -1
    if (!a.isFolder && b.isFolder) return 1

    // 根据选择的排序方式
    let compareValue = 0
    if (sortBy.value === 'name') {
      compareValue = a.sortKey.localeCompare(b.sortKey, 'zh-CN')
    } else if (sortBy.value === 'size' && !a.isFolder && !b.isFolder) {
      compareValue = (a.size || 0) - (b.size || 0)
    } else if (sortBy.value === 'date' && !a.isFolder && !b.isFolder) {
      compareValue = new Date(a.lastModified || 0).getTime() - new Date(b.lastModified || 0).getTime()
    }

    return sortOrder.value === 'asc' ? compareValue : -compareValue
  })

  return sorted
})

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

function getFileIcon(obj: S3ObjectInfo) {
  const ext = getFileExtension(obj.key)

  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']
  const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv']
  const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac']
  const textExts = ['txt', 'md', 'json', 'xml', 'yml', 'yaml', 'css', 'html', 'js', 'ts']

  if (imageExts.includes(ext)) {
    return { icon: 'i-lucide-image', color: 'green' }
  }
  if (videoExts.includes(ext)) {
    return { icon: 'i-lucide-video', color: 'purple' }
  }
  if (audioExts.includes(ext)) {
    return { icon: 'i-lucide-music', color: 'pink' }
  }
  if (textExts.includes(ext)) {
    return { icon: 'i-lucide-file-text', color: 'blue' }
  }
  if (ext === 'pdf') {
    return { icon: 'i-lucide-file-type', color: 'red' }
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { icon: 'i-lucide-file-archive', color: 'orange' }
  }

  return { icon: 'i-lucide-file', color: 'gray' }
}

function getFileType(obj: S3ObjectInfo): string {
  const ext = getFileExtension(obj.key)

  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']
  const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv']
  const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac']

  if (imageExts.includes(ext)) return '图片'
  if (videoExts.includes(ext)) return '视频'
  if (audioExts.includes(ext)) return '音频'
  if (ext === 'txt') return '文本'
  if (ext === 'md') return 'Markdown'
  if (ext === 'pdf') return 'PDF'
  if (ext === 'zip' || ext === 'rar') return '压缩包'

  return ext.toUpperCase() || '文件'
}

function getThumbnailUrl(obj: S3ObjectInfo): string | undefined {
  // TODO: 实现缩略图逻辑
  return undefined
}

function handleItemClick(item: any) {
  if (item.isFolder) {
    emit('navigate', item.key === '../' ? '..' : item.key)
  } else {
    emit('navigate', item)
  }
}

function getActionItems(item: any) {
  return [
    [
      {
        label: '下载',
        icon: 'i-lucide-download',
        click: () => emit('download', item),
      },
      {
        label: '重命名',
        icon: 'i-lucide-pencil',
        click: () => emit('rename', item),
      },
      {
        label: '删除',
        icon: 'i-lucide-trash',
        click: () => emit('delete', item),
      },
    ],
  ]
}
</script>

<style lang="scss" scoped>
.browser-gallery-view {
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1.5rem;

    @media (max-width: 640px) {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 1rem;
    }
  }

  .gallery-item {
    .item-preview {
      aspect-ratio: 4 / 3;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .item-actions {
      opacity: 0;
      transition: opacity 0.2s;
    }

    &:hover .item-actions {
      opacity: 1;
    }
  }
}
</style>
