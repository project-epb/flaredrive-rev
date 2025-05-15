<template lang="pug">
NForm
  NFormItem(label='Files')
    NUpload(multiple, directory-dnd, :custom-request, @finish='onFinish', ref='uploaderRef')
      NUploadDragger
        div: NIcon(size='80'): IconUpload
        NP Click or drag files to this area to upload
  NFormItem(label='Prefix', v-if='!prefixReadonly')
    NInput(:placeholder='defaultPrefix', :default-value='defaultPrefix', v-model:value='formData.prefix', clearable)
  //- div
  //-   NButton(type='primary', block, @click='handleStart') Upload
  UploadProgress
</template>

<script setup lang="ts">
import type { R2Object } from '@cloudflare/workers-types/2023-07-01'
import { IconUpload } from '@tabler/icons-vue'
import { NFormItem, useMessage, type UploadCustomRequestOptions, type UploadFileInfo } from 'naive-ui'

const nmessage = useMessage()
const props = withDefaults(
  defineProps<{
    defaultPrefix?: string
    prefixReadonly?: boolean
  }>(),
  {
    defaultPrefix: '',
    prefixReadonly: false,
  }
)
const emit = defineEmits<{
  uploaded: [item: R2Object]
}>()
const formData = reactive({
  prefix: props.defaultPrefix,
})
const bucket = useBucketStore()

const customRequest = async (payload: UploadCustomRequestOptions) => {
  console.info('upload', payload)
  payload.file.status = 'uploading'
  const timer = setInterval(() => {
    payload.file.percentage = Math.min(90, (payload.file.percentage || 0) + Math.random() * 10)
    if (payload.file.percentage >= 90) {
      clearInterval(timer)
    }
  }, 100)
  bucket
    .addToUploadQueue(`${formData.prefix.replace(/\/$/, '')}/${payload.file.name}`, payload.file.file!)
    .promise.then((data) => {
      if (!data) {
        throw new Error('No data returned from upload')
      }
      payload.file.status = 'finished'
      payload.file.url = bucket.getCDNUrl(data)
      if (payload.file.file?.type.startsWith('image/')) {
        payload.file.thumbnailUrl = bucket.getCDNUrl(data)
      }
      payload.file.percentage = 100
      payload.onFinish()
      emit('uploaded', data)
      if (bucket.currentBatchTotal > 1) {
        if (bucket.currentBatchFinished === bucket.currentBatchTotal) {
          nmessage.success(`${bucket.currentBatchTotal} files uploaded successfully`)
        }
      } else {
        nmessage.success(`${payload.file.name} uploaded successfully`)
      }
    })
    .catch((err) => {
      nmessage.error('Upload failed', err)
      payload.file.status = 'error'
      payload.file.percentage = 0
      payload.onError()
    })
    .finally(() => {
      clearInterval(timer)
    })
}
const uploaderRef = useTemplateRef('uploaderRef')
function handleStart() {
  uploaderRef.value!.submit()
}
function onFinish(options: { file: UploadFileInfo; event?: ProgressEvent }) {}
</script>

<style scoped lang="sass"></style>
