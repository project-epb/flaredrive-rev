<template lang="pug">
.bucket-home
  //- Page Header
  .page-header.flex.items-center.justify-between.px-6.py-4.mb-4.border-b
    .flex.items-center.gap-3
      .logo-icon.flex.items-center.justify-center
        NIcon(size='28', color='var(--primary-color)')
          IconCloud
      .flex.flex-col
        NH2.m-0.text-lg.font-bold(style='line-height: 1.2') {{ site.siteName || 'FlareDrive' }}
        NText(depth='3', style='font-size: 12px') S3-compatible Storage Manager

    .actions.flex.items-center.gap-3
      NButton(secondary, @click='refreshList', :loading='bucketStore.isBucketListLoading')
        template(#icon): NIcon: IconRefresh

      NButton(type='primary', @click='openCreateModal')
        template(#icon)
          NIcon
            IconPlus
        | New Bucket

  //- Main Content
  .main-content.px-6.pb-8
    NSpin(:show='bucketStore.isBucketListLoading')
      //- Empty State
      .mt-12.flex.justify-center(v-if='!bucketStore.availableBuckets.length && !bucketStore.isBucketListLoading')
        NEmpty(description='No buckets configured')
          template(#extra)
            NButton(dashed, @click='openCreateModal') Create your first bucket

      //- Grid Content
      .bucket-grid-wrapper(v-else)
        .bucket-grid
          NCard.bucket-card-item(
            v-for='(item, index) in bucketStore.availableBuckets',
            :key='item.id',
            hoverable,
            size='small',
            @click='goToBucket(item.id)',
            :style='{ animationDelay: `${index * 50}ms` }'
          )
            template(#header)
              .flex.items-center.gap-3
                .p-2.rounded-lg.bg-icon
                  NIcon(size='24', color='var(--primary-color)')
                    IconBucket
                span.font-bold(style='font-size: 16px') {{ item.name }}

            template(#header-extra)
              NDropdown(:options='getBucketOptions(item)', @select='(key) => handleBucketAction(key, item)')
                NButton.action-btn(secondary, circle, size='small', @click.stop)
                  template(#icon): NIcon: IconDotsVertical

            .card-content.flex.flex-col.gap-2.mt-2
              //- Real Bucket Name
              .info-row(v-if='item.bucketName && item.bucketName !== item.name')
                NIcon.mr-2(size='16', depth='3'): IconDatabase
                NText(depth='2', style='font-size: 13px') {{ item.bucketName }}

              //- Region
              .info-row
                NIcon.mr-2(size='16', depth='3'): IconMapPin
                NText(depth='3', style='font-size: 13px') {{ item.region || 'Auto Region' }}

              //- Endpoint / URL
              .info-row(v-if='item.cdnBaseUrl')
                NIcon.mr-2(size='16', depth='3'): IconWorld
                NText(depth='3', style='font-size: 13px') {{ formatUrl(item.cdnBaseUrl) }}
              .info-row(v-else)
                NIcon.mr-2(size='16', depth='3'): IconServer
                NText(depth='3', style='font-size: 13px') {{ formatEndpoint(item.endpointUrl) }}

  //- Modals
  NModal(
    v-model:show='showModal',
    preset='card',
    :title='editingBucket ? "Edit Bucket" : "Create Bucket"',
    style='width: 600px; max-width: 95vw',
    :bordered='false'
  )
    BucketForm(:bucket='editingBucket || undefined', @cancel='closeModal', @success='handleFormSuccess')
</template>

<script setup lang="tsx">
import {
  IconBucket,
  IconCloud,
  IconPlus,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconLink,
  IconDatabase,
  IconMapPin,
  IconWorld,
  IconServer,
  IconRefresh,
} from '@tabler/icons-vue'
import { NIcon, useDialog, useMessage } from 'naive-ui'
import type { BucketInfo } from '@/models/BucketClient'
import BucketForm from '@/components/BucketForm.vue'
import fexios from 'fexios'

definePage({
  name: 'index',
})

const site = useSiteStore()

const formatUrl = (url: string) => {
  try {
    const u = new URL(url)
    return u.hostname
  } catch {
    return url
  }
}

const formatEndpoint = (url: string) => {
  try {
    const u = new URL(url)
    return u.hostname
  } catch {
    return url
  }
}

const router = useRouter()
const bucketStore = useBucketStore()
const navigation = useNavigationStore()
const dialog = useDialog()
const message = useMessage()

const stopEvent = (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
}

// Modal State
const showModal = ref(false)
const editingBucket = ref<BucketInfo | null>(null)

onMounted(async () => {
  const list = await bucketStore.fetchBucketList()
  await navigation.handleInitialNavigation(list)
})

const goToBucket = (bucketId: string) => {
  if (!bucketId) return
  router.push(`/bucket/${bucketId}/`)
}

// Actions
const openCreateModal = () => {
  editingBucket.value = null
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingBucket.value = null
}

const handleFormSuccess = async () => {
  closeModal()
  await bucketStore.fetchBucketList()
}

const refreshList = async () => {
  await bucketStore.fetchBucketList()
  message.success('Refreshed')
}

// Dropdown Options
function renderIcon(icon: any) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const getBucketOptions = (item: BucketInfo) => [
  {
    label: 'Edit',
    key: 'edit',
    icon: renderIcon(IconEdit),
  },
  {
    label: 'Test Connection',
    key: 'test',
    icon: renderIcon(IconLink),
  },
  {
    label: () => <NText type="error">Delete</NText>,
    key: 'delete',
    icon: renderIcon(IconTrash),
  },
]

const handleBucketAction = async (key: string, item: BucketInfo) => {
  if (key === 'edit') {
    editingBucket.value = item
    showModal.value = true
  } else if (key === 'delete') {
    dialog.warning({
      title: 'Delete Bucket',
      content: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      positiveText: 'Delete',
      negativeText: 'Cancel',
      onPositiveClick: async () => {
        try {
          await fexios.delete(`/api/buckets/${item.id}`)
          message.success('Bucket deleted')
          await bucketStore.fetchBucketList()
        } catch (e: any) {
          message.error(e.response?.data?.message || 'Delete failed')
        }
      },
    })
  } else if (key === 'test') {
    const msg = message.loading('Testing connection...', { duration: 0 })
    try {
      const { data } = await fexios.post(`/api/buckets/${item.id}/test`)
      // message.success(`Connection successful! Latency: ${data.latencyMs}ms`)
      msg.type = 'success'
      msg.content = `Connection successful! Latency: ${data.latencyMs}ms`
    } catch (e: any) {
      console.error(e)
      // message.error(`Connection failed: ${e.response?.data?.message || e.message}`)
      msg.type = 'error'
      msg.content = `Connection failed: ${e.response?.data?.message || e.message}`
    } finally {
      setTimeout(() => {
        msg.destroy()
      }, 3000)
    }
  }
}
</script>

<style scoped lang="sass">
.bucket-home
  min-height: 80vh
  display: flex
  flex-direction: column

.page-header
  background-color: var(--card-color)
  border-bottom: 1px solid var(--border-color)

.logo-icon
  width: 40px
  height: 40px
  border-radius: 8px
  background: rgba(246, 130, 31, 0.1)
  html.dark &
    background: rgba(246, 130, 31, 0.2)

.bucket-grid-wrapper
  width: 100%
  max-width: 1200px
  margin: 0 auto

.bucket-grid
  display: grid
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))
  gap: 1.5rem

.bucket-card-item
  cursor: pointer
  transition: all 0.2s ease
  animation: fadeInUp 0.4s ease both

.bg-icon
  background-color: rgba(0, 0, 0, 0.05)
  html.dark &
    background-color: rgba(255, 255, 255, 0.1)

.info-row
  display: flex
  align-items: center
  overflow: hidden
  white-space: nowrap
  text-overflow: ellipsis

/* Animations */
@keyframes fadeInUp
  from
    opacity: 0
    transform: translateY(20px)
  to
    opacity: 1
    transform: translateY(0)
</style>
