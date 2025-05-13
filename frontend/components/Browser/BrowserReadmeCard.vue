<template lang="pug">
.browser-readme-card(ref='containerRef')
  NCard(title='README.md')
    MarkdownRender(:value='content || "Loading..."', tag='div', prose, max-w='unset')
    template(#header-extra, v-if='item')
      NButton(circle, @click='emit("navigate", item)', size='small', tertiary)
        template(#icon): IconInfoCircle
</template>

<script setup lang="ts">
import type { R2Object } from '@cloudflare/workers-types/2023-07-01'
import { IconInfoCircle } from '@tabler/icons-vue'

const MarkdownRender = defineAsyncComponent(() => import('@/components/MarkdownRender.vue'))

const props = withDefaults(
  defineProps<{
    item?: R2Object | null
    autoLoad?: boolean
    content?: string
  }>(),
  { item: null, content: '' }
)
const emit = defineEmits<{
  'update:content': [content: string]
  load: [item: R2Object, content: string]
  navigate: [item: R2Object]
}>()
const bucket = useBucketStore()

const containerRef = useTemplateRef('containerRef')
const observer = useIntersectionObserver(
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
            emit('update:content', text)
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
