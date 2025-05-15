<template lang="pug">
NProgress(:percentage='bucket.currentBatchPercentage', type='line', :status)
  | {{ bucket.currentBatchFinished }} / {{ bucket.currentBatchTotal }} ({{ bucket.currentBatchPercentage }}%)
</template>

<script setup lang="ts">
const bucket = useBucketStore()

const status = computed<'info' | 'success' | 'error'>(() => {
  if (bucket.isUploading) {
    return 'info'
  } else if (bucket.currentBatchFinished === bucket.currentBatchTotal && bucket.currentBatchTotal > 0) {
    return 'success'
  } else {
    return 'error'
  }
})
</script>

<style scoped lang="sass"></style>
