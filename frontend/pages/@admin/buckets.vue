<template lang="pug">
.admin-buckets-page.px-6.py-6.max-w-7xl.mx-auto
  .flex.items-center.justify-between.mb-6
    div
      h1.text-2xl.font-bold.mb-1 Bucket Management
      NText(depth='3') Configure your S3-compatible storage buckets

    NButton(type='primary', @click='openCreateModal')
      template(#icon): NIcon: IconPlus
      | New config

  NCard
    NDataTable(
      :columns='columns',
      :data='bucketStore.availableBuckets',
      :loading='bucketStore.isBucketListLoading',
      :row-key='(row) => row.id'
    )

  //- Modal for Create/Edit
  NModal(
    v-model:show='showModal',
    :title='editingBucket ? "Edit Bucket Config" : "Add Bucket Config"',
    preset='card',
    style='width: 600px; max-width: 90vw'
  )
    BucketForm(:bucket='editingBucket', @success='handleSuccess', @cancel='showModal = false')

    template(#header-extra)
      NTooltip(trigger='hover')
        template(#trigger)
          NButton(quaternary, circle)
            template(#icon): NIcon: IconHelpCircle
        | Configs are stored securely in D1 database

  //- Test connection modal or functionality could be added here
</template>

<script setup lang="ts">
import { IconPlus, IconTrash, IconEdit, IconCheck, IconX, IconHelpCircle } from '@tabler/icons-vue'
import { useBucketStore } from '@/stores/bucket'
import BucketForm from '@/components/BucketForm.vue'
import { NButton, NTag, NSpace, NPopconfirm, useMessage } from 'naive-ui'
import fexios from 'fexios'
import type { BucketInfo } from '@/models/R2BucketClient'

const bucketStore = useBucketStore()
const message = useMessage()

// Ensure list is loaded
onMounted(() => {
  bucketStore.fetchBucketList()
})

const showModal = ref(false)
const editingBucket = ref<BucketInfo | undefined>(undefined)

const openCreateModal = () => {
  editingBucket.value = undefined
  showModal.value = true
}

const openEditModal = (row: BucketInfo) => {
  editingBucket.value = { ...row } // Clone
  showModal.value = true
}

const handleSuccess = () => {
  showModal.value = false
  bucketStore.fetchBucketList()
}

const handleDelete = async (row: BucketInfo) => {
  try {
    await fexios.delete(`/api/buckets/${row.id}`)
    message.success('Bucket config deleted')
    bucketStore.fetchBucketList()
  } catch (e: any) {
    message.error(e.message || 'Failed to delete')
  }
}

const handleTest = async (row: BucketInfo) => {
  const loadingKey = message.loading('Testing connection...', { duration: 0 })
  try {
    const { data } = await fexios.post(`/api/buckets/${row.id}/test`)
    loadingKey.destroy()
    if (data.ok) {
      message.success(`Connection OK (${data.latencyMs}ms)`)
    } else {
      message.error(`Connection Failed: ${data.message}`)
    }
  } catch (e: any) {
    loadingKey.destroy()
    message.error(e.response?.data?.message || e.message || 'Test failed')
  }
}

const columns = [
  { title: 'Name', key: 'name', width: 200, ellipsis: true },
  { title: 'Bucket', key: 'bucketName', width: 150 },
  { title: 'Region', key: 'region', width: 100 },
  { title: 'Endpoint', key: 'endpointUrl', width: 250, ellipsis: true },
  {
    title: 'Upload',
    key: 'uploadMethod',
    width: 140,
    render: (row: BucketInfo) => {
      const method = row.uploadMethod === 'proxy' ? 'Proxy' : 'Presigned'
      const type = row.uploadMethod === 'proxy' ? 'warning' : 'info'
      return h(NTag, { type, size: 'small' }, () => method)
    },
  },
  {
    title: 'Path Style',
    key: 'forcePathStyle',
    width: 100,
    render: (row: BucketInfo) => {
      return row.forcePathStyle ? h(NTag, { type: 'info', size: 'small' }, () => 'Yes') : 'No'
    },
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 200,
    render(row: BucketInfo) {
      return h(NSpace, {}, () => [
        h(
          NButton,
          { size: 'small', onClick: () => handleTest(row) },
          { icon: () => h(IconCheck), default: () => 'Test' }
        ),
        h(NButton, { size: 'small', onClick: () => openEditModal(row) }, { icon: () => h(IconEdit) }),
        h(
          NPopconfirm,
          {
            onPositiveClick: () => handleDelete(row),
            'positive-text': 'Delete',
            'negative-text': 'Cancel',
          },
          {
            trigger: () => h(NButton, { size: 'small', type: 'error', secondary: true }, { icon: () => h(IconTrash) }),
            default: () => `Delete config "${row.name}"?`,
          }
        ),
      ])
    },
  },
]
</script>
