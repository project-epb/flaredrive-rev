<template>
  <img
    class="tabler-icon"
    :data-icon="name"
    :src="src"
    :width="size"
    :height="size"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number | string
    type?: 'filled' | 'outline'
  }>(),
  {
    name: 'brand-tabler',
    type: 'outline',
  }
)

const src = computed(() => {
  return `https://cdn.jsdelivr.net/npm/@tabler/icons@3.2.0/icons/${props.type}/${props.name}.svg`
})
</script>

<style scoped></style>
