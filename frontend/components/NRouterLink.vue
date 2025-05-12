<template lang="pug">
RouterLink(:to='to', custom)
  template(#default='{ navigate, href, isActive, isExactActive }')
    NA(
      :href='href',
      @click='navigate',
      v-bind='anchorProps',
      :class='{ "is-active": isActive, "is-exact-active": isExactActive }'
    )
      slot
</template>

<script setup lang="ts">
import {} from 'vue'
import { NA } from 'naive-ui'
import type { RouteLocationRaw } from 'vue-router'

const props = defineProps<{
  to: RouteLocationRaw
  anchorProps?: any
}>()
</script>

<style scoped lang="sass"></style>
