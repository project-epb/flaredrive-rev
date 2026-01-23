<template lang="pug">
#auth-login
  NCard(title='Login', size='large')
    NForm(:model='form', :rules='rules', ref='formRef', label-placement='top')
      NFormItem(label='Email', path='email')
        NInput(v-model:value='form.email', placeholder='you@example.com', autofocus)
      NFormItem(label='Password', path='password')
        NInput(
          v-model:value='form.password',
          type='password',
          show-password-on='click',
          placeholder='At least 8 characters'
        )
      .flex(gap-3, items-center)
        NButton(type='primary', :loading='submitting', @click='onSubmit') Login
        NButton(v-if='allowRegister', quaternary, @click='goRegister') Register
</template>

<script setup lang="ts">
import { NButton, NCard, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'

definePage({
  name: 'auth-login',
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
    { required: true, message: 'Please enter your email', trigger: ['blur', 'input'] },
    { type: 'email', message: 'Invalid email format', trigger: ['blur', 'input'] },
  ],
  password: [{ required: true, message: 'Please enter your password', trigger: ['blur', 'input'] }],
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
    message.success('Login successful')
    await router.replace(redirectTo.value)
  } catch (e: any) {
    message.error(e?.message || 'Login failed')
  } finally {
    submitting.value = false
  }
}

const goRegister = () => {
  router.push({ name: 'auth-register', query: { redirect: redirectTo.value } })
}
</script>

<style scoped lang="sass">
#auth-login
  max-width: 520px
  margin: 0 auto
</style>
