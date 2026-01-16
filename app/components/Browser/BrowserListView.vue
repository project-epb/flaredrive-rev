<template lang="pug">
.browser-list-view
  UTable(:data='tableData', :columns='columns')
    template(#name-cell='{ row }')
      .flex.items-center.gap-3
        .preview-cell
          UAvatar(
            v-if='row.original.thumbnailUrl',
            :src='row.original.thumbnailUrl',
            size='md',
            :alt='row.original.displayName'
          )
          UIcon.text-2xl(v-else, :name='row.original.icon')
        .min-w-0.flex-1
          .font-medium.truncate.cursor-pointer(class='hover:underline', @click='handleRowClick(row.original)') {{ row.original.displayName }}

    template(#size-cell='{ row }')
      span(v-if='!row.original.isFolder') {{ row.original.formattedSize }}
      span.text-gray-400(v-else) -

    template(#type-cell='{ row }')
      UBadge(:color='row.original.badgeColor', variant='subtle', size='xs') {{ row.original.typeLabel }}

    template(#lastModified-cell='{ row }')
      span(v-if='!row.original.isFolder') {{ row.original.formattedDate }}
      span.text-gray-400(v-else) -

    template(#actions-cell='{ row }')
      .flex.items-center.justify-end.gap-2(v-if='!row.original.isFolder', @click.stop)
        UDropdownMenu(:items='getActionItems(row.original)')
          UButton(color='neutral', variant='ghost', icon='i-lucide-more-horizontal', size='xs')
</template>

<script setup lang="ts">
import type { S3ObjectInfo, BrowserItem, UIBadgeColor } from '~/composables/bucket'

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

const columns = [
  {
    accessorKey: 'name',
    header: '名称',
  },
  {
    accessorKey: 'size',
    header: '大小',
  },
  {
    accessorKey: 'type',
    header: '类型',
  },
  {
    accessorKey: 'lastModified',
    header: '修改时间',
  },
  {
    id: 'actions',
  },
]

const tableData = computed(() => {
  const items: BrowserItem[] = []

  // 返回上级目录
  if (props.currentPrefix) {
    items.push({
      key: '../',
      displayName: '..',
      isFolder: true,
      icon: 'i-lucide-corner-up-left',
      typeLabel: '上级目录',
      badgeColor: 'neutral',
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
      typeLabel: '文件夹',
      badgeColor: 'warning',
    })
  })

  // 文件
  props.objects.forEach((obj) => {
    const fileName = obj.key.split('/').slice(-1)[0] || ''
    const { icon, color } = getFileIcon(obj)

    items.push({
      ...obj,
      name: fileName,
      displayName: fileName,
      isFolder: false,
      icon,
      badgeColor: color,
      type: getFileType(obj),
      typeLabel: getFileType(obj),
      formattedSize: formatFileSize(obj.size),
      formattedDate: new Date(obj.lastModified).toLocaleString('zh-CN'),
      thumbnailUrl: getThumbnailUrl(obj),
    })
  })

  return items
})

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

function getFileIcon(obj: S3ObjectInfo): { icon: string; color: UIBadgeColor } {
  // 由于列表 API 不返回 content-type，我们需要根据扩展名推断
  const ext = getFileExtension(obj.key)

  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']
  const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv']
  const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac']
  const textExts = ['txt', 'md', 'json', 'xml', 'yml', 'yaml', 'css', 'html', 'js', 'ts']

  if (imageExts.includes(ext)) {
    return { icon: 'i-lucide-image', color: 'success' }
  }
  if (videoExts.includes(ext)) {
    return { icon: 'i-lucide-video', color: 'primary' }
  }
  if (audioExts.includes(ext)) {
    return { icon: 'i-lucide-music', color: 'primary' }
  }
  if (textExts.includes(ext)) {
    return { icon: 'i-lucide-file-text', color: 'info' }
  }
  if (ext === 'pdf') {
    return { icon: 'i-lucide-file-type', color: 'error' }
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { icon: 'i-lucide-file-archive', color: 'warning' }
  }

  return { icon: 'i-lucide-file', color: 'neutral' }
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

function handleRowClick(row: BrowserItem) {
  if (row.isFolder) {
    emit('navigate', row.key === '../' ? '..' : row.key)
  } else {
    emit('navigate', row as S3ObjectInfo)
  }
}

function getActionItems(row: BrowserItem) {
  return [
    [
      {
        label: '下载',
        icon: 'i-lucide-download',
        onSelect: () => emit('download', row as S3ObjectInfo),
      },
      {
        label: '重命名',
        icon: 'i-lucide-pencil',
        onSelect: () => emit('rename', row as S3ObjectInfo),
      },
      {
        label: '删除',
        icon: 'i-lucide-trash',
        onSelect: () => emit('delete', row as S3ObjectInfo),
      },
    ],
  ]
}
</script>

<style lang="scss" scoped>
.browser-list-view {
  :deep(.preview-cell) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
