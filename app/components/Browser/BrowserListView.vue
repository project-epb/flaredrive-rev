<template lang="pug">
.browser-list-view
  NDataTable(:data='tableData', :columns='columns', :loading='loading')
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { NAvatar, NTag, NDropdown, NButton } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
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
  preview: [item: S3ObjectInfo]
  download: [item: S3ObjectInfo]
  delete: [item: S3ObjectInfo]
  rename: [item: S3ObjectInfo]
}>()

const { formatFileSize } = useFileHelper()

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
      label: '预览',
      key: 'preview',
      icon: () => renderIcon('i-lucide-eye'),
      props: {
        onClick: () => emit('preview', row as S3ObjectInfo),
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

const columns: DataTableColumns<BrowserItem> = [
  {
    title: '名称',
    key: 'name',
    render(row) {
      return h('div', { class: 'flex items-center gap-3' }, [
        h('div', { class: 'preview-cell flex items-center justify-center w-8' }, [
          row.thumbnailUrl
            ? h(NAvatar, { src: row.thumbnailUrl, size: 'small' })
            : renderIcon(row.icon, { class: 'text-2xl' }),
        ]),
        h(
          'div',
          {
            class: 'font-medium truncate cursor-pointer hover:underline min-w-0 flex-1',
            onClick: () => handleRowClick(row),
          },
          row.displayName
        ),
      ])
    },
  },
  {
    title: '大小',
    key: 'size',
    render(row) {
      return row.isFolder ? '-' : row.formattedSize
    },
  },
  {
    title: '类型',
    key: 'type',
    render(row) {
      const type = colorToType(row.badgeColor)
      return h(NTag, { type, size: 'small', bordered: false }, { default: () => row.typeLabel })
    },
  },
  {
    title: '修改时间',
    key: 'lastModified',
    render(row) {
      return row.isFolder ? '-' : row.formattedDate
    },
  },
  {
    title: '操作',
    key: 'actions',
    render(row) {
      if (row.isFolder) return null
      return h(
        NDropdown,
        {
          options: getActionOptions(row),
          trigger: 'click',
        },
        {
          default: () =>
            h(
              NButton,
              { size: 'small', quaternary: true, circle: true },
              {
                icon: () => renderIcon('i-lucide-more-horizontal'),
              }
            ),
        }
      )
    },
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
      typeLabel: '文件夹',
      badgeColor: 'warning',
    } as any)
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
    } as any)
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
    emit('preview', row as S3ObjectInfo)
  }
}
</script>

<style lang="scss" scoped>
.browser-list-view {
  //
}
</style>

<style lang="scss" scoped>
.browser-list-view {
  :deep(.preview-cell) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
