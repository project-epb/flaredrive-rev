<template lang="pug">
.browser-list-view
  .placeholder(v-if='!payload && isLoading')
    NCard
      .grid(grid-cols-1, gap-3)
        NSkeleton(v-for='_ in 10', h-50px, rounded-lg)
  NDataTable(
    :columns='columns',
    :data='tableData',
    :row-key='(row) => row.key',
    :row-props='(row) => ({ onClick: () => handleRowClick(row), style: row.key === "/" ? { opacity: "50%", pointerEvents: "none" } : { cursor: "pointer" } })',
    bordered,
    hoverable,
    :loading='isLoading'
  )
</template>

<script setup lang="tsx">
import type { StorageListObject, StorageListResult } from '@/models/BucketClient'
import { FileHelper } from '@/utils/FileHelper'
import { ClipboardHelper } from '@/utils/ClipboardHelper'
import { DateHelper } from '@/utils/DateHelper'
import { IconDots, IconDownload, IconForms, IconLink, IconTrash, IconWorld, IconWorldOff } from '@tabler/icons-vue'
import { NButton, NDropdown, NIcon, NImage, useMessage } from 'naive-ui'
import type { TableColumns } from 'naive-ui/es/data-table/src/interface'
import { useBucketStore } from '@/stores/bucket'
import type { SortOrder } from '@/stores/prefs'

const props = withDefaults(
  defineProps<{
    payload?: StorageListResult
    isLoading?: boolean
    noActions?: boolean
    noFolder?: boolean
    defaultSortBy?: string
    defaultSortOrder?: SortOrder
  }>(),
  {
    noActions: false,
    noFolder: false,
  }
)

const bucket = useBucketStore()
const nmessage = useMessage()

const emit = defineEmits<{
  rename: [item: StorageListObject]
  delete: [item: StorageListObject]
  download: [item: StorageListObject]
  navigate: [item: StorageListObject]
  togglePublic: [item: StorageListObject]
}>()

const columns = computed(() => {
  if (!props.payload) return [] as TableColumns<StorageListObject>
  const cols = [
    {
      title: '',
      key: '_preview',
      width: 40,
      render: (row: StorageListObject) => {
        const previewType = FileHelper.getPreviewType(row)
        if (previewType === 'image') {
          return (
            <NImage
              width={40}
              height={40}
              objectFit="cover"
              lazy
              src={bucket.getThumbnailUrl(row, 80, 80)}
              previewSrc={bucket.getCDNUrl(row)}
              /** @ts-ignore */
              onClick={(e) => {
                e.stopPropagation()
              }}
            />
          )
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
      render: (row: StorageListObject) => {
        if (row.key === '/') return '/'
        return row.key.replace(props.payload!.prefix, '').replace(/\/$/, '')
      },
      sorter: (a: StorageListObject, b: StorageListObject) => {
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
      render: (row: StorageListObject) => {
        if (row.key.endsWith('/')) return '-'
        return FileHelper.formatFileSize(row.size)
      },
      sorter: (a: StorageListObject, b: StorageListObject) => {
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
      render: (row: StorageListObject) => {
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
      render: (row: StorageListObject) => {
        if (row.key.endsWith('/')) return ''
        return DateHelper.formatLocaleString(row.uploaded)
      },
      sorter: (a: StorageListObject, b: StorageListObject) => {
        // 文件夹不参与排序
        if (a.key.endsWith('/') || b.key.endsWith('/')) {
          return 0
        }
        return new Date(a.uploaded).getTime() - new Date(b.uploaded).getTime()
      },
    },
  ] as TableColumns<StorageListObject>
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
      render: (row: StorageListObject) => {
        if (row.key.endsWith('/')) return ''
        const isPublic = !!(row.customMetadata as any)?.isPublic
        const onSelect = async (key: string) => {
          switch (key) {
            case 'copy_url':
              const url = bucket.getCDNUrl(row)
              if (await ClipboardHelper.copyText(url)) {
                nmessage.success('URL copied to clipboard')
              } else {
                nmessage.error('Failed to copy URL')
              }
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
            case 'toggle_public':
              emit('togglePublic', row)
              break
          }
        }
        return (
          <div>
            <NDropdown
              options={[
                {
                  label: 'Copy URL',
                  key: 'copy_url',
                  icon: () => <IconLink />,
                },
                { label: 'Download', key: 'download', icon: () => <IconDownload /> },
                {
                  label: isPublic ? 'Make Private' : 'Make Public',
                  key: 'toggle_public',
                  icon: isPublic ? () => <IconWorldOff /> : () => <IconWorld />,
                },
                { label: 'Rename', key: 'rename', icon: () => <IconForms /> },
                { label: () => <NText type="error">Delete</NText>, key: 'delete', icon: () => <IconTrash /> },
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
  if (!props.payload) return [] as StorageListObject[]
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
const handleRowClick = (row: StorageListObject) => {
  emit('navigate', row)
}
</script>

<style scoped lang="sass">
:deep(.n-data-table-thead > .n-data-table-tr)
  white-space: nowrap
</style>
