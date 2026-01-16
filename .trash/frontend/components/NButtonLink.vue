<template lang="pug">
RouterLink(v-if='to', :to='to', custom)
  template(#default='{ navigate, href, isActive, isExactActive }')
    NButton(
      tag='a',
      :href,
      :target,
      @click='navigate',
      v-bind='buttonProps',
      :class='{ "is-active": isActive, "is-exact-active": isExactActive }'
    )
      slot
NButton(v-else, tag='a', :href, :target, v-bind='buttonProps')
  slot
</template>

<script setup lang="ts">
import {} from 'vue'
import { NButton, type ButtonProps } from 'naive-ui'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

defineProps<{
  to?: RouteLocationRaw
  href?: string
  target?: string
  buttonProps?: ButtonProps
}>()
</script>

<style scoped lang="sass"></style>
