<template>
  <div class="main" @dragenter.prevent @dragover.prevent @drop.prevent="onDrop">
    <progress
      v-if="uploadProgress !== null"
      :value="uploadProgress"
      max="100"
    ></progress>
    <UploadPopup
      v-model="showUploadPopup"
      @upload="onUploadClicked"
      @createFolder="createFolder"
    ></UploadPopup>
    <button class="upload-button circle" @click="showUploadPopup = true">
      <TablerIcon
        style="filter: invert(100%)"
        name="cloud-upload"
        size="36"
        alt="Upload"
        @contextmenu.prevent
      />
    </button>
    <UploadHistoryPopup
      v-model:show="showUploadHistoryPopup"
      v-model:list="uploadHistory"
    ></UploadHistoryPopup>
    <button
      class="upload-button circle"
      @click="showUploadHistoryPopup = true"
      style="background: #41b883; right: 80px"
    >
      <TablerIcon
        style="filter: invert(100%)"
        name="history"
        size="36"
        alt="Upload History"
        @contextmenu.prevent
      />
    </button>
    <div class="app-bar">
      <input
        type="search"
        placeholder="Search files"
        v-model="searchInput"
        aria-label="Search"
        autocomplete="false"
      />
      <div class="menu-button">
        <button class="circle" @click="showDisplayModeMenu = true">
          <TablerIcon name="category" alt="cate" />
        </button>
        <Menu
          v-model="showDisplayModeMenu"
          @click="onDisplayModeMenuClick"
          :items="displayModeMenuItems"
        />

        <button class="circle" @click="showSortMenu = true">
          <TablerIcon name="arrows-sort" alt="sort" />
        </button>
        <Menu
          v-model="showSortMenu"
          @click="onSortMenuClick"
          :items="sortMenuItems"
          :close-after-click="false"
        />
      </div>
    </div>

    <!-- bread crumb -->
    <div class="bread-crumb">
      <a
        class="bread-crumb-link bread-crumb-home"
        :href="`/?p=`"
        @click.prevent="
          () => {
            cwd = ''
          }
        "
      >
        <TablerIcon name="home" type="filled" size="22" alt="Home" />
      </a>
      <template
        v-for="(part, index) in cwd.split('/').filter(Boolean)"
        :key="index"
      >
        <span class="bread-crumb-sep">/</span>
        <a
          class="bread-crumb-link"
          :href="`/?p=${cwd
            .split('/')
            .slice(0, index + 1)
            .join('/')}/`"
          @click.prevent="
            () => {
              cwd =
                cwd
                  .split('/')
                  .slice(0, index + 1)
                  .join('/') + '/'
            }
          "
        >
          {{ part }}
        </a>
      </template>
      <div style="flex: 1"></div>
      <div>
        {{ cwdFiles.length }}
        {{ cwdFiles.length > 1 ? 'files' : 'file' }}
      </div>
    </div>

    <!-- grid mode -->
    <ul class="file-list" v-if="displayMode === 'grid'">
      <li
        :style="
          cwd === ''
            ? { opacity: 0.5, pointerEvents: 'none', userSelect: 'none' }
            : ''
        "
      >
        <div
          tabindex="0"
          class="file-item"
          @click="cwd = cwd.replace(/[^\/]+\/$/, '')"
          @contextmenu.prevent
        >
          <div class="file-icon">
            <TablerIcon name="folder" size="36" alt="Folder" />
          </div>
          <span class="file-name">{{ cwd === '' ? '/(root)' : '..' }}</span>
        </div>
      </li>
      <li v-for="folder in finalFolderList" :key="folder">
        <div
          tabindex="0"
          class="file-item"
          @click="cwd = folder"
          @contextmenu.prevent="
            () => {
              showContextMenu = true
              focusedItem = folder
            }
          "
        >
          <div class="file-icon">
            <TablerIcon name="folder" type="filled" size="36" alt="Folder" />
          </div>
          <span
            class="file-name"
            v-text="folder.match(/.*?([^/]*)\/?$/)[1]"
          ></span>
        </div>
      </li>
      <li v-for="file in finalFileList" :key="file.key">
        <a
          class="file-link"
          :href="`${rawBaseURL}/${file.key}`"
          target="_blank"
          style="flex: 1"
          @contextmenu.prevent="
            () => {
              showContextMenu = true
              focusedItem = file
            }
          "
        >
          <div class="file-item">
            <MimeIcon
              class="file-icon"
              :content-type="file.httpMetadata.contentType"
              :filename="file.key.split('/').pop()"
              :thumbnail="
                file.customMetadata.thumbnail
                  ? `${rawBaseURL}/_$flaredrive$/thumbnails/${file.customMetadata.thumbnail}.png`
                  : null
              "
            />
            <div class="file-info">
              <div class="file-name" v-text="file.key.split('/').pop()"></div>
              <div class="file-attr">
                <span v-text="new Date(file.uploaded).toLocaleString()"></span>
                <span v-text="formatSize(file.size)"></span>
              </div>
            </div>
            <button
              v-if="isTouchDevice"
              class="file-action"
              @click="
                (e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  showContextMenu = true
                  focusedItem = file
                }
              "
            >
              <TablerIcon name="dots" />
            </button>
          </div>
        </a>
      </li>
    </ul>

    <!-- gallery mode -->
    <ul class="file-gallery" v-else-if="displayMode === 'gallery'">
      <li
        :style="
          cwd === ''
            ? { opacity: 0.5, pointerEvents: 'none', userSelect: 'none' }
            : ''
        "
      >
        <a
          class="file-image-link"
          @click="cwd = cwd.replace(/[^\/]+\/$/, '')"
          href="javascript:;"
          @contextmenu.prevent="() => {}"
        >
          <div class="file-image">
            <TablerIcon name="folder" size="200" alt="Parent" />
          </div>
          <div class="file-name">{{ cwd === '' ? '/' : '..' }}</div>
          <div class="file-attr">
            <span>{{ cwd === '' ? '/(root)' : 'parent folder' }}</span>
          </div>
        </a>
      </li>
      <li v-for="folder in finalFolderList" :key="folder">
        <a
          class="file-image-link"
          @click="cwd = folder"
          href="javascript:;"
          @contextmenu.prevent="
            () => {
              showContextMenu = true
              focusedItem = folder
            }
          "
        >
          <div class="file-image">
            <TablerIcon name="folder" type="filled" size="200" alt="Folder" />
          </div>
          <div class="file-name">{{ folder.match(/.*?([^/]*)\/?$/)[1] }}</div>
          <div class="file-attr">
            <span>folder</span>
          </div>
        </a>
      </li>
      <li v-for="file in finalFileList" :key="file.key">
        <a
          :data-info="JSON.stringify(file)"
          class="file-image-link"
          :href="`${rawBaseURL}/${file.key}`"
          target="_blank"
          style="flex: 1"
          @contextmenu.prevent="
            () => {
              showContextMenu = true
              focusedItem = file
            }
          "
        >
          <div class="file-image">
            <img
              v-if="
                file.httpMetadata?.contentType?.startsWith?.('image/') ||
                /\.(jpg|png|gif|webp|svg)$/.test(file.key)
              "
              loading="lazy"
              :src="`${imageThumbBaseURL}/${file.key}`"
            />
            <MimeIcon
              v-else
              :content-type="file.httpMetadata.contentType"
              :filename="file.key.split('/').pop()"
              :thumbnail="
                file.customMetadata.thumbnail
                  ? `${rawBaseURL}/_$flaredrive$/thumbnails/${file.customMetadata.thumbnail}.png`
                  : null
              "
            />
          </div>
          <div class="file-name" v-text="file.key.split('/').pop()"></div>
          <div class="file-attr">
            <span v-text="new Date(file.uploaded).toLocaleString()"></span>
            <span v-text="formatSize(file.size)"></span>
          </div>
        </a>
      </li>
    </ul>

    <div v-if="loading" style="margin-top: 12px; text-align: center">
      <span>Loading...</span>
    </div>
    <div
      v-else-if="!searchFilteredFiles.length && !finalFolderList.length"
      style="margin-top: 12px; text-align: center"
    >
      <span>No files</span>
    </div>
    <Dialog v-model="showContextMenu">
      <div
        v-text="focusedItem.key || focusedItem"
        class="contextmenu-filename"
        @click.stop.prevent
      ></div>
      <ul v-if="typeof focusedItem === 'string'" class="contextmenu-list">
        <li>
          <button @click="copyLink(`/?p=${encodeURIComponent(focusedItem)}`)">
            <span>Copy Link</span>
          </button>
        </li>
        <li>
          <button
            style="color: red"
            @click="removeFile(focusedItem + '_$folder$')"
          >
            <span>Remove</span>
          </button>
        </li>
      </ul>
      <ul v-else class="contextmenu-list">
        <li>
          <button @click="renameFile(focusedItem.key)">
            <span>Rename</span>
          </button>
        </li>
        <li>
          <button @click="clipboard = focusedItem.key">
            <span>Copy</span>
          </button>
        </li>
        <li>
          <a
            :href="`${rawBaseURL}/${focusedItem.key}`"
            target="_blank"
            download
          >
            <span>Download</span>
          </a>
        </li>
        <li>
          <button @click="copyLink(`${rawBaseURL}/${focusedItem.key}`)">
            <span>Copy Link</span>
          </button>
        </li>
        <li>
          <button style="color: red" @click="removeFile(focusedItem.key)">
            <span>Remove</span>
          </button>
        </li>
      </ul>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { h, ref, computed, watch, onMounted, VNode } from 'vue'
import {
  generateThumbnail,
  blobDigest,
  multipartUpload,
  SIZE_LIMIT,
} from './main.mjs'
import Dialog from './components/Dialog.vue'
import Menu from './components/Menu.vue'
import MimeIcon from './components/MimeIcon.vue'
import UploadPopup from './components/UploadPopup.vue'
import UploadHistoryPopup from './components/UploadHistoryPopup.vue'
import TablerIcon from './components/TablerIcon.vue'
import { useStorage, useUrlSearchParams } from '@vueuse/core'

// refs
const clipboard = ref(null)
const searchParams = useUrlSearchParams()
const cwd = computed({
  get: () => (searchParams.p || '')?.toString(),
  set: (val) => {
    searchParams.p = val || ''
  },
})
const cwdFiles = ref([])
const cwdFolders = ref([])
const focusedItem = ref(null)
const loading = ref(false)
const orderField = useStorage('flaredrive:order/field', 'name')
const orderSort = useStorage('oflaredrive:order/sort', 'asc')
const searchInput = ref('')
const showContextMenu = ref(false)
const showUploadPopup = ref(false)
const uploadProgress = ref(null)
const uploadQueue = ref([])
const showUploadHistoryPopup = ref(false)
const uploadHistory = ref([])
const rawBaseURL = computed(() =>
  location.host.includes('localhost')
    ? new URL('/raw', window.location.origin).toString()
    : 'https://r2.epb.wiki'
)
const imageThumbBaseURL = computed(() =>
  location.host.includes('localhost')
    ? new URL('/raw', window.location.origin).toString()
    : 'https://r2.epb.wiki/cdn-cgi/image/format=auto,fit=contain,width=600,height=600,onerror=redirect'
)
const isTouchDevice = 'ontouchstart' in window

// computed
const searchFilteredFiles = computed(() => {
  let list = cwdFiles.value.filter((file) => !!file?.key)
  if (searchInput.value) {
    list = list.filter((file) =>
      file.key.split('/').pop().includes(searchInput.value)
    )
  }
  return list
})
const finalFolderList = computed(() => {
  let list = cwdFolders.value.filter(Boolean)
  if (searchInput.value) {
    list = list.filter((folder) => folder.includes(searchInput.value))
  }
  return list
})
const finalFileList = computed(() => {
  let list = searchFilteredFiles.value
  orderField.value ??= 'name'
  list = list.sort((a, b) => {
    switch (orderField.value) {
      case 'name':
        return orderSort.value === 'asc'
          ? a.key.localeCompare(b.key)
          : b.key.localeCompare(a.key)
      case 'size':
        return orderSort.value === 'asc' ? a.size - b.size : b.size - a.size
      case 'date':
        const aTime = new Date(a.uploaded).getTime()
        const bTime = new Date(b.uploaded).getTime()
        return orderSort.value === 'asc' ? aTime - bTime : bTime - aTime
    }
  })
  return list
})

// methods
const copyLink = (link) => {
  const url = new URL(link, window.location.origin)
  navigator.clipboard.writeText(url.toString())
}
const copyPaste = async (source, target) => {
  const uploadUrl = `/api/write/items/${target}`
  await axios.put(uploadUrl, '', {
    headers: { 'x-amz-copy-source': encodeURIComponent(source) },
  })
}
const createFolder = async () => {
  try {
    const folderName = window.prompt('Folder name')
    if (!folderName) return
    showUploadPopup.value = false
    const uploadUrl = `/api/write/items/${cwd.value}${folderName}/_$folder$`
    await axios.put(uploadUrl, '')
    fetchFiles()
  } catch (error) {
    fetch('/api/write/')
      .then((value) => {
        if (value.redirected) window.location.href = value.url
      })
      .catch(() => {})
    console.log(`Create folder failed`)
  }
}
const fetchFiles = async () => {
  cwdFiles.value = []
  cwdFolders.value = []
  loading.value = true
  fetch(`/api/children/${cwd.value}`)
    .then((res) => res.json())
    .then(
      (data: {
        value: Array<{
          key: string
          size: number
          uploaded: string
          httpMetadata: { contentType: string }
          customMetadata: { thumbnail?: string }
        }>
        folders: Array<string>
      }) => {
        cwdFiles.value = data.value
        cwdFolders.value = data.folders
        loading.value = false
      }
    )
}
const formatSize = (size) => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  while (size >= 1024) {
    size /= 1024
    i++
  }
  return `${size.toFixed(1)} ${units[i]}`
}
const onDrop = (ev) => {
  let files
  if (ev.dataTransfer.items) {
    files = [...ev.dataTransfer.items]
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
  } else files = ev.dataTransfer.files
  uploadFiles(files)
}

const showSortMenu = ref(false)
const sortMenuItems = computed<{ key: string; render: () => VNode }[]>(() =>
  ['name', 'size', 'date'].map((key) => {
    return {
      key,
      render() {
        return h(
          'div',
          {
            class: 'flex',
            style: {
              fontWeight: orderField.value === key ? 'bold' : 'normal',
            },
          },
          [
            h('span', key[0].toUpperCase() + key.slice(1)),
            h('div', { class: 'flex-1' }),
            orderField.value === key
              ? h(TablerIcon, {
                  name: orderSort.value === 'asc' ? 'arrow-up' : 'arrow-down',
                })
              : '',
          ]
        )
      },
    }
  })
)
const onSortMenuClick = ({ key }: { key: string }) => {
  const originalOrder = orderField.value
  if (['name', 'date', 'size'].includes(key)) {
    orderField.value = key
  } else {
    orderField.value = 'name'
  }
  if (originalOrder === orderField.value) {
    orderSort.value = orderSort.value === 'asc' ? 'desc' : 'asc'
  } else {
    orderSort.value = 'asc'
  }
}

const showDisplayModeMenu = ref(false)
const displayMode = useStorage('flaredrive:display-mode', 'grid')
const displayModeMenuItems = computed(() => {
  return ['grid', 'gallery'].map((key) => {
    return {
      key,
      render() {
        return h(
          'div',
          {
            class: 'flex',
            style: {
              fontWeight: key === displayMode.value ? 'bold' : 'normal',
            },
          },
          [
            h('div', { class: 'flex-1' }, key[0].toUpperCase() + key.slice(1)),
            key === displayMode.value
              ? h(TablerIcon, {
                  name: 'check',
                })
              : '',
          ]
        )
      },
    }
  })
})
const onDisplayModeMenuClick = (item) => {
  const { key } = item
  displayMode.value = key
}

const onUploadClicked = (fileElement) => {
  if (!fileElement.value) return
  uploadFiles(fileElement.files)
  showUploadPopup.value = false
  fileElement.value = null
}
const pasteFile = async () => {
  if (!clipboard.value) return
  let newName = window.prompt('Rename to:')
  if (newName === null) return
  if (newName === '') newName = clipboard.value.split('/').pop()
  await copyPaste(clipboard.value, `${cwd.value}${newName}`)
  fetchFiles()
}
const processUploadQueue = async () => {
  if (!uploadQueue.value.length) {
    fetchFiles()
    uploadProgress.value = null
    return
  }

  /** @type File **/
  const { basedir, file } = uploadQueue.value.pop()
  let thumbnailDigest = null

  if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
    try {
      const thumbnailBlob = await generateThumbnail(file)
      const digestHex = await blobDigest(thumbnailBlob)

      const thumbnailUploadUrl = `/api/write/items/_$flaredrive$/thumbnails/${digestHex}.png`
      try {
        await axios.put(thumbnailUploadUrl, thumbnailBlob)
        thumbnailDigest = digestHex
      } catch (error) {
        fetch('/api/write/')
          .then((value) => {
            if (value.redirected) window.location.href = value.url
          })
          .catch(() => {})
        console.log(`Upload ${digestHex}.png failed`)
      }
    } catch (error) {
      console.log(`Generate thumbnail failed`)
    }
  }

  try {
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '/')
    const isQuickUpload = basedir.startsWith('-/')
    const finalFilePath = isQuickUpload
      ? `-/${dateStr}/${await blobDigest(file)}.${
          file.name.split('.').pop() || file.type.split('/').pop()
        }`
      : `${basedir}${file.name}`
    const uploadUrl = `/api/write/items/${finalFilePath}`
    const headers = {}
    const onUploadProgress = (progressEvent) => {
      var percentCompleted = (progressEvent.loaded * 100) / progressEvent.total
      uploadProgress.value = percentCompleted
    }
    if (thumbnailDigest) headers['x-amz-meta-thumbnail'] = thumbnailDigest
    if (file.size >= SIZE_LIMIT) {
      await multipartUpload(`${finalFilePath}`, file, {
        headers,
        onUploadProgress,
      })
    } else {
      await axios.put(uploadUrl, file, { headers, onUploadProgress })
    }
    uploadHistory.value = [
      ...uploadHistory.value.filter((item) => item.key !== finalFilePath),
      {
        key: finalFilePath,
        time: Date.now(),
        url: `${rawBaseURL.value}/${finalFilePath}`,
        thumbUrl: thumbnailDigest
          ? `${rawBaseURL.value}/_$flaredrive$/thumbnails/${thumbnailDigest}.png`
          : null,
      },
    ]
  } catch (error) {
    fetch('/api/write/')
      .then((value) => {
        if (value.redirected) window.location.href
      })
      .catch(() => {})
    console.log(`Upload ${file.name} failed`, error)
  }
  setTimeout(processUploadQueue)
}
const removeFile = async (key) => {
  if (!window.confirm(`Delete ${key} permanently?`)) return
  await axios.delete(`/api/write/items/${key}`)
  fetchFiles()
}
const renameFile = async (key) => {
  const newName = window.prompt('Rename to:')
  if (!newName) return
  await copyPaste(key, `${cwd.value}${newName}`)
  await axios.delete(`/api/write/items/${key}`)
  fetchFiles()
}
const uploadFiles = (files) => {
  if (cwd.value && !cwd.value.endsWith('/')) cwd.value += '/'

  const uploadTasks = Array.from(files).map((file) => ({
    basedir: cwd.value,
    file,
  }))
  uploadQueue.value.push(...uploadTasks)
  setTimeout(() => processUploadQueue())
}

// watch
watch(
  cwd,
  (val) => {
    fetchFiles()
    document.title = `${val.replace(/.*\/(?!$)|\//g, '') || '/'} - FlareDrive`
  },
  { immediate: true }
)
watch(uploadHistory, (val) => {
  if (!val) return
  if (val.length > 100) {
    uploadHistory.value = val.slice(-100)
  }
  localStorage.setItem('flaredrive:upload-history', JSON.stringify(val))
})

