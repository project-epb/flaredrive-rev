<template lang="pug">
.buckets-page
  .flex.items-center.justify-between.gap-4.mb-8
    div
      h1.text-3xl.font-bold 存储桶管理
      p.text-gray-600.mt-1(class='dark:text-gray-400') 管理您的 S3 兼容存储桶
    UButton(color='primary', size='lg', icon='i-lucide-plus', @click='showAddModal = true') 添加存储桶

  .flex.justify-center.py-20(v-if='loading')
    .text-center
      UIcon.size-12.text-gray-400.mb-4.animate-spin(name='i-lucide-loader')
      p.text-gray-500(class='dark:text-gray-400') 加载中...

  UAlert(v-else-if='!buckets.length', icon='i-lucide-inbox', color='primary', variant='soft', title='还没有存储桶')
    template(#description='')
      | 点击右上角的"添加存储桶"按钮开始添加您的第一个存储桶

  .grid.gap-6.grid-cols-1(v-else, class='sm:grid-cols-2 lg:grid-cols-3')
    UCard.cursor-pointer.transition-shadow(
      v-for='bucket in buckets',
      :key='bucket.id',
      class='hover:shadow-lg',
      @click='goToBucket(bucket)'
    )
      template(#header='')
        .flex.items-center.gap-3
          .p-3.rounded-lg.bg-primary-100(class='dark:bg-primary-900/20')
            UIcon.size-6.text-primary(name='i-lucide-database')
          .flex-1.min-w-0
            h3.font-semibold.text-lg.truncate {{ bucket.name }}
            p.text-sm.text-gray-500.truncate(class='dark:text-gray-400') {{ bucket.bucketName }}

      .space-y-2.text-sm
        .flex.items-center.gap-2(v-if='bucket.endpointUrl')
          UIcon.size-4.text-gray-400(name='i-lucide-server')
          span.text-gray-600.truncate(class='dark:text-gray-400') {{ bucket.endpointUrl }}
        .flex.items-center.gap-2(v-if='bucket.region')
          UIcon.size-4.text-gray-400(name='i-lucide-map-pin')
          span.text-gray-600(class='dark:text-gray-400') {{ bucket.region }}
        .flex.items-center.gap-2(v-if='bucket.cdnBaseUrl')
          UIcon.size-4.text-gray-400(name='i-lucide-globe')
          span.text-gray-600.truncate(class='dark:text-gray-400') {{ bucket.cdnBaseUrl }}

      template(#footer='')
        .flex.justify-end.gap-2
          UButton(color='info', variant='ghost', size='sm', icon='i-lucide-pencil', @click.stop='handleEdit(bucket)') 编辑
          UButton(color='error', variant='ghost', size='sm', icon='i-lucide-trash', @click.stop='handleDelete(bucket)') 删除

  UModal(v-model:open='showAddModal', :ui='{ width: "sm:max-w-2xl" }')
    template(#header) 添加存储桶
    template(#body)
      BucketForm(@success='handleFormSuccess', @cancel='showAddModal = false')

  UModal(v-model:open='showEditModal', :ui='{ width: "sm:max-w-2xl" }')
    template(#header) 编辑存储桶
    template(#body)
      BucketForm(:bucket='currentBucket', @success='handleFormSuccess', @cancel='showEditModal = false')

  UModal(v-model:open='showDeleteModal')
    template(#header)
      h2.text-xl.font-semibold 确认删除
    template(#body)
      p.text-gray-600(class='dark:text-gray-400')
        | 确定要删除存储桶 "
        strong {{ bucketToDelete?.name }}
        | " 吗？此操作不可恢复。
    template(#footer)
      .flex.justify-end.gap-3
        UButton(color='neutral', variant='outline', @click='showDeleteModal = false') 取消
        UButton(color='error', :loading='deleting', @click='confirmDelete') 删除
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const router = useRouter()
const toast = useToast()
const bucketStore = useBucketStore()

const loading = ref(false)
const buckets = ref<any[]>([])
const showAddModal = ref(false)
const showEditModal = ref(false)
const currentBucket = ref<any>(null)

const showDeleteModal = ref(false)
const bucketToDelete = ref<any>(null)
const deleting = ref(false)

const fetchBuckets = async (force = false) => {
  loading.value = true
  try {
    buckets.value = await bucketStore.fetchBuckets(force)
  } catch (error: any) {
    console.error('Failed to fetch buckets:', error)
    toast.add({ title: '获取存储桶列表失败', color: 'error' })
  } finally {
    loading.value = false
  }
}

const goToBucket = (bucket: any) => {
  router.push(`/browse/${bucket.id}`)
}

const handleEdit = (bucket: any) => {
  currentBucket.value = bucket
  showEditModal.value = true
}

const handleDelete = (bucket: any) => {
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
    toast.add({ title: '删除成功', color: 'success' })
    showDeleteModal.value = false
    bucketToDelete.value = null
    await fetchBuckets(true)
  } catch (error) {
    toast.add({ title: '删除失败', color: 'error' })
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
