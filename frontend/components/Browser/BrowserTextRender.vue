<template lang="pug">
.browser-text-render(ref='containerRef')
  MarkdownRender(v-if='previewType === "markdown"', :value='content || "Loading..."', tag='div', prose, max-w='unset')
  .plain-text(v-else, whitespace='pre-wrap', overflow-auto, prose, max-w='unset') {{ content || 'Loading...' }}
</template>

<script setup lang="ts">
import { FileHelper } from '@/utils/FileHelper'
import type { StorageListObject } from '@/models/BucketClient'

const MarkdownRender = defineAsyncComponent(() => import('@/components/Markdown/MarkdownViewer.vue'))

const props = withDefaults(
  defineProps<{
    item?: StorageListObject | null
    autoLoad?: boolean
  }>(),
  { item: null }
)
const content = defineModel<string>('content', { default: '' })

const emit = defineEmits<{
  load: [item: StorageListObject, content: string]
}>()

const bucket = useBucketStore()

const previewType = computed(() => {
  if (!props.item) return 'text'
  return FileHelper.getPreviewType(props.item)
})

const containerRef = useTemplateRef('containerRef')
useIntersectionObserver(
  containerRef,
  ([entry], ob) => {
    if (entry.isIntersecting) {
      ob.unobserve(entry.target)
      if (props.autoLoad && props.item) {
        const cdnUrl = bucket.getCDNUrl(props.item)
        fetch(cdnUrl)
          .then((response) => {
            if (response.ok) {
              return response.text()
            } else {
              throw new Error('Network response was not ok')
            }
          })
          .then((text) => {
            content.value = text
            emit('load', props.item!, text)
          })
          .catch((error) => {
            console.error('Error fetching text:', error)
          })
      }
    }
  },
  { threshold: 0.1 }
)
</script>

<style scoped lang="sass"></style>
