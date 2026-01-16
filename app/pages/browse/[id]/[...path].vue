<template lang="pug">
.browse-page
  .flex.flex-col.gap-6
    .page-header.flex.flex-col.gap-4(class='md:flex-row md:items-center md:justify-between')
      .breadcrumb-wrapper
        UBreadcrumb(:items='breadcrumbItems')

      .actions.flex.items-center.gap-3
        UButton(color='primary', icon='i-lucide-upload', @click='showUploadModal = true') 上传文件
        UButton(color='gray', variant='outline', icon='i-lucide-refresh-cw', :loading='loading', @click='refresh') 刷新

    .flex.justify-center.py-20(v-if='loading && !objects.length && !prefixes.length')
      .text-center
        UIcon.size-12.text-gray-400.mb-4.animate-spin(name='i-lucide-loader')
        p.text-gray-500(class='dark:text-gray-400') 加载中...

    UAlert(
      v-else-if='!objects.length && !prefixes.length',
      icon='i-lucide-folder-open',
      color='primary',
      variant='soft',
      title='目录为空'
    )
      template(#description='')
        | 此目录暂无文件，点击上方"上传文件"按钮开始上传

    .space-y-3(v-else)
      //- 文件夹列表
      UCard.cursor-pointer.transition-all(
        v-for='prefix in prefixes',
        :key='prefix',
        class='hover:shadow-md',
        @click='goTo(prefix)'
      )
        .flex.items-center.gap-4
          .p-3.rounded-lg.bg-amber-100(class='dark:bg-amber-900/20')
            UIcon.size-6.text-amber-600(name='i-lucide-folder')
          .flex-1.min-w-0
            h3.font-medium.text-lg {{ getFolderName(prefix) }}
            p.text-sm.text-gray-500(class='dark:text-gray-400') 文件夹
          UIcon.size-5.text-gray-400(name='i-lucide-chevron-right')

      //- 文件列表
      UCard.cursor-pointer.transition-all(
        v-for='obj in objects',
        :key='obj.key',
        class='hover:shadow-md',
        @click='handleFileClick(obj)'
      )
        .flex.items-center.gap-4
          .p-3.rounded-lg.bg-blue-100(class='dark:bg-blue-900/20')
            UIcon.size-6.text-blue-600(dynamic, :name='getFileIcon(obj.key)')
          .flex-1.min-w-0
            h3.font-medium.truncate {{ getFileName(obj.key) }}
            .flex.gap-4.mt-1.text-xs.text-gray-500(class='dark:text-gray-400')
              span {{ FileHelper.formatBytes(obj.size) }}
              span {{ FileHelper.formatDate(obj.lastModified) }}
          .flex.items-center.gap-2
            UButton(
              color='gray',
              variant='ghost',
              size='sm',
              icon='i-lucide-download',
              @click.stop='handleDownload(obj)'
            )
            UButton(color='red', variant='ghost', size='sm', icon='i-lucide-trash', @click.stop='handleDelete(obj)')

  UModal(v-model:open='showUploadModal', :ui='{ width: "sm:max-w-2xl" }', title='上传文件')
    template(#body)
      UploadForm(:bucket-id='bucketId', :prefix='currentPrefix', @success='handleUploadSuccess')

  UModal(v-if='showDeleteModal', v-model:open='showDeleteModal')
    UCard
      template(#header='')
        h2.text-xl.font-semibold 确认删除
      p.text-gray-600(class='dark:text-gray-400')
        | 确定要删除文件 "
        strong {{ fileToDelete ? getFileName(fileToDelete.key) : '' }}
        | " 吗？
      template(#footer='')
        .flex.justify-end.gap-3
          UButton(color='gray', variant='outline', @click='showDeleteModal = false') 取消
          UButton(color='red', :loading='deleting', @click='confirmDelete') 删除
</template>

<script setup lang="ts">
import type { S3ObjectInfo, ObjectListResponse } from '../../../composables/bucket'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const bucketStore = useBucketStore()

const bucketId = computed(() => route.params.id as string)
const currentPath = computed(() => {
  const path = route.params.path
  if (!path) return ''
  if (Array.isArray(path)) return path.join('/')
  return path
})

const loading = ref(false)
const objects = ref<S3ObjectInfo[]>([])
const prefixes = ref<string[]>([])
const bucketName = ref('')
const showUploadModal = ref(false)

const showDeleteModal = ref(false)
const fileToDelete = ref<S3ObjectInfo | null>(null)
const deleting = ref(false)

const currentPrefix = computed(() => {
  return currentPath.value ? `${currentPath.value}/` : ''
})

const pathParts = computed(() => {
  if (!currentPath.value) return []
  return currentPath.value.split('/').filter(Boolean)
})

const breadcrumbItems = computed(() => {
  const items = [
    {
      label: bucketName.value || 'Bucket',
      icon: 'i-lucide-database',
      click: () => goTo(''),
    },
  ]

  pathParts.value.forEach((part, index) => {
    items.push({
      label: decodeURIComponent(part),
      click: () => goTo(pathParts.value.slice(0, index + 1).join('/')),
    })
  })

  return items
})

const fetchObjects = async () => {
  loading.value = true
  try {
    let requestPath = currentPath.value || ''
    // 确保路径以斜杠结尾，以便后端将其视为目录列表请求
    if (requestPath && !requestPath.endsWith('/')) {
      requestPath += '/'
    }

    // 手动构建 URL，确保特殊字符被正确编码
    // 注意：requestPath 中的斜杠应该被保留而不转义，但路径段名需要编码
    // 这里简单处理：先 split 再 encode 再 join
    const encodedPath = requestPath
      .split('/')
      .map((p) => encodeURIComponent(p))
      .join('/')

    // 上面的处理会导致 '/' 变成 '%2F'，这在 catch-all 路由中可能不被视为路径分隔符
    // 但我们的后端处理的是 [...path]
    // 更好的方式是直接拼接，让 fetch/浏览器处理，只需确保末尾有斜杠

    const response = await $fetch<ObjectListResponse>(`/api/objects/${bucketId.value}/${requestPath}` as any, {
      params: { delimiter: '/' },
    })
    objects.value = response.objects || []
    prefixes.value = response.prefixes || []
  } catch (error: any) {
    console.error('Failed to fetch objects:', error)
    toast.add({ title: '获取文件列表失败', color: 'error' })
  } finally {
    loading.value = false
  }
}

const fetchBucketName = async () => {
  try {
    bucketName.value = await bucketStore.getBucketName(bucketId.value)
  } catch {
    // ignore
  }
}

const goTo = (path: string) => {
  router.push(`/browse/${bucketId.value}/${path}`)
}

const getFolderName = (prefix: string) => {
  const parts = prefix.replace(/\/$/, '').split('/')
  return parts[parts.length - 1] || prefix
}

const getFileName = (key: string) => {
  const parts = key.split('/')
  return parts[parts.length - 1] || key
}

const getFileIcon = (filename: string) => {
  return FileHelper.getIcon(filename)
}

const handleFileClick = (obj: S3ObjectInfo) => {
  // TODO: 实现文件预览
  console.log('File clicked:', obj)
}

const handleDownload = async (obj: S3ObjectInfo) => {
  try {
    const response = await $fetch<{ url?: string }>(`/api/objects/${bucketId.value}/presign` as any, {
      method: 'POST',
      body: {
        key: obj.key,
        operation: 'download',
      },
    })

    if (response.url) {
      window.open(response.url, '_blank')
    }
  } catch (error) {
    toast.add({ title: '获取下载链接失败', color: 'error' })
  }
}

const handleDelete = (obj: S3ObjectInfo) => {
  fileToDelete.value = obj
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (!fileToDelete.value) return

  deleting.value = true
  try {
    await $fetch(`/api/objects/${bucketId.value}/${fileToDelete.value.key}` as any, {
      method: 'DELETE' as any,
    })
    toast.add({ title: '删除成功', color: 'success' })
    showDeleteModal.value = false
    fileToDelete.value = null
    await fetchObjects()
  } catch (error) {
    toast.add({ title: '删除失败', color: 'error' })
  } finally {
    deleting.value = false
  }
}

const refresh = () => {
  fetchObjects()
}

const handleUploadSuccess = () => {
  showUploadModal.value = false
  fetchObjects()
}

onMounted(() => {
  fetchBucketName()
  fetchObjects()
})

watch(currentPath, () => {
  fetchObjects()
})

watch(bucketId, () => {
  fetchBucketName()
})
</script>

<style lang="scss" scoped>
.browse-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
