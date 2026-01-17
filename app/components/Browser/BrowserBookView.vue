<template lang="pug">
.browser-book-view
  .book-container(v-if='!loading && (imageItems.length > 0 || textItems.length > 0)')
    NCard.mb-6
      template(#header='')
        .flex.items-center.justify-between
          .flex.items-center.gap-3
            NButton(v-if='currentPrefix', quaternary, @click='$emit("navigate", "..")')
              template(#icon)
                Icon(name='i-lucide-arrow-left')
            .text-xl.font-bold {{ bookTitle }}
          .flex.items-center.gap-2
            NTag(type='primary', :bordered='false')
              | {{ imageItems.length }} 张图片
            NTag(v-if='textItems.length', type='info', :bordered='false')
              | {{ textItems.length }} 个文档

    .book-pages.space-y-8
      //- 图片页面
      .book-page(v-for='(item, index) in imageItems', :key='item.key')
        .page-number.text-center.text-sm.text-gray-400.mb-2(class='dark:text-gray-500') 第 {{ index + 1 }} 页

        .page-image.flex.justify-center
          img.max-w-full.h-auto.rounded-lg.shadow-lg(
            :src='item.cdnUrl',
            :alt='item.displayName',
            loading='lazy',
            @click='handleImageClick(item, index)'
          )

        .page-info.text-center.mt-2.text-sm.text-gray-500(class='dark:text-gray-400') {{ item.displayName }}

      //- 文本页面
      .book-page.text-page(v-for='(item, index) in textItems', :key='item.key')
        NDivider.my-6
          .text-lg.font-medium {{ item.displayName }}

        .page-content.prose.prose-gray.max-w-none.mx-auto(class='dark:prose-invert')
          .text-center.py-8(v-if='!textContents[item.key]')
            Icon.size-8.text-gray-400.animate-spin(name='i-lucide-loader')
          .whitespace-pre-wrap(v-else) {{ textContents[item.key] }}

        .text-center.mt-6.text-sm.text-gray-400.select-none(class='dark:text-gray-500') --- EOF ---

    //- 文件夹导航
    .folder-navigation(v-if='folders.length > 0')
      NCard.mt-6
        template(#header='')
          .text-lg.font-medium 相关文件夹

        .grid.grid-cols-2.gap-3(class='md:grid-cols-3 lg:grid-cols-4')
          NCard.cursor-pointer.transition-all(
            v-for='folder in folders',
            :key='folder',
            class='hover:shadow-md',
            @click='$emit("navigate", folder)',
            size='small'
          )
            .flex.items-center.gap-3
              Icon.text-amber-500(name='i-lucide-folder', size='24')
              .flex-1.min-w-0.truncate {{ getFolderName(folder) }}

  .flex.justify-center.py-20(v-else-if='loading')
    .text-center
      Icon.size-12.text-gray-400.mb-4.animate-spin(name='i-lucide-loader')
      p.text-gray-500(class='dark:text-gray-400') 加载中...

  NAlert(v-else, type='info', title='无可显示内容')
    template(#default)
      | 漫画视图仅显示图片和文本文件，当前目录暂无此类内容
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NButton, NCard, NTag, NDivider, NAlert } from 'naive-ui'
import type { S3ObjectInfo } from '~/composables/bucket'

type BookViewItem = S3ObjectInfo & { displayName: string; cdnUrl: string }

interface Props {
  objects: S3ObjectInfo[]
  prefixes: string[]
  currentPrefix: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  navigate: [item: S3ObjectInfo | string]
  preview: [item: S3ObjectInfo]
}>()

// 书名
const bookTitle = computed(() => {
  if (!props.currentPrefix) return '根目录'

  const pathParts = props.currentPrefix.split('/').filter(Boolean)
  const currentPart = pathParts[pathParts.length - 1]

  // 尝试找到最后一个非纯数字的文件夹名作为书名
  const bookName = [...pathParts].reverse().find((part) => !/^\d+$/.test(part))

  if (!bookName || bookName === currentPart) {
    return currentPart || '未命名'
  }

  return `${bookName} - ${currentPart}`
})

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

// 过滤出图片文件
const imageItems = computed(() => {
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']

  return props.objects
    .filter((obj) => {
      const ext = getFileExtension(obj.key)
      return imageExts.includes(ext)
    })
    .map((obj) => ({
      ...obj,
      displayName: obj.key.split('/').slice(-1)[0] || '',
      cdnUrl: getCDNUrl(obj),
    }))
    .sort((a, b) => a.key.localeCompare(b.key, 'zh-CN'))
})

// 过滤出文本文件
const textItems = computed(() => {
  const textExts = ['txt', 'md', 'json', 'xml', 'yml', 'yaml', 'css', 'html', 'js', 'ts', 'log']

  return props.objects
    .filter((obj) => {
      const ext = getFileExtension(obj.key)
      return textExts.includes(ext)
    })
    .map((obj) => ({
      ...obj,
      displayName: obj.key.split('/').slice(-1)[0] || '',
      cdnUrl: getCDNUrl(obj),
    }))
    .sort((a, b) => a.key.localeCompare(b.key, 'zh-CN'))
})

// 文件夹列表
const folders = computed(() => {
  return props.prefixes.sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

// 文本内容缓存
const textContents = ref<Record<string, string>>({})

// 加载文本内容
async function loadTextContent(item: BookViewItem) {
  if (textContents.value[item.key]) return

  try {
    const response = await fetch(item.cdnUrl)
    const text = await response.text()
    textContents.value[item.key] = text
  } catch (error) {
    console.error('Failed to load text content:', error)
    textContents.value[item.key] = '加载失败'
  }
}

// 监听文本项变化，自动加载内容
watch(
  textItems,
  (items) => {
    items.forEach((item) => {
      loadTextContent(item)
    })
  },
  { immediate: true }
)

function getCDNUrl(obj: S3ObjectInfo): string {
  // TODO: 实现CDN URL生成逻辑
  // 临时使用 raw API
  const bucketId = useRoute().params.id
  return `/api/raw/${bucketId}/${obj.key}`
}

function getFolderName(folder: string): string {
  return folder.split('/').filter(Boolean).slice(-1)[0] || folder
}

function handleImageClick(item: BookViewItem, index: number) {
  emit('preview', item)
}
</script>
