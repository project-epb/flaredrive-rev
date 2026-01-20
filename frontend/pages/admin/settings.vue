<template lang="pug">
.admin-settings-page
  .flex.items-center.justify-between.mb-6
    div
      h1.text-2xl.font-bold.mb-1 Site Settings
      NText(depth='3') Basic settings stored in D1 (fallback: env → default)
    .flex.gap-2
      NButton(secondary, @click='loadSettings', :loading='isLoading')
        template(#icon): NIcon: IconRefresh
      NButton(type='primary', @click='saveAll', :loading='isSaving', :disabled='!isAdmin') Save

  NAlert(v-if='!isAdmin', type='warning', show-icon, :bordered='false')
    | You are not an admin. This page requires System Operator permission.

  NCard(title='General', size='large', :bordered='false')
    NForm(:model='form', :rules='rules', ref='formRef', label-placement='top')
      NFormItem(path='siteName')
        template(#label)
          .flex.items-center.gap-2
            span Site Name
            NTag(size='small', :type='sourceTagType(settings?.siteName.source)') {{ settings?.siteName.source || '-' }}
        NInput(
          v-model:value='form.siteName',
          placeholder='e.g. My Drive',
          :disabled='!isAdmin',
          maxlength='64',
          show-count
        )
        template(#feedback)
          span.text-xs.opacity-70
            | Used as the instance name in UI. Empty is not allowed.

      NFormItem(path='allowRegister')
        template(#label)
          .flex.items-center.gap-2
            span Allow Registration
            NTag(size='small', :type='sourceTagType(settings?.allowRegister.source)') {{ settings?.allowRegister.source || '-' }}
        .flex.items-center.gap-3
          NSwitch(v-model:value='form.allowRegister', :disabled='!isAdmin')
          NText(depth='3', style='font-size: 12px')
            | When disabled, /auth/register is blocked.

    .flex.justify-end.gap-3.mt-4
      NButton(secondary, @click='resetToFallback', :disabled='!isAdmin', :loading='isResetting') Reset to env/default
      NButton(type='primary', @click='saveAll', :disabled='!isAdmin', :loading='isSaving') Save
</template>

<script setup lang="ts">
import { NAlert, NButton, NCard, NForm, NFormItem, NIcon, NInput, NSwitch, NTag, NText, useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import fexios from 'fexios'
import { IconRefresh } from '@tabler/icons-vue'

import type { SiteSettingResult, SiteSettingSource } from '../../../common/site-settings'

type AdminSettingsResponse = {
  siteName: SiteSettingResult<string>
  allowRegister: SiteSettingResult<boolean>
}

definePage({
  meta: {
    requiresAuth: true,
  },
})

const auth = useAuthStore()
const site = useSiteStore()
const message = useMessage()

const isAdmin = computed(() => (auth.user?.authorizationLevel || 0) >= 3)

const isLoading = ref(false)
const isSaving = ref(false)
const isResetting = ref(false)
const settings = ref<AdminSettingsResponse | null>(null)

const formRef = ref<FormInst | null>(null)

const form = reactive({
  siteName: '',
  allowRegister: true,
})

const rules: FormRules = {
  siteName: [
    {
      required: true,
      message: 'Please enter site name',
      trigger: ['blur', 'input'],
    },
    {
      validator: (_rule, value: string) => {
        const name = (value || '').toString().trim()
        if (!name) return new Error('Site name cannot be empty')
        if (name.length > 64) return new Error('Max 64 characters')
        return true
      },
      trigger: ['blur', 'input'],
    },
  ],
  allowRegister: [
    {
      validator: (_rule, value: unknown) => {
        if (typeof value !== 'boolean') return new Error('Invalid value')
        return true
      },
      trigger: ['change'],
    },
  ],
}

const sourceTagType = (source?: SiteSettingSource) => {
  if (source === 'db') return 'success'
  if (source === 'env') return 'warning'
  return 'default'
}

const loadSettings = async () => {
  isLoading.value = true
  try {
    const { data } = await fexios.get<AdminSettingsResponse>('/api/admin/settings')
    settings.value = data
    form.siteName = data?.siteName?.value || ''
    form.allowRegister = !!data?.allowRegister?.value
    formRef.value?.restoreValidation()
  } catch (e: any) {
    message.error(e?.response?.data?.error || e?.message || 'Failed to load settings')
  } finally {
    isLoading.value = false
  }
}

const saveAll = async () => {
  if (!isAdmin.value) {
    message.error('Forbidden')
    return
  }
  const ok = await formRef.value
    ?.validate()
    .then(() => true)
    .catch(() => false)
  if (!ok) return

  const name = (form.siteName || '').toString().trim()

  isSaving.value = true
  try {
    await fexios.put('/api/admin/settings', {
      siteName: name,
      allowRegister: !!form.allowRegister,
    })
    message.success('Saved')
    await loadSettings()
    await site.fetchPublicSettings(true)
  } catch (e: any) {
    message.error(e?.response?.data?.error || e?.message || 'Failed to save')
  } finally {
    isSaving.value = false
  }
}

const resetToFallback = async () => {
  if (!isAdmin.value) {
    message.error('Forbidden')
    return
  }
  isResetting.value = true
  try {
    await fexios.put('/api/admin/settings', {
      siteName: null,
      allowRegister: null,
    })
    message.success('Reset')
    await loadSettings()
    await site.fetchPublicSettings(true)
    formRef.value?.restoreValidation()
  } catch (e: any) {
    message.error(e?.response?.data?.error || e?.message || 'Failed to reset')
  } finally {
    isResetting.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped lang="sass"></style>
