<template lang="pug">
NBreadcrumb.breadcrumb-nav
  NBreadcrumbItem(key='__ROOT__', @click='$router.push("/")')
    NText(quaternary, text)
      //- IconHome
      NIcon(mr-1, :component='IconHome')
      | Home
  NBreadcrumbItem(v-for='(item, index) in breadParts', :key='item.key', @click='onBreadClick(item, index)') {{ item.label }}
</template>

<script setup lang="ts">
import { IconHome } from '@tabler/icons-vue'

const route = useRoute()
const router = useRouter()
const bucketStore = useBucketStore()

const breadParts = computed<
  {
    label: string // display name
    key: string // for template key
    bucket: string // bucket name (first part)
    path?: string // path within bucket
  }[]
>(() => {
  const parts = route.path.split('/').filter(Boolean).slice(1) // Remove leading "bucket" part
  if (parts.length === 0) {
    return []
  }
  const bucketId = parts[0]! // First part is always bucket ID in this context
  const pathParts = parts.slice(1) // Rest is path

  // Try to find bucket name, fallback to ID
  const bucketObj = bucketStore.availableBuckets.find((b) => b.id === bucketId)
  const bucketLabel = bucketObj ? bucketObj.name : bucketId

  const result: { label: string; key: string; bucket: string; path?: string }[] = [
    { label: bucketLabel, key: bucketId, bucket: bucketId },
  ]

  if (pathParts.length > 0) {
    pathParts.forEach((part, index) => {
      const path = pathParts.slice(0, index + 1).join('/')
      result.push({
        label: decodeURI(part),
        key: `/bucket/${bucketId}/${path}`,
        bucket: bucketId,
        path,
      })
    })
  }

  return result
})

const onBreadClick = (item: { label: string; key: string; bucket: string; path?: string }, index: number) => {
  if (index + 1 === breadParts.value.length) {
    return // current route
  }
  const path = item.path || ''
  router.push(`/bucket/${item.bucket}/${path}${path ? '/' : ''}`)
}
</script>

<style scoped lang="sass">
.breadcrumb-nav
  white-space: nowrap
  overflow-x: auto /* allow scroll if too long */
  padding-bottom: 4px /* space for scrollbar mainly */
</style>
