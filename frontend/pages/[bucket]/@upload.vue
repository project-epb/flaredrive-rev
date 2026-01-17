<template lang="pug">
#upload-view
  NCard(:title='`Upload to ${currentBucketName}`')
    UploadForm(:default-prefix='currentPath')
</template>

<script setup lang="ts">
definePage({
  name: '@upload-standalone',
  meta: {
    requiresAuth: true,
  },
})

const route = useRoute()
const bucket = useBucketStore()

const currentBucketName = computed(() => {
  const bucketParam = (route.params as any).bucket
  return typeof bucketParam === 'string' ? bucketParam : ''
})

const currentPath = computed(() => {
  return ''
})

onMounted(async () => {
  await bucket.fetchBucketList()
  bucket.setCurrentBucket(currentBucketName.value)
})

watch(currentBucketName, (name) => {
  bucket.setCurrentBucket(name)
})
</script>

<style scoped lang="sass"></style>
