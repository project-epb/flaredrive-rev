<template lang="pug">
.user-menu-container
  //- Not Logged In
  NButton(v-if='!auth.isAuthed', type='primary', secondary, @click='$router.push("/auth/login")')
    template(#icon)
      NIcon(:component='IconLogin')
    | Login

  //- Logged In
  NDropdown(v-else, :options='menuOptions', @select='handleSelect')
    NButton(quaternary, circle, size='large')
      //- Avatar or Icon
      NAvatar(v-if='auth.user?.id', round) {{ getInitials(auth.user.email) }}
      NIcon(v-else, size='24', :component='IconUser')
</template>

<script setup lang="ts">
import { IconLogin, IconLogout, IconUser, IconDashboard, IconTools } from '@tabler/icons-vue'
import { NIcon, useMessage } from 'naive-ui'
import type { Component } from 'vue'

const auth = useAuthStore()
const router = useRouter()
const message = useMessage()

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const showAdmin = computed(() => (auth.user?.authorizationLevel || 0) >= 3)
const menuOptions = computed(() => {
  const opts = [
    {
      label: 'Preferences',
      key: 'preferences',
      icon: renderIcon(IconTools),
    },
    {
      label: 'Logout',
      key: 'logout',
      icon: renderIcon(IconLogout),
    },
  ]

  // Add Admin Settings if authorizationLevel > 0 (Assumption)
  if (showAdmin.value) {
    opts.unshift({
      label: 'Admin Dashboard',
      key: 'admin',
      icon: renderIcon(IconDashboard),
    })
  }

  return opts
})

const handleSelect = async (key: string) => {
  switch (key) {
    case 'logout':
      await auth.logout()
      router.push('/auth/login')
      break
    case 'preferences':
      router.push('/preferences')
      break
    case 'admin':
      router.push('/admin')
      break
  }
}

const getInitials = (email?: string) => {
  if (!email) return 'U'
  return email.substring(0, 2).toUpperCase()
}
</script>

<style scoped lang="sass">
.user-menu-container
  display: flex
  align-items: center
</style>
