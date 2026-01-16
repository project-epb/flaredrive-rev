<template lang="pug">
Component.markdown-viewer(:is='tag', v-html='html', prose, max-w='unset')
</template>

<script setup lang="ts">
import { effect } from 'vue'
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

// effect(() => {
//   props.options && md.set(props.options)
// })

effect(() => {
  md.process(props.value).then((data) => {
    html.value = data.toString()
  })
})
</script>

<style scoped lang="sass"></style>
