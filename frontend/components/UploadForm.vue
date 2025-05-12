<template lang="pug">
NForm
  NFormItem(label='File')
    NUpload(multiple, directory-dnd, :default-upload='false', :custom-request, ref='uploaderRef')
      NUploadDragger
        div: NIcon(size='80'): IconUpload
        NP Click or drag files to this area to upload
  NFormItem(label='Prefix')
    NInput(:placeholder='defaultPrefix', :default-value='defaultPrefix', clearable)
  div
    NButton(type='primary', block, @click='handleStart') Upload
</template>

<script setup lang="ts">
import { IconUpload } from '@tabler/icons-vue'
import { NButton, NFormItem, useMessage, type UploadCustomRequestOptions, type UploadFileInfo } from 'naive-ui'

const nmessage = useMessage()
const props = withDefaults(
  defineProps<{
    defaultPrefix?: string
  }>(),
  {
    defaultPrefix: '',
  }
)
const formData = reactive({
  prefix: props.defaultPrefix,
})
const bucket = useBucketStore()

const customRequest = async (payload: UploadCustomRequestOptions) => {
  console.info('upload', payload)
  payload.file.status = 'uploading'
  bucket
    .uploadOne(`${formData.prefix.replace(/\/$/, '')}/${payload.file.name}`, payload.file.file!)
    .then((res) => {
      nmessage.success('Upload success')
      payload.file.url = bucket.getCDNUrl(res.data)
      payload.file.status = 'finished'
      if (payload.file.file?.type.startsWith('image/')) {
        payload.file.thumbnailUrl = bucket.getCDNUrl(res.data)
      }
      payload.onFinish()
    })
    .catch((err) => {
      nmessage.error('Upload failed', err)
      payload.file.status = 'error'
      payload.onError()
    })
}
const uploaderRef = useTemplateRef('uploaderRef')
function handleStart() {
  uploaderRef.value!.submit()
}
</script>

<style scoped lang="sass"></style>
