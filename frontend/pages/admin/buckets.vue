<template lang="pug">
.admin-buckets-page
  .flex.items-center.justify-between.mb-6
    div
      h1.text-2xl.font-bold.mb-1 Buckets Management
      NText(depth='3') Manage all configured storage buckets
    .flex.gap-2
      NButton(secondary, @click='loadBuckets', :loading='isLoading')
        template(#icon): NIcon: IconRefresh
      NButton(type='primary', @click='showBucketModal()') New Bucket

  NDataTable(
    :columns='columns',
    :data='rows',
    :loading='isLoading',
    :row-key='(row) => row.id',
    scroll-x='100%',
    :row-props='rowProps'
  )

  NModal(
    v-model:show='showModal',
    preset='card',
    :title='selectedBucket ? `Edit Bucket: ${selectedBucket.name}` : "Create New Bucket"',
    style='width: 600px; max-width: 95vw',
    :bordered='false'
  )
    BucketForm(:bucket='selectedBucket || undefined', @cancel='showModal = false', @success='handleFormSuccess')
</template>

<script setup lang="ts">
import { NButton, NButtonGroup, NPopconfirm, NTag, NSpace, useMessage, type DataTableColumns } from 'naive-ui'
import { IconEdit, IconRefresh, IconTrash } from '@tabler/icons-vue'
import fexios from 'fexios'
import type { BucketInfo } from '@/models/BucketClient'

const message = useMessage()
const rows = ref<BucketInfo[]>([])
const isLoading = ref(false)

const loadBuckets = async () => {
  isLoading.value = true
  try {
    const { data } = await fexios.get<BucketInfo[]>('/api/admin/buckets')
    rows.value = data || []
  } catch (e: any) {
    message.error(e?.response?.data?.error || e?.message || 'Failed to load buckets')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadBuckets()
})

const handleDelete = async (row: BucketInfo) => {
  try {
    await fexios.delete(`/api/admin/buckets/${row.id}`)
    message.success('Deleted successfully')
    await loadBuckets()
  } catch (e: any) {
    message.error(e?.response?.data?.error || e?.message || 'Failed to delete')
  }
}

const columns: DataTableColumns<BucketInfo & { ownerEmail?: string; ownerUserId?: string }> = [
  { title: 'ID', key: 'id', width: 140, ellipsis: true },
  { title: '名称', key: 'name', width: 180, ellipsis: true },
  {
    title: 'Owner',
    key: 'ownerEmail',
    width: 200,
    render: (row) => row.ownerEmail || `#${row.ownerUserId}`,
  },
  { title: 'Bucket', key: 'bucketName', width: 160 },
  { title: 'Region', key: 'region', width: 120 },
  { title: 'Endpoint', key: 'endpointUrl', width: 240, ellipsis: true },
  {
    title: 'Upload',
    key: 'uploadMethod',
    width: 120,
    render: (row) => {
      const method = row.uploadMethod === 'proxy' ? 'Proxy' : 'Presigned'
      const type = row.uploadMethod === 'proxy' ? 'warning' : 'info'
      return h(NTag, { type, size: 'small' }, () => method)
    },
  },
  {
    title: 'Path Style',
    key: 'forcePathStyle',
    width: 110,
    render: (row) => (row.forcePathStyle ? h(NTag, { type: 'info', size: 'small' }, () => 'Yes') : 'No'),
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 120,
    cellProps() {
      return {
        onClick(e: Event) {
          e.stopPropagation()
        },
      }
    },
    render(row) {
      return h(NButtonGroup, {}, () => [
        h(NButton, { size: 'small', onClick: () => showBucketModal(row), renderIcon: () => h(IconEdit) }),
        h(
          NPopconfirm,
          {
            onPositiveClick: () => handleDelete(row),
            'positive-text': 'Delete',
            'negative-text': 'Cancel',
          },
          {
            trigger: () => h(NButton, { size: 'small', type: 'error', secondary: true }, { icon: () => h(IconTrash) }),
            default: () => `Delete bucket "${row.name}"?`,
          }
        ),
      ])
    },
  },
]

const rowProps = (row: BucketInfo) => {
  return {
    onClick() {
      showBucketModal(row)
    },
    style: { cursor: 'pointer' },
  }
}

const selectedBucket = ref<BucketInfo | undefined>()
const showModal = ref(false)

const showBucketModal = (bucket?: BucketInfo) => {
  selectedBucket.value = bucket
  showModal.value = true
}
const handleFormSuccess = async () => {
  showModal.value = false
  selectedBucket.value = undefined
  await loadBuckets()
}
</script>
