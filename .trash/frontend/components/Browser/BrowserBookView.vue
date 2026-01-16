<template lang="pug">
.browser-book-view
  NSkeleton(v-if='!payload', height='200px')
  .browser-book-view-main(v-else)
    NCard(:title='bookName', :closable='!!(parentKey && items.length)', @close='$router.push(`/${parentKey}`)')
      NEmpty(v-if='!items.length')
      .book-pages-container(:data-page-count='items.length')
        .book-page-item(
          v-for='(item, index) in items',
          :key='item.key',
          :id='"" + item.checksums.md5',
          :data-page-number='index + 1'
        )
          .book-page-image(v-if='item.previewType === "image"', text-center)
            NImage(
              :src='item.thumbnailUrl || item.cdnUrl',
              :preview-src='item.cdnUrl',
              :alt='item.key',
              object-fit='contain',
              width='640',
              lazy
            )
              template(#placeholder)
                NSkeleton(h='640px', w='640px', max-w='100%')
          .book-page-text(
            v-else-if='item.previewType === "text" || item.previewType === "markdown"',
            max-w-860px,
            mx-auto
          )
            NDivider(title-placement='left'): NText(depth='3', text-3) {{ item.key.split('/').slice(-1)[0] }}
            BrowserTextRender(:item, auto-load, min-h-200px)
            NText(depth='3', text-2, select-none) --- EOF ---

    NCard(v-if='folders.length > 0', title='Navigation', mt-4)
      .flex.flex-wrap(gap-2)
        NCard.folder-item(
          v-for='(item, index) in folders',
          size='small',
          inline-flex,
          flex-auto,
          w-auto,
          :key='item.key',
          :content-style='{ padding: "0.5rem 1rem" }',
          cursor-pointer,
          @click='() => $router.push(item.key === "../" ? `/${parentKey}` : `/${item.key}`)'
        )
          NIcon(:component='FileHelper.getObjectIcon(item)', size='20', mr-2)
          NText {{ item.key.split('/').filter(Boolean).slice(-1)[0] }}

  .dev-only.bg-dev.mt-4
    details
      summary items
      pre {{ items }}
    details.mt-4
      summary subFolders
      pre {{ folders }}
</template>

<script setup lang="ts">
import type { R2BucketListResponse } from '@/models/R2BucketClient'
import { FileHelper } from '@/utils/FileHelper'
import type { R2Object } from '@cloudflare/workers-types/2023-07-01'

const props = withDefaults(
  defineProps<{
    payload?: R2BucketListResponse | null
  }>(),
  { payload: null }
)
const bucket = useBucketStore()

const bookName = computed(() => {
  if (!props.payload) return 'Loading...'
  const pathParts = props.payload.prefix.split('/').filter(Boolean)
  const thisPart = pathParts[pathParts.length - 1]
  // 从后往前找最后一个不是纯数字组成的文件夹名
  const maybeBookName = pathParts.reverse().find((part) => {
    return part && !/^\d+$/.test(part)
  })
  if (!maybeBookName || maybeBookName === thisPart) {
    return thisPart || 'Untitled'
  }
  return `${maybeBookName} - ${thisPart}`
})

const parentKey = computed(() => {
  if (!props.payload) return ''
  const pathParts = props.payload.prefix.replace(/\/$/, '').split('/')
  pathParts.pop()
  return pathParts.length ? pathParts.join('/') + '/' : ''
})

/**
 * 按 key ascend 排序，过滤出来 image/* text/plain *.md 的对象
 * 这样我们才能把它渲染成类似书本的效果
 */
const items = computed<
  (R2Object & {
    previewType: ReturnType<typeof FileHelper.getPreviewType>
    cdnUrl: string
    thumbnailUrl?: string
  })[]
>(() => {
  if (!props.payload) return [] as any
  return props.payload.objects
    .filter((item) => {
      const { contentType, ext } = FileHelper.getSimpleFileInfoByObject(item)
      return (
        (contentType.startsWith('image/') && !contentType.includes('pdf')) ||
        contentType.startsWith('text/') ||
        ['md'].includes(ext)
      )
    })
    .map((item) => {
      return {
        ...item,
        previewType: FileHelper.getPreviewType(item),
        cdnUrl: bucket.getCDNUrl(item),
        thumbnailUrl: bucket.getThumbnailUrls(item)?.large,
      }
    })
    .sort((a, b) => {
      return a.key.localeCompare(b.key)
    })
})

const folders = computed(() => {
  if (!props.payload) return []
  const list = props.payload.folders
    .sort((a, b) => {
      return a.localeCompare(b)
    })
    .map(FileHelper.createNullObject)
  if (props.payload.prefix) {
    list.unshift(FileHelper.createNullObject('../'))
  }
  return list
})
</script>

<style scoped lang="sass"></style>
