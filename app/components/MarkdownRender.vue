<template lang="pug">
Component.markdown-viewer.prose.max-w-none(:is='tag', v-html='html', class='dark:prose-invert')
</template>

<script setup lang="ts">
import { watchEffect, ref } from 'vue'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import rehypeSanitize from 'rehype-sanitize'

const props = withDefaults(
  defineProps<{
    value: string
    tag?: keyof HTMLElementTagNameMap
    inline?: boolean
  }>(),
  { value: '', tag: 'div', inline: false }
)
const html = ref('')

const md = unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeStringify).use(rehypeSanitize)

watchEffect(() => {
  md.process(props.value).then((data) => {
    html.value = data.toString()
  })
})
</script>

<style scoped>
/* Add any custom markdown styles here if typography plugin is missing */
.markdown-viewer :deep(img) {
  max-width: 100%;
}
</style>
