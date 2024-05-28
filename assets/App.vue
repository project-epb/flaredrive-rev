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
      <input type="search" v-model="search" aria-label="Search" />
      <div class="menu-button">
        <button
          class="circle"
          @click="showMenu = true"
          :data-order="JSON.stringify({ orderField, orderSort })"
        >
          <TablerIcon name="dots" alt="..." />
        </button>
        <Menu
          v-model="showMenu"
          @click="onMenuClick"
          :items="[
            ...['name', 'size', 'date'].map((key) => {
              return {
                key,
                render() {
                  return h(
                    'div',
                    {
                      class: 'flex',
                      style: {
                        fontWeight: orderField === key ? 'bold' : 'normal',
                      },
                    },
                    [
                      h('span', key[0].toUpperCase() + key.slice(1)),
                      h('div', { class: 'flex-1' }),
                      // orderField === key ? (orderSort === 'asc' ? '↑' : '↓') : '',
                      orderField === key
                        ? h(TablerIcon, {
                            name:
                              orderSort === 'asc' ? 'arrow-up' : 'arrow-down',
                          })
                        : '',
                    ]
                  )
                },
              }
            }),
            { key: 'paste', text: 'Paste' },
          ]"
        />
      </div>
    </div>
    <ul class="file-list">
      <li v-if="cwd !== ''">
        <div
          tabindex="0"
          class="file-item"
          @click="cwd = cwd.replace(/[^\/]+\/$/, '')"
          @contextmenu.prevent
        >
          <div class="file-icon">
            <TablerIcon name="folder" type="filled" size="36" alt="Folder" />
          </div>
          <span class="file-name">..</span>
        </div>
      </li>
      <li v-for="folder in filteredFolders" :key="folder">
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
      <li v-for="file in currentShownFiles" :key="file.key">
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
    <div v-if="loading" style="margin-top: 12px; text-align: center">
      <span>Loading...</span>
    </div>
    <div
      v-else-if="!filteredFiles.length && !filteredFolders.length"
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
import { h, ref, computed, watch, onMounted } from 'vue'
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
import { useStorage } from '@vueuse/core'

// refs
const clipboard = ref(null)
const cwd = ref(new URL(window.location).searchParams.get('p') || '')
const files = ref([])
const folders = ref([])
const focusedItem = ref(null)
const loading = ref(false)
const orderField = useStorage('flaredrive:order/field', 'name')
const orderSort = useStorage('oflaredrive:rder/sort', 'asc')
const search = ref('')
const showContextMenu = ref(false)
const showMenu = ref(false)
const showUploadPopup = ref(false)
const uploadProgress = ref(null)
const uploadQueue = ref([])
const showUploadHistoryPopup = ref(false)
const uploadHistory = ref([])
const rawBaseURL = ref('https://r2.epb.wiki')
const isTouchDevice = 'ontouchstart' in window

// computed
const filteredFiles = computed(() => {
  let list = files.value
  if (search.value) {
    list = list.filter((file) =>
      file.key.split('/').pop().includes(search.value)
    )
  }
  return list
})
const filteredFolders = computed(() => {
  let list = folders.value
  if (search.value) {
    list = list.filter((folder) => folder.includes(search.value))
  }
  return list
})
const currentShownFiles = computed(() => {
  let list = filteredFiles.value
  orderField.value ??= 'name'
  list.sort((a, b) => {
    switch (orderField.value) {
      case 'name':
        return orderSort.value === 'asc'
          ? a.key.localeCompare(b.key)
          : b.key.localeCompare(a.key)
      case 'size':
        return orderSort.value === 'asc' ? a.size - b.size : b.size - a.size
      case 'date':
        return orderSort.value === 'asc'
          ? new Date(a.uploaded) - new Date(b.uploaded)
          : new Date(b.uploaded) - new Date(a.uploaded)
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
  files.value = []
  folders.value = []
  loading.value = true
  fetch(`/api/children/${cwd.value}`)
    .then((res) => res.json())
    .then((data) => {
      files.value = data.value
      folders.value = data.folders
      loading.value = false
    })
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
const onMenuClick = (item) => {
  const { key } = item
  const originalOrder = orderField.value
  switch (key) {
    case 'name':
      orderField.value = 'name'
      break
    case 'size':
      orderField.value = 'size'
      break
    case 'date':
      orderField.value = 'date'
      break
    case 'paste':
      return pasteFile()
  }
  if (originalOrder === orderField.value) {
    orderSort.value = orderSort.value === 'asc' ? 'desc' : 'asc'
  } else {
    orderSort.value = 'asc'
  }
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
  const { basedir, file } = uploadQueue.value.pop(0)
  let thumbnailDigest = null

  if (file.type.startsWith('image/') || file.type === 'video/mp4') {
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
    const finalFilePath = basedir.startsWith('-/')
      ? `-/${dateStr}/${await blobDigest(file)}.${
          file?.type.split('/').pop() || file?.name.split('.').pop()
        }`
      : `${basedir}${file.name}`
    const uploadUrl = `/api/write/items/${finalFilePath}`
    const headers = {}
    const onUploadProgress = (progressEvent) => {
      var percentCompleted = (progressEvent.loaded * 100) / progressEvent.total
      uploadProgress.value = percentCompleted
    }
    if (thumbnailDigest) headers['fd-thumbnail'] = thumbnailDigest
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
    const url = new URL(window.location)
    if ((url.searchParams.get('p') || '') !== val) {
      val ? url.searchParams.set('p', val) : url.searchParams.delete('p')
      window.history.pushState(null, '', url.toString())
    }
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
    const searchParams = new URL(window.location).searchParams
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
  height: 100%;
}

.app-bar {
  position: sticky;
  top: 0;
  padding: 8px 20px;
  background-color: white;
  display: flex;
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
</style>
