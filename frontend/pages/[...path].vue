<template lang="pug">
#browser-view
  //- breadcrumb
  NCard(size='small', m-y-4)
    .flex(justify-between, align-center)
      NBreadcrumb
        NBreadcrumbItem(key='__ROOT__', @click='$router.push("/")')
          NIcon: IconHomeFilled
        NBreadcrumbItem(
          v-for='(item, index) in filePath.split("/").filter(Boolean)',
          :key='index',
          @click='() => $router.push({ name: "/[...path]", params: { path: filePath.split("/").slice(0, index + 1).join("/"), }, })'
        )
          | {{ item || '(???)' }}
      .file-count-info
        | {{ curObjectCount.folders }} {{ curObjectCount.folders > 1 ? 'folders' : 'folder' }}
        | /
        | {{ curObjectCount.files }} {{ curObjectCount.files > 1 ? 'files' : 'file' }}

  //- filelist actions
  .file-list-actions(m-y-4, flex, justify-between, lt-sm='flex-col gap-4 items-center')
    //- display mode
    NRadioGroup(v-model:value='currentDisplayMode')
      NRadioButton(v-for='i in displayModeOptions', :key='i.value', :value='i.value', size='small')
        NIcon(v-if='i.icon', mr-2): Component(:is='i.icon')
        | {{ i.label }}
    //- file operations
    NButtonGroup
      NButton(type='primary', secondary, :render-icon='() => h(IconUpload)') Upload
      NButton(type='default', secondary, :render-icon='() => h(IconFolderPlus)', @click='handleCreateFolder')
      NButton(
        type='default',
        secondary,
        :render-icon='() => h(IconReload)',
        @click='() => { fetchFileList().then(() => nmessage.success("Refresh success")) }'
      )

  //- file browser
  NSkeleton(v-if='!payload', height='200px')
  NSpin(v-else, :show='isLoading')
    BrowserListView(
      v-if='currentDisplayMode === "list"',
      :payload,
      @navigate='onNavigate',
      @delete='onDelete',
      @download='onDownload',
      @rename='onRename'
    )
    .grid-show(v-if='currentDisplayMode === "grid"')
      NP 没做好，嘻嘻……
    BrowserGalleryView(
      v-if='currentDisplayMode === "gallery"',
      :payload,
      @navigate='onNavigate',
      @delete='onDelete',
      @download='onDownload',
      @rename='onRename'
    )

  //- drop zone
  .drop-zone-tips(
    v-if='isOverDropZone',
    fixed,
    top-0,
    left-0,
    z-index-100,
    bg='[rgba(100,100,100,0.75)]',
    w-full,
    h-full
  )
    .inline-block(absolute, top='50%', left='50%', uno:translate='-50%', text-center)
      NIcon(size=40): IconUpload
      NP Drop files here to upload

  //- preview modal
  BrowserPreviewModal(v-model:show='isShowPreview', :item='previewItem')

  //- debug info
  details.dev-only.bg-dev.mt-6
    NP filePath: {{ filePath }}
    pre {{ payload }}
</template>

<script setup lang="tsx">
import { type R2BucketListResponse } from '@/models/R2BucketClient'
import type { R2Object } from '@cloudflare/workers-types/2023-07-01'
import {
  IconFolderPlus,
  IconHomeFilled,
  IconLayout2,
  IconLibraryPhoto,
  IconList,
  IconReload,
  IconUpload,
} from '@tabler/icons-vue'
import { NBreadcrumb, NForm, NFormItem, NInput, useMessage, useModal } from 'naive-ui'
import type { Component } from 'vue'

const nmodal = useModal()
const nmessage = useMessage()

const route = useRoute()
const router = useRouter()
const filePath = computed(() => {
  // @ts-ignore
  return route.params.path
})

const currentDisplayMode = useLocalStorage('flaredrive:current-view', 'list')
const displayModeOptions = ref<{ label: string; value: string; icon?: Component }[]>([
  { label: 'List', value: 'list', icon: IconList },
  { label: 'Grid', value: 'grid', icon: IconLayout2 },
  { label: 'Gallery', value: 'gallery', icon: IconLibraryPhoto },
])

const isLoading = ref(false)
const payload = ref<R2BucketListResponse>()
const bucket = useBucketStore()
const curObjectCount = computed(() => {
  if (!payload.value) return { files: 0, folders: 0 }
  return {
    files: payload.value.objects.length,
    folders: payload.value.folders.length,
  }
})

watch(
  filePath,
  (newPath) => {
    if (newPath && !newPath.endsWith('/')) {
      router.replace(`/${newPath}/`)
    } else if (newPath === '/') {
      router.replace('/')
    } else {
      fetchFileList()
    }
  },
  { immediate: true }
)

