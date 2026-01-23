<template lang="pug">
#auth-register
  NCard(title='Register', size='large')
    NAlert(v-if='!allowRegister', type='warning', show-icon) Sorry, registration is currently closed.
    NForm(:model='form', :rules='rules', ref='formRef', label-placement='top')
      NFormItem(label='Email', path='email')
        NInput(v-model:value='form.email', placeholder='you@example.com', autofocus, :disabled='!allowRegister')
      NFormItem(label='Password', path='password')
        NInput(
          v-model:value='form.password',
          type='password',
          show-password-on='click',
          placeholder='At least 8 characters',
          :disabled='!allowRegister'
        )
      NFormItem(label='Confirm Password', path='password2')
        NInput(v-model:value='form.password2', type='password', show-password-on='click', :disabled='!allowRegister')
      .flex(gap-3, items-center)
        NButton(type='primary', :loading='submitting', :disabled='!allowRegister', @click='onSubmit') Register and Login
        NButton(quaternary, @click='goLogin') I have an account
</template>

<script setup lang="ts">
import { NAlert, NButton, NCard, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'

definePage({
  name: 'auth-register',
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
  password2: '',
})

const rules: FormRules = {
  email: [
    { required: true, message: 'Please enter your email', trigger: ['blur', 'input'] },
    { type: 'email', message: 'Invalid email format', trigger: ['blur', 'input'] },
  ],
  password: [
    { required: true, message: 'Please enter your password', trigger: ['blur', 'input'] },
    { min: 8, message: 'Password must be at least 8 characters', trigger: ['blur', 'input'] },
  ],
  password2: [
    { required: true, message: 'Please confirm your password', trigger: ['blur', 'input'] },
    {
      validator: (_rule, value) => value === form.password,
      message: 'The two passwords do not match',
      trigger: ['blur', 'input'],
    },
  ],
}

const submitting = ref(false)
const formRef = ref<FormInst | null>(null)

const onSubmit = async () => {
  if (!allowRegister.value) {
    message.warning('Registration is currently closed')
    return
  }
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
    message.success('Registration successful')
    await router.replace(redirectTo.value)
  } catch (e: any) {
    message.error(e?.message || 'Registration failed')
  } finally {
    submitting.value = false
  }
}

const goLogin = () => {
  router.push({ name: 'auth-login', query: { redirect: redirectTo.value } })
}
</script>

<style scoped lang="sass">
#auth-register
  max-width: 520px
  margin: 0 auto
</style>
