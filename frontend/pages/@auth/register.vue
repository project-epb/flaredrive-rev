<template lang="pug">
#auth-register
  NCard(title='注册', size='large')
    NForm(:model='form', :rules='rules', ref='formRef', label-placement='top')
      NFormItem(label='邮箱', path='email')
        NInput(v-model:value='form.email', placeholder='you@example.com', autofocus)
      NFormItem(label='密码', path='password')
        NInput(v-model:value='form.password', type='password', show-password-on='click', placeholder='至少 8 位')
      NFormItem(label='确认密码', path='password2')
        NInput(v-model:value='form.password2', type='password', show-password-on='click')
      .flex(gap-3, items-center)
        NButton(type='primary', :loading='submitting', @click='onSubmit') 注册并登录
        NButton(secondary, @click='goLogin') 去登录
</template>

<script setup lang="ts">
import { NButton, NCard, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'

definePage({
  name: '@auth-register',
})

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const message = useMessage()

const redirectTo = computed(() => {
  const q = route.query.redirect
  return typeof q === 'string' && q ? q : '/'
})

const form = reactive({
  email: '',
  password: '',
  password2: '',
})

const rules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: ['blur', 'input'] },
    { type: 'email', message: '邮箱格式不正确', trigger: ['blur', 'input'] },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: ['blur', 'input'] },
    { min: 8, message: '密码至少 8 位', trigger: ['blur', 'input'] },
  ],
  password2: [
    { required: true, message: '请再次输入密码', trigger: ['blur', 'input'] },
    {
      validator: (_rule, value) => value === form.password,
      message: '两次输入的密码不一致',
      trigger: ['blur', 'input'],
    },
  ],
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
    await auth.register({ email: form.email, password: form.password })
    await auth.login({ email: form.email, password: form.password })
    message.success('注册成功')
    await router.replace(redirectTo.value)
  } catch (e: any) {
    message.error(e?.message || '注册失败')
  } finally {
    submitting.value = false
  }
}

const goLogin = () => {
  router.push({ path: '/@auth/login', query: { redirect: redirectTo.value } })
}
</script>

<style scoped lang="sass">
#auth-register
  max-width: 520px
  margin: 0 auto
</style>
