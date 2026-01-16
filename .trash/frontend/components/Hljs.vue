<template lang="pug">
NConfigProvider(:hljs='hljs')
  NCode(:code='stringifyCode', :language='lang', :show-line-numbers='showLineNumbers')
</template>

<script setup lang="ts">
import hljs, { type HLJSApi } from 'highlight.js'

const props = withDefaults(
  defineProps<{
    code: any
    lang?: string
    showLineNumbers?: boolean
    hljsInterceptor?: (hljs: HLJSApi) => void
  }>(),
  {
    code: '',
    lang: 'auto',
    showLineNumbers: true,
  }
)

const stringifyCode = computed(() => {
  if (typeof props.code === 'string') {
    return props.code
  } else if (typeof props.code === 'function') {
    return props.code.toString()
  }
  return JSONSafelyStringify(props.code, 2)
})

// Stringify object, transform bigint to string, self-recursive to '<circular>'
function JSONSafelyStringify(data: any, space?: number): string {
  const cache = new Set()
  return JSON.stringify(
    data,
    function (key, value) {
      if (typeof value === 'bigint') {
        return value.toString()
      }
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return '<circular>'
        }
        cache.add(value)
      }
      return value
    },
    space
  )
}
</script>

<style scoped lang="sass">
:deep(pre.__code__)
  overflow: auto
</style>
