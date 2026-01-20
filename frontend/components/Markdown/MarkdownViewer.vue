<template lang="pug">
Component.markdown-viewer(:is='tag', v-html='html', prose, max-w='unset', dark='prose-invert')
</template>

<script setup lang="ts">
import { effect } from 'vue'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeStringify from 'rehype-stringify'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'

const props = withDefaults(
  defineProps<{
    value: string
    tag?: keyof HTMLElementTagNameMap
    inline?: boolean
  }>(),
  { value: '', tag: 'div', inline: false }
)
const html = ref('')

const githubLikeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    div: [...(defaultSchema.attributes?.div ?? []), 'align'],
    p: [...(defaultSchema.attributes?.p ?? []), 'align'],
    h1: [...(defaultSchema.attributes?.h1 ?? []), 'align'],
    h2: [...(defaultSchema.attributes?.h2 ?? []), 'align'],
    h3: [...(defaultSchema.attributes?.h3 ?? []), 'align'],
    h4: [...(defaultSchema.attributes?.h4 ?? []), 'align'],
    h5: [...(defaultSchema.attributes?.h5 ?? []), 'align'],
    h6: [...(defaultSchema.attributes?.h6 ?? []), 'align'],
    img: [...(defaultSchema.attributes?.img ?? []), 'align'],
  },
}

console.info(defaultSchema)

const md = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize, githubLikeSchema)
  .use(rehypeStringify)

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
