<template lang="pug">
.browse-page
  .flex.flex-col.gap-6
    .page-header.flex.flex-col.gap-4(class='md:flex-row md:items-center md:justify-between')
      .breadcrumb-wrapper
        UBreadcrumb(:items='breadcrumbItems')

      .actions.flex.items-center.gap-3
        //- 视图切换
        UFieldGroup(orientation='horizontal')
          UButton(
            :color='viewMode === "list" ? "primary" : "neutral"',
            :variant='viewMode === "list" ? "solid" : "soft"',
            icon='i-lucide-list',
            @click='viewMode = "list"'
          )
          UButton(
            :color='viewMode === "gallery" ? "primary" : "neutral"',
            :variant='viewMode === "gallery" ? "solid" : "soft"',
            icon='i-lucide-grid-2x2',
            @click='viewMode = "gallery"'
          )
          UButton(
            :color='viewMode === "book" ? "primary" : "neutral"',
            :variant='viewMode === "book" ? "solid" : "soft"',
            icon='i-lucide-book-open',
            @click='viewMode = "book"'
          )

        UDivider.hidden(orientation='vertical', class='md:block')

        UButton(color='primary', icon='i-lucide-upload', @click='showUploadModal = true') 上传文件
        UButton(color='neutral', variant='outline', icon='i-lucide-refresh-cw', :loading='loading', @click='refresh') 刷新

    //- 列表视图
    BrowserListView(
      v-if='viewMode === "list"',
      :objects='objects',
      :prefixes='prefixes',
      :current-prefix='currentPrefix',
      :loading='loading',
      @navigate='handleNavigate',
      @download='handleDownload',
      @delete='handleDelete',
      @rename='handleRename'
    )

    //- 画廊视图
    BrowserGalleryView(
      v-else-if='viewMode === "gallery"',
      :objects='objects',
      :prefixes='prefixes',
      :current-prefix='currentPrefix',
      :loading='loading',
      @navigate='handleNavigate',
      @download='handleDownload',
      @delete='handleDelete',
      @rename='handleRename'
    )

    //- 漫画视图
    BrowserBookView(
      v-else-if='viewMode === "book"',
      :objects='objects',
      :prefixes='prefixes',
      :current-prefix='currentPrefix',
      :loading='loading',
      @navigate='handleNavigate'
    )

  UModal(v-model:open='showUploadModal', :ui='{ content: "sm:max-w-2xl" }', title='上传文件')
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
          UButton(color='neutral', variant='outline', @click='showDeleteModal = false') 取消
          UButton(color='error', :loading='deleting', @click='confirmDelete') 删除
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

// 视图模式
const viewMode = ref<'list' | 'gallery' | 'book'>('list')

// 从 localStorage 恢复视图模式
onMounted(() => {
  const savedViewMode = localStorage.getItem('browse-view-mode')
  if (savedViewMode && ['list', 'gallery', 'book'].includes(savedViewMode)) {
    viewMode.value = savedViewMode as 'list' | 'gallery' | 'book'
  }
})

// 保存视图模式到 localStorage
watch(viewMode, (newMode) => {
  localStorage.setItem('browse-view-mode', newMode)
})

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
  const items: {
    label: string
    icon?: string
    to: string
  }[] = [
    {
      label: bucketName.value || 'Bucket',
      icon: 'i-lucide-database',
      to: `/buckets/${bucketId.value}/`,
    },
  ]

  pathParts.value.forEach((part, index) => {
    items.push({
      label: decodeURIComponent(part),
      to: `/buckets/${bucketId.value}/${pathParts.value.slice(0, index + 1).join('/')}/`,
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

    const response = await $fetch<ObjectListResponse>(`/api/objects/${bucketId.value}/${requestPath}` as string, {
      params: { delimiter: '/' },
    })
    objects.value = response.objects || []
    prefixes.value = response.prefixes || []
  } catch (error) {
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

const handleNavigate = (item: S3ObjectInfo | string) => {
  if (typeof item === 'string') {
    // 处理特殊导航
    if (item === '..') {
      // 返回上级
      const parts = pathParts.value
      if (parts.length > 0) {
        parts.pop()
        const newPath = parts.join('/')
        router.push(`/buckets/${bucketId.value}/${newPath ? newPath + '/' : ''}`)
      } else {
        router.push(`/buckets/${bucketId.value}/`)
      }
    } else {
      // 普通文件夹导航
      router.push(`/buckets/${bucketId.value}/${item}`)
    }
  } else {
    // 文件点击
    handleFileClick(item)
  }
}

const handleFileClick = (obj: S3ObjectInfo) => {
  // TODO: 实现文件预览
  console.log('File clicked:', obj)
}

const handleDownload = async (obj: S3ObjectInfo) => {
  try {
    const response = await $fetch<{ url?: string }>(`/api/objects/${bucketId.value}/presign` as string, {
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
    await $fetch(`/api/objects/${bucketId.value}/${fileToDelete.value.key}` as string, {
      method: 'DELETE',
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

const handleRename = (obj: S3ObjectInfo) => {
  // TODO: 实现重命名功能
  console.log('Rename:', obj)
  toast.add({ title: '重命名功能开发中', color: 'info' })
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
