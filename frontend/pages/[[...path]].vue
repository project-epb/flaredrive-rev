<template lang="pug">
#browser-view
  .top-sticky-rail(mb-8, z-5, sticky, top='[calc(60px+0.25rem)]')
    NCollapseTransition(:show='isShowTopStickyRail || !!searchInput')
      NCard(size='small')
        .flex(justify-between, gap-4, items-center, lt-sm='flex-col gap-2')
          //- display mode
          NButtonGroup(v-model:value='currentLayout', size='small')
            NTooltip(
              v-for='item in layoutOptions',
              :key='item.value',
              placement='bottom',
              :show-arrow='false',
              :keep-alive-on-hover='false'
            )
              template(#default) {{ item.tooltip || item.label }}
              template(#trigger)
                NButton(
                  @click='currentLayout = item.value',
                  :type='item.value === currentLayout ? "primary" : "default"'
                )
                  NIcon(v-if='item.icon'): Component(:is='item.icon')
                  span(lt-md='hidden', ml-2) {{ item.label }}
          //- file search
          .flex-1(lt-sm='w-full')
            NInput(
              w-full,
              size='small',
              :placeholder='`Search files in /${currentPath}`',
              v-model:value='searchInput',
              clearable
            )
              template(#prefix): NIcon(mr-2): IconSearch
          //- dir status
          NText.file-count-info(depth='3')
            template(v-if='!searchInput') {{ curObjectCount.folders }} {{ curObjectCount.folders > 1 ? 'folders' : 'folder' }} / {{ curObjectCount.files }} {{ curObjectCount.files > 1 ? 'files' : 'file' }}
            template(v-if='searchInput')
              NIcon(mr-2): IconFilter
              | {{ filteredPayload.objects.length }} in {{ curObjectCount.files }}
          //- file operations
          NButtonGroup(size='small', lt-md='hidden')
            NTooltip(
              v-for='(action, index) in pathActions',
              :key='index',
              placement='bottom',
              :show-arrow='false',
              :keep-alive-on-hover='false'
            )
              template(#default) {{ action.tooltip || action.label }}
              template(#trigger)
                NButton(
                  :type='action.type',
                  secondary,
                  :loading='action.loading',
                  :title='action.tooltip',
                  :render-icon='() => h(action.icon)',
                  @click='action.action'
                )
                  template(v-if='action.label') {{ action.label }}
    .top-sticky-rail-trigger(
      @click='isShowTopStickyRail = !isShowTopStickyRail',
      absolute,
      cursor-pointer,
      top='[calc(100%+1rem)]',
      left='50%',
      uno:translate='-50% -50%',
      p-x-10,
      p-y='2px',
      rounded-full,
      leading-0
    )
      NIcon(size='12'): component(:is='isShowTopStickyRail ? IconChevronCompactUp : IconChevronCompactDown')

  //- Alerts
  NAlert(v-if='bucket.checkIsRandomUploadDir(currentPath)', type='info', title='Random upload', closable, my-4) 
    | This is a random upload directory. The files uploaded here will be stored in a random name. You can find the final URL in the
    |
    NA(@click='isShowUploadHistory = true')
      NIcon(mr-1): IconHistory
      | upload history
    | .
  NAlert(v-if='bucket.checkIsHiddenDir(currentPath)', type='warning', title='Hidden directory', closable, my-4)
    | This hidden directory is for internal use of the FlareDrive application.
    | It's strongly recommended to not upload or delete files in this directory.

  //- file browser
  NSkeleton(v-if='!payload', height='200px')
  NSpin(v-else, :show='isLoading')
    BrowserListView(
      v-if='currentLayout === "list"',
      :payload='filteredPayload',
      @navigate='onNavigate',
      @delete='onDelete',
      @download='onDownload',
      @rename='onRename'
    )
    BrowserGalleryView(
      v-if='currentLayout === "gallery"',
      :payload='filteredPayload',
      @navigate='onNavigate',
      @delete='onDelete',
      @download='onDownload',
      @rename='onRename'
    )
    BrowserBookView(
      v-if='currentLayout === "book"',
      :payload='payload',
      @navigate='onNavigate',
      @delete='onDelete',
      @download='onDownload',
      @rename='onRename'
    )

  //- readme
  BrowserReadmeCard#readme(
    v-if='readmeItem && currentLayout !== "book"',
    :item='readmeItem',
    :content='readmeContent',
    my-4,
    @navigate='onNavigate'
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

  //- upload progress
  NCard(
    :content-style='{ padding: "0.5rem" }',
    size='small',
    fixed,
    left='50%',
    w-860px,
    max-w-90vw,
    translate-x='-50%',
    z-50,
    transition='all ease-in-out',
    :style='bucket.isUploading ? { bottom: "1rem", opacity: "1", transitionDuration: "0.25s" } : { bottom: "-10rem", opacity: "0", transitionDelay: "3s", transitionDuration: "0.75s" }'
  )
    UploadProgress

  //- floating action button
  NFloatButton(type='primary', menu-trigger='hover', position='fixed', bottom='3rem', right='2rem', z-2)
    NIcon: IconPlus
    template(#menu)
      NTooltip(
        v-for='(action, index) in pathActions',
        :key='index',
        placement='left',
        :show-arrow='false',
        :keep-alive-on-hover='false'
      )
        template(#default) {{ action.tooltip }}
        template(#trigger)
          NFloatButton(:type='action.type', @click='action.action')
            NSpin(v-if='action.loading', show, :size='16')
            NIcon(v-else): component(:is='action.icon')

  //- debug info
  details.dev-only.bg-dev.mt-6
    NP path: {{ currentPath }}
    pre {{ payload }}
</template>

<script setup lang="tsx">
import { type R2BucketListResponse } from '@/models/R2BucketClient'
import { FileHelper } from '@/utils/FileHelper'
import type { R2Object } from '@cloudflare/workers-types/2023-07-01'
import {
  IconBook,
  IconChevronCompactDown,
  IconChevronCompactUp,
  IconCloudBolt,
  IconCloudUpload,
  IconFilter,
  IconFolderPlus,
  IconHistory,
  IconLibraryPhoto,
  IconList,
  IconPlus,
  IconReload,
  IconSearch,
  IconUpload,
} from '@tabler/icons-vue'
import { NFormItem, NInput, NSkeleton, useMessage, useModal } from 'naive-ui'
import type { Component } from 'vue'

definePage({
  name: '@browser',
})

// Async components
const BrowserReadmeCard = defineAsyncComponent(() => import('@/components/Browser/BrowserReadmeCard.vue'))
const BrowserPreviewModal = defineAsyncComponent(() => import('@/components/Browser/BrowserPreviewModal.vue'))
const BrowserUploadHistory = defineAsyncComponent(() => import('@/components/Browser/BrowserUploadHistory.vue'))
const UploadProgress = defineAsyncComponent(() => import('@/components/UploadProgress.vue'))

const route = useRoute()
const router = useRouter()
const lastRoute = useLocalStorage('flaredrive:last-route', '/')

onMounted(async () => {
  await nextTick()
  if (lastRoute.value && route.path === '/' && route.fullPath !== lastRoute.value) {
    router.replace(lastRoute.value)
  }
})
onBeforeRouteUpdate((to) => {
  if (to.name === '@browser') {
    lastRoute.value = to.fullPath
  }
})

const nmodal = useModal()
const nmessage = useMessage()

/** route path without leading slash */
const currentPath = computed(() => {
  const paramPath: string[] | string = (route.params as any).path || ''
  if (Array.isArray(paramPath)) {
    return paramPath.join('/')
  } else {
    return decodeURIComponent(paramPath)
  }
})

const currentLayout = useLocalStorage('flaredrive:current-layout', 'list')
const layoutOptions = ref<{ label: string; value: string; icon?: Component; tooltip?: string }[]>([
  { label: 'List', value: 'list', icon: IconList, tooltip: `Basic data list. Easy to organize files.` },
  {
    label: 'Gallery',
    value: 'gallery',
    icon: IconLibraryPhoto,
    tooltip: `Very good for folders with lots of pictures and movies.`,
  },
  {
    label: 'Book',
    value: 'book',
    icon: IconBook,
    tooltip: `Browse this folder as a book. Helpful when reading comics, mangas or novels.`,
  },
])
watch(currentLayout, (newLayout) => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
})

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
  currentPath,
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
    const { data } = await bucket.list(currentPath.value)
    payload.value = data
  } catch (error) {
    console.error('Error fetching data:', error)
    payload.value = undefined
  } finally {
    isLoading.value = false
  }
}

const isShowTopStickyRail = useLocalStorage('flaredrive:top-sticky-rail/show', true)

const searchInput = ref('')
const filteredPayload = computed(() => {
  if (!payload.value) return payload.value!
  if (!searchInput.value) return payload.value!
  const searchStr = searchInput.value.toLowerCase()
  const filteredObjects = payload.value.objects.filter((item) => {
    return item.key?.toLowerCase().includes(searchStr)
  })
  return {
    ...payload.value,
    objects: filteredObjects,
    folders: [],
  }
})

const isShowPreview = ref(false)
const previewItem = ref<R2Object | undefined>()
function onNavigate(item: R2Object) {
  const path = item.key || ''
  if (path === '/' || path === '') {
    router.push('/')
  } else if (path === '../') {
    const parentPath = currentPath.value.split('/').slice(0, -2).join('/')
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
    type: 'error',
    preset: 'confirm',
    content: () => {
      return (
        <div>
          Are you sure you want to delete <code>{item.key.split('/').pop()}</code>?
        </div>
      )
    },
    positiveText: 'Delete',
    negativeText: 'Keep the file',
    onPositiveClick() {
      bucket
        .deleteFile(item)
        .then(() => {
          nmessage.success('File deleted successfully')
          payload.value?.objects.splice(payload.value.objects.indexOf(item), 1)
          isShowPreview.value = false
        })
        .catch((err) => {
          nmessage.error(`Failed to delete file: ${err}`)
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
  nmodal.create({
    title: 'Rename File',
    preset: 'confirm',
    autoFocus: true,
    content: () => {
      return (
        <NFormItem label="New Name (including path)">
          <NInput value={toPathInput.value} onUpdateValue={(e) => (toPathInput.value = e)} clearable />
        </NFormItem>
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
          // @ts-ignore
          item.key = toPath
          // @ts-ignore
          item.uploaded = new Date().toISOString()
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
    autoFocus: true,
    content: () => {
      return (
        <NFormItem label="Folder Name">
          <NInput value={folderNameInput.value} onUpdateValue={(e) => (folderNameInput.value = e)} clearable>
            {{
              prefix: () => (
                <>
                  /
                  {currentPath.value.length > 12
                    ? currentPath.value.slice(0, 6) + '...' + currentPath.value.slice(-6)
                    : currentPath.value}
                </>
              ),
            }}
          </NInput>
        </NFormItem>
      )
    },
    positiveText: 'Create',
    negativeText: 'Cancel',
    onPositiveClick() {
      let folderName = folderNameInput.value.replace(/\/+$/, '')
      if (!folderName) {
        nmessage.error('Folder name cannot be empty')
        return false
      }
      if (folderName.startsWith('.') || folderName.startsWith('/')) {
        nmessage.error('Invalid folder name')
        return false
      }
      router.push(`/${currentPath.value}${folderName}/`)
    },
  })
}

function handleUploadInput(files: FileList | File[] | null, prefix = currentPath.value) {
  if (!files || !files.length) {
    return
  }
  files = Array.isArray(files) ? files : Array.from(files)
  files = files?.filter((file) => {
    return !!file.name
  })
  nmessage.info(
    files.length > 1 || bucket.currentBatchTotal
      ? `Added ${files.length} files to queue...`
      : `Uploading ${files[0].name}...`
  )
  files.forEach((file) => {
    const fileName = file.name
    if (fileName) {
      const { promise } = bucket.addToUploadQueue(`${prefix.replace(/\/+$/, '')}/${fileName}`, file)
      promise.then((item) => {
        if (!item) {
          nmessage.error(`Failed to upload file ${fileName}`)
        }
      })
    }
  })
}
const { isOverDropZone } = useDropZone(document.body, {
  multiple: true,
  onDrop(files) {
    handleUploadInput(files)
  },
})
const fileDialog = useFileDialog({
  multiple: true,
  accept: '*',
})
let __markAsRandomMode = false
function createUploadModal(randomMode = false) {
  typeof randomMode === 'boolean' && (__markAsRandomMode = randomMode)
  fileDialog.reset()
  fileDialog.open()
}
fileDialog.onChange((files) => {
  handleUploadInput(files, __markAsRandomMode ? RANDOM_UPLOAD_DIR : currentPath.value)
})

// Reload file list when upload finished
watch(
  computed(() => bucket.isUploading),
  (newState, oldState) => {
    if (oldState && !newState) {
      loadFileList()
      if (bucket.currentBatchTotal > 1) {
        nmessage.success(`Upload finished, ${bucket.currentBatchTotal} files uploaded`)
      } else {
        const item = bucket.uploadHistory[0]
        if (!item) return
        const { name } = FileHelper.getSimpleFileInfoByObject(item)
        nmessage.success(`Successfully uploaded ${name}`)
      }
    }
  }
)

const isShowUploadHistory = ref(false)

const pathActions = computed<
  {
    label: string
    type?: 'primary' | 'default'
    tooltip: string
    icon: Component
    loading?: boolean
    action: () => void
  }[]
>(() => {
  return [
    {
      label: 'Upload',
      type: 'primary',
      tooltip: 'Upload files',
      icon: IconCloudUpload,
      action: () => createUploadModal(false),
    },
    {
      label: '',
      type: 'primary',
      tooltip: 'Upload files with random name',
      icon: IconCloudBolt,
      action: () => createUploadModal(true),
    },
    {
      label: '',
      tooltip: 'Create folder',
      icon: IconFolderPlus,
      action: handleCreateFolder,
    },
    {
      label: '',
      tooltip: 'Upload history',
      icon: IconHistory,
      action: () => (isShowUploadHistory.value = true),
    },
    {
      label: '',
      tooltip: 'Refresh file list',
      icon: IconReload,
      loading: isLoading.value,
      action: () => {
        loadFileList().then(() => nmessage.success('Refresh success'))
      },
    },
  ]
})

const cachedReadme = new Map<string, string>()
const readmeContent = ref('')
const readmeItem = computed(() => {
  return payload?.value?.objects?.find(
    (item) => item.key.toLowerCase() === 'readme.md' || item.key.toLowerCase().endsWith('/readme.md')
  )
})
watch(
  readmeItem,
  (item, prevItem) => {
    if (!item) {
      readmeContent.value = ''
      return
    }
    if (item.key === prevItem?.key) {
      return
    }
    readmeContent.value = ''
    if (cachedReadme.get(item.key)) {
      readmeContent.value = cachedReadme.get(item.key)!
    } else {
      fetchPlainText(item)
        .then((text) => {
          readmeContent.value = text
          cachedReadme.set(item.key, text)
        })
        .catch((error) => {
          console.error('Error fetching readme:', error)
        })
    }
  },
  { immediate: true }
)
const fetchPlainText = async (item: R2Object) => {
  if (!item) return ''
  const url = bucket.getCDNUrl(item)
  try {
    const response = await fetch(url)
    if (response.ok) {
      return response.text()
    } else {
      throw new Error('Network response was not ok')
    }
  } catch (error) {
    console.error('Error fetching readme:', error)
    return ''
  }
}
</script>

<style scoped lang="sass">
.top-sticky-rail .n-card, .top-sticky-rail-trigger
  backdrop-filter: blur(16px)
  background-color: rgba(245, 245, 245, 0.8)
  html.dark &
    background-color: rgba(23, 23, 23, 0.8)

.top-sticky-rail-trigger
  border: 1px solid rgba(0, 0, 0, 0.1)
  html.dark &
    border: 1px solid rgba(255, 255, 255, 0.125)
</style>
