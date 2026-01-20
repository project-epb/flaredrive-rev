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

  NDivider

  NCard.mt-6(title='About')
    NP Powered by FlareDrive.
    .mt-3.flex.gap-2.flex-wrap
      NText MIT License
      NText(depth='3') ·
      NA(href='https://github.com/project-epb/flaredrive-rev', target='_blank', rel='noopener noreferrer') GitHub
      NText(depth='3') ·
      NText
        | Made with 🐟 by
        |
        NA(href='https://github.com/dragon-fish', target='_blank', rel='noopener noreferrer') Dragon Fish
</template>

<script setup lang="ts">
import { IconChevronRight, IconDatabase, IconUsers, IconSettings } from '@tabler/icons-vue'
import { NButton, NCard, NText } from 'naive-ui'

const router = useRouter()

const entries = [
  {
    title: 'Site Settings',
    description: 'Instance name and registration toggle',
    icon: IconSettings,
    link: '/admin/settings',
  },
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
