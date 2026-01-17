<template lang="pug">
.buckets-page
  .flex.items-center.justify-between.gap-4.mb-8
    div
      h1.text-3xl.font-bold 存储桶管理
      p.text-gray-600.mt-1(class='dark:text-gray-400') 管理您的 S3 兼容存储桶
    NButton(type='primary', size='large', @click='showAddModal = true')
      template(#icon)
        Icon(name='i-lucide-plus')
      | 添加存储桶

  .flex.justify-center.py-20(v-if='loading')
    .text-center
      Icon.size-12.text-gray-400.mb-4.animate-spin(name='i-lucide-loader')
      p.text-gray-500(class='dark:text-gray-400') 加载中...

  NAlert(v-else-if='!buckets.length', type='info', title='还没有存储桶')
    | 点击右上角的"添加存储桶"按钮开始添加您的第一个存储桶

  .grid.gap-6.grid-cols-1(v-else, class='sm:grid-cols-2 lg:grid-cols-3')
    NCard.cursor-pointer.transition-shadow(
      v-for='bucket in buckets',
      :key='bucket.id',
      class='hover:shadow-lg',
      @click='goToBucket(bucket)',
      hoverable
    )
      template(#header)
        .flex.items-center.gap-3
          .p-3.rounded-lg.bg-primary-100(class='dark:bg-primary-900/20')
             Icon.size-6.text-primary(name='i-lucide-database')
          .flex-1.min-w-0
            h3.font-semibold.text-lg.truncate {{ bucket.name }}
            p.text-sm.text-gray-500.truncate(class='dark:text-gray-400') {{ bucket.bucketName }}

      .space-y-2.text-sm.mb-4
        .flex.items-center.gap-2(v-if='bucket.endpointUrl')
          Icon.size-4.text-gray-400(name='i-lucide-server')
          span.text-gray-600.truncate(class='dark:text-gray-400') {{ bucket.endpointUrl }}
        .flex.items-center.gap-2(v-if='bucket.region')
          Icon.size-4.text-gray-400(name='i-lucide-map-pin')
          span.text-gray-600(class='dark:text-gray-400') {{ bucket.region }}
        .flex.items-center.gap-2(v-if='bucket.cdnBaseUrl')
          Icon.size-4.text-gray-400(name='i-lucide-globe')
          span.text-gray-600.truncate(class='dark:text-gray-400') {{ bucket.cdnBaseUrl }}

      template(#action)
        .flex.justify-end.gap-2
          NButton(type='info', quaternary, size='small', @click.stop='handleEdit(bucket)')
             template(#icon)
               Icon(name='i-lucide-pencil')
             | 编辑
          NButton(type='error', quaternary, size='small', @click.stop='handleDelete(bucket)')
             template(#icon)
               Icon(name='i-lucide-trash')
             | 删除

  NModal(v-model:show='showAddModal', preset='card', title='添加存储桶', style='width: 600px')
      BucketForm(@success='handleFormSuccess', @cancel='showAddModal = false')

  NModal(v-model:show='showEditModal', preset='card', title='编辑存储桶', style='width: 600px')
      BucketForm(:bucket='currentBucket || undefined', @success='handleFormSuccess', @cancel='showEditModal = false')

  NModal(v-model:show='showDeleteModal', preset='card', title='确认删除', style='width: 400px', :auto-focus='false')
      p.text-gray-600(class='dark:text-gray-400')
        | 确定要删除存储桶 "
        strong {{ bucketToDelete?.name }}
        | " 吗？此操作不可恢复。
      template(#footer)
        .flex.justify-end.gap-3
           NButton(@click='showDeleteModal = false') 取消
           NButton(type='error', :loading='deleting', @click='confirmDelete') 删除
</template>

<script setup lang="ts">
import type { BucketInfo } from '~/composables/bucket'

definePageMeta({
  middleware: 'auth',
})

const router = useRouter()
const message = useMessage()
const bucketStore = useBucketStore()

const loading = ref(false)
const buckets = ref<BucketInfo[]>([])
const showAddModal = ref(false)
const showEditModal = ref(false)
const currentBucket = ref<BucketInfo | null>(null)

const showDeleteModal = ref(false)
const bucketToDelete = ref<BucketInfo | null>(null)
const deleting = ref(false)

const fetchBuckets = async (force = false) => {
  loading.value = true
  try {
    buckets.value = await bucketStore.fetchBuckets(force)
  } catch (error) {
    console.error('Failed to fetch buckets:', error)
    message.error('获取存储桶列表失败')
  } finally {
    loading.value = false
  }
}

const goToBucket = (bucket: BucketInfo) => {
  router.push(`/buckets/${bucket.id}/`)
}

const handleEdit = (bucket: BucketInfo) => {
  currentBucket.value = bucket
  showEditModal.value = true
}

const handleDelete = (bucket: BucketInfo) => {
  bucketToDelete.value = bucket
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (!bucketToDelete.value) return
  deleting.value = true
  try {
    await $fetch(`/api/buckets/${bucketToDelete.value.id}`, {
      method: 'DELETE',
    })
    message.success('删除成功')
    showDeleteModal.value = false
    bucketToDelete.value = null
    await fetchBuckets(true)
  } catch (error) {
    message.error('删除失败')
  } finally {
    deleting.value = false
  }
}

const handleFormSuccess = () => {
  showAddModal.value = false
  showEditModal.value = false
  currentBucket.value = null
  fetchBuckets(true)
}

onMounted(() => {
  fetchBuckets()
})
</script>

<style lang="scss" scoped>
.buckets-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