async function fetchFileList() {
  isLoading.value = true
  try {
    const { data } = await bucket.list(filePath.value)
    payload.value = data
  } catch (error) {
    console.error('Error fetching data:', error)
    payload.value = undefined
  } finally {
    isLoading.value = false
  }
}

const isShowPreview = ref(false)
const previewItem = ref<R2Object | undefined>()
function onNavigate(item: R2Object) {
  const path = item.key || ''
  if (path === '/' || path === '') {
    router.push('/')
  } else if (path === '../') {
    const parentPath = filePath.value.split('/').slice(0, -2).join('/')
    router.push(`/${parentPath}/`)
  } else if (path.endsWith('/')) {
    router.push(`/${path}`)
  } else {
    previewItem.value = item
    isShowPreview.value = true
  }
}
async function onDelete(item: R2Object) {
  nmodal.create({
    title: 'Delete File',
    type: 'warning',
    preset: 'confirm',
    content: () => {
      return (
        <div>
          Are you sure you want to delete <code>${item.key.split('/').pop()}</code>?
        </div>
      )
    },
    positiveText: 'Delete',
    negativeText: 'Cancel',
    onPositiveClick() {
      bucket.deleteFile(item.key).then(() => {
        nmessage.success('File deleted successfully')
        fetchFileList()
      })
    },
  })
}
async function onDownload(item: R2Object) {
  const url = bucket.getCDNUrl(item)
  const a = document.createElement('a')
  a.href = url
  a.download = item.key.split('/').pop() || ''
  a.click()
  nmessage.success('Download started')
}
async function onRename(item: R2Object) {
  const toPathInput = ref(item.key)
  nmodal.create({
    title: 'Rename File',
    preset: 'confirm',
    content: () => {
      return (
        <NForm>
          <NFormItem label="New Name (including path)">
            <NInput value={toPathInput.value} onUpdateValue={(e) => (toPathInput.value = e)} clearable />
          </NFormItem>
        </NForm>
      )
    },
    positiveText: 'OK',
    negativeText: 'Cancel',
    onPositiveClick() {
      const toPath = toPathInput.value
      const fromFolder = item.key.split('/').slice(0, -1).join('/')
      const toFolder = toPath.split('/').slice(0, -1).join('/')
      if (toPath === item.key) {
        return
      }
      bucket
        .rename(item.key, toPath)
        .then(() => {
          nmessage.success('File renamed successfully')
          if (fromFolder !== toFolder) {
            router.push(`/${toFolder}/`)
          } else {
            // @ts-ignore
            item.key = toPath
            // @ts-ignore
            item.uploaded = new Date().toISOString()
          }
        })
        .catch((err) => {
          nmessage.error(`Failed to rename file: ${err}`)
        })
    },
  })
}
async function handleCreateFolder() {
  const folderNameInput = ref('')
  nmodal.create({
    title: 'Create Folder',
    preset: 'confirm',
    content: () => {
      return (
        <NForm>
          <NFormItem label="Folder Name">
            <NInput value={folderNameInput.value} onUpdateValue={(e) => (folderNameInput.value = e)} clearable>
              {{
                prefix: <>/{filePath.value}</>,
              }}
            </NInput>
          </NFormItem>
        </NForm>
      )
    },
    positiveText: 'Create',
    negativeText: 'Cancel',
    onPositiveClick() {
      let folderName = folderNameInput.value.replace(/\/+$/, '')
      if (!folderName) {
        nmessage.error('Folder name cannot be empty')
        return
      }
      if (folderName.startsWith('.') || folderName.startsWith('/')) {
        nmessage.error('Invalid folder name')
        return false
      }
      bucket.createFolder(`${filePath.value}${folderName}`).then(() => {
        nmessage.success('Folder created successfully')
        fetchFileList()
      })
    },
  })
}

const { isOverDropZone } = useDropZone(document.body, {
  multiple: true,
  onDrop(files) {
    console.log('Dropped files:', files)
    files?.forEach((file) => {
      const fileName = file.name
      if (fileName) {
        bucket.addToUploadQueue(file, `${filePath.value}${fileName}`)
      }
    })
  },
})
watch(bucket.uploadQueue, (queue, oldQueue) => {
  if (queue.length === 0 && oldQueue.length > 0) {
    fetchFileList()
  }
})

const uploadState = reactive({
  isUploading: false,
  successes: 0,
  errors: 0,
  total: 0,
})
const resetUploadState = () => {
  uploadState.isUploading = false
  uploadState.successes = 0
  uploadState.errors = 0
  uploadState.total = 0
}
async function handleUpload(files: File[]) {}

function createUploadModal() {
  nmodal.create({
    title: 'Upload Files',
    preset: 'confirm',
    content: () => {
      return <NForm></NForm>
    },
    positiveText: 'OK',
    negativeText: 'Cancel',
    onPositiveClick() {},
  })
}
</script>

<style scoped lang="sass"></style>
