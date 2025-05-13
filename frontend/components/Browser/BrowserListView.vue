<template lang="pug">
.browser-list-view
  NDataTable(
    :columns='columns',
    :data='tableData',
    :row-key='(row) => row.key',
    :row-props='(row) => ({ onClick: () => handleRowClick(row), style: row.key === "/" ? { opacity: "50%", pointerEvents: "none" } : { cursor: "pointer" } })',
    bordered,
    hoverable
  )
</template>

<script setup lang="tsx">
import type { R2BucketListResponse } from '@/models/R2BucketClient'
import { FileHelper } from '@/utils/FileHelper'
import type { R2Object } from '@cloudflare/workers-types/2023-07-01'
import { IconDots } from '@tabler/icons-vue'
import { NButton, NDropdown, NIcon, NImage, useMessage } from 'naive-ui'
import type { TableColumns } from 'naive-ui/es/data-table/src/interface'

const props = withDefaults(
  defineProps<{
    payload: R2BucketListResponse
    noActions?: boolean
    noFolder?: boolean
    defaultSortBy?: string
    defaultSortOrder?: 'ascend' | 'descend'
  }>(),
  {
    noActions: false,
    noFolder: false,
    defaultSortBy: 'key',
    defaultSortOrder: 'ascend',
  }
)

const bucket = useBucketStore()
const nmessage = useMessage()

const emit = defineEmits<{
  rename: [item: R2Object]
  delete: [item: R2Object]
  download: [item: R2Object]
  navigate: [item: R2Object]
}>()

const columns = computed(() => {
  if (!props.payload) return [] as TableColumns<R2Object>
  const cols = [
    {
      title: '',
      key: '_preview',
      width: 40,
      render: (row: R2Object) => {
        const thumbs = bucket.getThumbnailUrls(row, true)
        if (thumbs) {
          return <NImage width={40} height={40} objectFit="cover" lazy src={thumbs.square} previewDisabled={true} />
        }
        const FileIcon = FileHelper.getObjectIcon(row)
        return (
          <NIcon size={40}>
            <FileIcon />
          </NIcon>
        )
      },
    },
    {
      title: 'Name',
      key: 'key',
      minWidth: 200,
      render: (row: R2Object) => {
        if (row.key === '/') return '/'
        return row.key.replace(props.payload!.prefix, '').replace(/\/$/, '')
      },
      sorter: (a: R2Object, b: R2Object) => {
        // 文件夹不参与排序
        if (a.key.endsWith('/') || b.key.endsWith('/')) {
          return 0
        }
        return a.key.localeCompare(b.key)
      },
    },
    {
      title: 'Size',
      key: 'size',
      align: 'center',
      minWidth: 100,
      render: (row: R2Object) => {
        if (row.key.endsWith('/')) return '-'
        return FileHelper.formatFileSize(row.size)
      },
      sorter: (a: R2Object, b: R2Object) => {
        // 文件夹不参与排序
        if (a.key.endsWith('/') || b.key.endsWith('/')) {
          return 0
        }
        return a.size - b.size
      },
    },
    {
      title: 'Type',
      key: 'httpMetadata.contentType',
      align: 'center',
      minWidth: 100,
      render: (row: R2Object) => {
        if (row.key === '/') return 'root'
        if (row.key === '../') return 'parent'
        if (row.key.endsWith('/')) return 'folder'
        return row.httpMetadata?.contentType || '?'
      },
      filter(value, row) {
        return row.httpMetadata?.contentType?.startsWith(value.toString()) || false
      },
      defaultFilterOptionValue: null,
      filterOptions: [
        {
          label: 'Images',
          key: 'image/',
        },
      ],
    },
    {
      title: 'Last Modified',
      key: 'uploaded',
      align: 'center',
      render: (row: R2Object) => {
        if (row.key.endsWith('/')) return ''
        return new Date(row.uploaded).toLocaleString()
      },
      sorter: (a: R2Object, b: R2Object) => {
        // 文件夹不参与排序
        if (a.key.endsWith('/') || b.key.endsWith('/')) {
          return 0
        }
        return new Date(a.uploaded).getTime() - new Date(b.uploaded).getTime()
      },
    },
  ] as TableColumns<R2Object>
  if (!props.noActions) {
    // selection
    // cols.unshift({
    //   type: 'selection',
    //   disabled(row) {
    //     return row.key.endsWith('/')
    //   },
    //   cellProps(row) {
    //     return {
    //       onClick(e) {
    //         e.stopPropagation()
    //       },
    //       style: row.key.endsWith('/') ? { opacity: '0%', pointerEvents: 'none' } : {},
    //     }
    //   },
    // })
    // actions
    cols.push({
      title: '',
      key: '_actions',
      align: 'center',
      cellProps() {
        return {
          onClick(e) {
            e.stopPropagation()
          },
        }
      },
      render: (row: R2Object) => {
        if (row.key.endsWith('/')) return ''
        const onSelect = (key: string) => {
          switch (key) {
            case 'copy_url':
              const url = bucket.getCDNUrl(row)
              navigator.clipboard
                .writeText(url)
                .then(() => {
                  nmessage.success('URL copied to clipboard')
                })
                .catch((err) => {
                  nmessage.error('Failed to copy URL')
                })
              break
            case 'download':
              emit('download', row)
              break
            case 'rename':
              emit('rename', row)
              break
            case 'delete':
              emit('delete', row)
              break
          }
        }
        return (
          <div>
            <NDropdown
              options={[
                { label: 'Copy URL', key: 'copy_url' },
                { label: 'Download', key: 'download' },
                { label: 'Rename', key: 'rename' },
                { label: 'Delete', key: 'delete' },
              ]}
              onSelect={onSelect}
            >
              <NButton secondary size="small" circle renderIcon={() => <IconDots></IconDots>}></NButton>
            </NDropdown>
          </div>
        )
      },
      width: 50,
    })
  }
  if (props.defaultSortBy) {
    const col = cols.find((col: any) => col.key === props.defaultSortBy)
    if (col) {
      // @ts-ignore
      col.defaultSortOrder = props.defaultSortOrder || 'ascend'
    }
  }
  return cols
})
const isROOT = computed(() => {
  return props.payload?.prefix === ''
})
const tableData = computed(() => {
  let list = props.payload?.objects || []
  if (!props.noFolder) {
    if (props.payload?.folders) {
      list = [...props.payload.folders.map(FileHelper.createNullObject), ...list]
    }
    if (isROOT.value) {
      list = [FileHelper.createNullObject('/'), ...list]
    } else {
      list = [FileHelper.createNullObject('../'), ...list]
    }
  }
  return list
})
const handleRowClick = (row: R2Object) => {
  emit('navigate', row)
}
</script>

<style scoped lang="sass">
:deep(.n-data-table-thead > .n-data-table-tr)
  white-space: nowrap
</style>
