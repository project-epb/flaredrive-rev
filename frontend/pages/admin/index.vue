<template lang="pug">
.admin-home-page
  NH1 Admin Dashboard
  NP(depth='3') Admin functions and management

  .grid.grid-cols-1.md-grid-cols-2.gap-4.mt-6
    RouterLink(
      v-for='entry in entries',
      :key='entry.title',
      :to='entry.link',
      style='text-decoration: none; color: inherit'
    )
      NCard(hoverable)
        .flex.items-center.justify-between
          div
            h3.text-lg.font-semibold.mb-1 {{ entry.title }}
            NText(depth='3') {{ entry.description }}
          NIcon(size='32'): component(:is='entry.icon || IconChevronRight')
</template>

<script setup lang="ts">
import { IconChevronRight, IconDatabase, IconUsers } from '@tabler/icons-vue'
import { NButton, NCard } from 'naive-ui'

const router = useRouter()

const entries = [
  {
    title: 'User Management',
    description: 'Manage user accounts and permissions',
    icon: IconUsers,
    link: '/admin/users',
  },
  {
    title: 'Bucket Management',
    description: 'View and manage all bucket configurations',
    icon: IconDatabase,
    link: '/admin/buckets',
  },
]
</script>
