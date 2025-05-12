<template lang="pug">
#browser-view
  NCard(size='small', mb-4, z-5)
    //- actions
    .file-list-actions(flex, justify-between, lt-sm='flex-col gap-4 items-center')
      //- display mode
      NRadioGroup(v-model:value='currentDisplayMode', size='small')
        NRadioButton(v-for='i in displayModeOptions', :key='i.value', :value='i.value')
          NIcon(v-if='i.icon', mr-2): Component(:is='i.icon')
          | {{ i.label }}
      //- file operations
      NButtonGroup(size='small')
        NButton(type='primary', secondary, :render-icon='() => h(IconUpload)', @click='createUploadModal') Upload
        NButton(type='default', secondary, :render-icon='() => h(IconFolderPlus)', @click='handleCreateFolder')
        NButton(type='default', secondary, :render-icon='() => h(IconHistory)', @click='isShowUploadHistory = true')
        NButton(
          type='default',
          secondary,
          :render-icon='() => h(IconReload)',
          :loading='isLoading',
          @click='() => { loadFileList().then(() => nmessage.success("Refresh success")) }'
        )

    //- breadcrumb
    .flex(justify-between, align-center, mt-4)
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

  NAlert(v-if='isRandomUploadDir', type='info', title='Random upload', closable, my-4) 
    | This is a random upload directory. Files will be uploaded to this directory with a random name.
    | You find the final url in the
    |
    NA(@click='isShowUploadHistory = true') Upload History
    | .

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
    BrowserGridView(
      v-if='currentDisplayMode === "grid"',
      :payload,
      @navigate='onNavigate',
      @delete='onDelete',
      @download='onDownload',
      @rename='onRename'
    )
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
  BrowserPreviewModal(
    v-model:show='isShowPreview',
    :item='previewItem',
    @delete='onDelete',
    @download='onDownload',
    @rename='onRename'
  )

  //- upload history
  BrowserUploadHistory(
    v-model:show='isShowUploadHistory',
    :list='bucket.uploadHistory',
    @delete='onDelete',
    @download='onDownload',
    @rename='onRename',
    @navigate='onNavigate'
  )

  //- floating action button
  NFloatButton(type='primary', menu-trigger='hover', position='fixed', bottom='2rem', right='2rem')
    NIcon: IconPlus
    template(#menu)
      NFloatButton(type='primary', @click='createUploadModal'): NIcon: IconUpload
      NFloatButton(type='default', @click='handleCreateFolder'): NIcon: IconFolderPlus
      NFloatButton(type='default', @click='isShowUploadHistory = true'): NIcon: IconHistory
      NFloatButton(type='default', @click='() => { loadFileList().then(() => nmessage.success("Refresh success")) }')
        NSpin(v-if='isLoading', show, :size='16')
        NIcon(v-else): IconReload

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
  IconHistory,
  IconHomeFilled,
  IconLayout2,
  IconLibraryPhoto,
  IconList,
  IconPlus,
  IconReload,
  IconUpload,
} from '@tabler/icons-vue'
import { NBreadcrumb, NForm, NFormItem, NInput, useMessage, useModal } from 'naive-ui'
import type { Component } from 'vue'

const UploadForm = defineAsyncComponent(() => import('@/components/UploadForm.vue'))

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
const isRandomUploadDir = computed(() => bucket.checkIsRandomUploadDir(filePath.value))

watch(
  filePath,
  (newPath) => {
    if (newPath && !newPath.endsWith('/')) {
      router.replace(`/${newPath}/`)
    } else if (newPath === '/') {
      router.replace('/')
    } else {
      loadFileList()
    }
  },
  { immediate: true }
)

async function loadFileList() {
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
          Are you sure you want to delete <code>{item.key.split('/').pop()}</code>?
        </div>
      )
    },
    positiveText: 'Delete',
    negativeText: 'Cancel',
    onPositiveClick() {
      bucket.deleteFile(item.key).then(() => {
        nmessage.success('File deleted successfully')
        payload.value?.objects.splice(payload.value.objects.indexOf(item), 1)
        isShowPreview.value = false
      })
    },
  })
}
async function onDownload(item: R2Object) {
  const url = bucket.getCDNUrl(item)
  const a = document.createElement('a')
  a.href = url
  a.download = item.key.split('/').pop() || `FlareDrive_download_${Date.now()}`
  a.click()
  nmessage.success('Download started')
}
async function onRename(item: R2Object) {
  const toPathInput = ref(item.key)
  const modal = nmodal.create({
    title: 'Rename File',
    preset: 'confirm',
    content: () => {
      return (
        <NForm>
          <NFormItem label="New Name (including path)">
            <NInput
              value={toPathInput.value}
              onUpdateValue={(e) => (toPathInput.value = e)}
              clearable
              onKeydown={(e) => {
                if (e.key === 'Enter') {
                }
              }}
            />
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
      router.push(`/${filePath.value}${folderName}/`)
    },
  })
}

const { isOverDropZone } = useDropZone(document.body, {
  multiple: true,
  onDrop(files) {
    console.log('Dropped files:', files)
    if (!files || !files.length) {
      return
    }
    files = files?.filter((file) => {
      return !!file.name
    })
    nmessage.success(files.length > 1 ? `Uploading ${files.length} files...` : `Uploading ${files[0].name}...`)
    files.forEach((file) => {
      const fileName = file.name
      if (fileName) {
        bucket.addToUploadQueue(file, `${filePath.value}${fileName}`)
      }
    })
  },
})
watch(bucket.uploadQueue, (queue, oldQueue) => {
  if (queue.length === 0 && oldQueue.length > 0) {
    loadFileList()
  }
})

function createUploadModal() {
  let isUploaded = false
  nmodal.create({
    title: 'Upload Files',
    preset: 'card',
    content: () => {
      return <UploadForm defaultPrefix={filePath.value} prefixReadonly={true} onUpload={() => (isUploaded = true)} />
    },
    onAfterLeave() {
      isUploaded && loadFileList()
    },
  })
}

const isShowUploadHistory = ref(false)
</script>

<style scoped lang="sass"></style>
