<template lang="pug">
#auth-login
  NCard(title='登录', size='large')
    NForm(:model='form', :rules='rules', ref='formRef', label-placement='top')
      NFormItem(label='邮箱', path='email')
        NInput(v-model:value='form.email', placeholder='you@example.com', autofocus)
      NFormItem(label='密码', path='password')
        NInput(v-model:value='form.password', type='password', show-password-on='click', placeholder='至少 8 位')
      .flex(gap-3, items-center)
        NButton(type='primary', :loading='submitting', @click='onSubmit') 登录
        NButton(v-if='allowRegister', secondary, @click='goRegister') 去注册
</template>

<script setup lang="ts">
import { NButton, NCard, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'

definePage({
  name: '@auth-login',
})

const auth = useAuthStore()
const site = useSiteStore()
const route = useRoute()
const router = useRouter()
const message = useMessage()
const allowRegister = computed(() => site.allowRegister)

const redirectTo = computed(() => {
  const q = route.query.redirect
  return typeof q === 'string' && q ? q : '/'
})

const form = reactive({
  email: '',
  password: '',
})

const rules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: ['blur', 'input'] },
    { type: 'email', message: '邮箱格式不正确', trigger: ['blur', 'input'] },
  ],
  password: [{ required: true, message: '请输入密码', trigger: ['blur', 'input'] }],
}

const submitting = ref(false)
const formRef = ref<FormInst | null>(null)

const onSubmit = async () => {
  if (submitting.value) return
  const ok = await formRef.value
    ?.validate()
    .then(() => true)
    .catch(() => false)
  if (!ok) return

  submitting.value = true
  try {
    await auth.login({ email: form.email, password: form.password })
    message.success('登录成功')
    await router.replace(redirectTo.value)
  } catch (e: any) {
    message.error(e?.message || '登录失败')
  } finally {
    submitting.value = false
  }
}

const goRegister = () => {
  router.push({ path: '/@auth/register', query: { redirect: redirectTo.value } })
}
</script>

<style scoped lang="sass">
#auth-login
  max-width: 520px
  margin: 0 auto
</style>