// created
onMounted(() => {
  window.addEventListener('popstate', (ev) => {
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get('p') !== cwd.value)
      cwd.value = searchParams.get('p') || ''
  })

  const localUploadHistory = localStorage.getItem('flaredrive:upload-history')
  try {
    uploadHistory.value = JSON.parse(localUploadHistory) || []
  } catch (error) {
    console.log('Parse local storage failed', error)
  }
})
</script>

<style>
.main {
  min-height: 100vh;
}

.app-bar {
  position: sticky;
  top: 0;
  padding: 8px 20px;
  background-color: white;
  display: flex;
  z-index: 10;
}

.upload-button {
  z-index: 1;
}

.menu-button {
  display: flex;
  position: relative;
  margin-left: 4px;
}

.menu-button > button {
  transition: background-color 0.2s ease;
}

.menu-button > button:hover {
  background-color: whitesmoke;
}

.menu {
  position: absolute;
  top: 100%;
  right: 0;
}

/* bread crumb */
.bread-crumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 8px;
  margin: 0 20px 1em 20px;
  border: 1px solid rgba(100, 100, 100, 0.25);
  border-radius: 8px;
}
.bread-crumb > a,
.bread-crumb > span {
  display: inline-flex;
  justify-content: center;
  align-items: center;
}
.bread-crumb .bread-crumb-sep {
  font-size: 0.8em;
  color: #888;
}
.bread-crumb .bread-crumb-link:last-of-type {
  text-decoration: underline;
}

/* gallery mode */
.file-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
  padding: 0 12px;
}
@media (max-width: 768px) {
  .file-gallery {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
}
@media (max-width: 420px) {
  .file-gallery {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
}
.file-gallery li {
  list-style: none;
}
.file-gallery a {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  padding: 8px;
  border-radius: 6px;
  background-color: white;
  transition: background-color 0.2s ease;
}
.file-gallery a:hover {
  background-color: whitesmoke;
}
.file-gallery .file-image {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 100%;
}
.file-gallery .file-image img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.file-gallery .file-image .mime-icon {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
