<template lang="pug">
.bucket-home
  .bucket-home-header(text-center, py-12)
    .bucket-logo(mb-6)
      NIcon(size='64', color='var(--primary-color)')
        IconCloud
    NH1(mb-2, font-bold) FlareDrive
    NText(depth='3', block) Select a storage bucket to get started

  NSpin(:show='bucket.isBucketListLoading')
    NEmpty(v-if='!bucket.availableBuckets.length', description='No buckets available')
    .bucket-grid(v-else)
      .bucket-card(
        v-for='(item, index) in bucket.availableBuckets',
        :key='item.id',
        @click='goToBucket(item.id)',
        :style='{ animationDelay: `${index * 50}ms` }'
      )
        .bucket-card-icon
          NIcon(size='32')
            IconBucket
        .bucket-card-content
          .bucket-card-name {{ item.name }}
          .bucket-card-url(v-if='item.cdnBaseUrl')
            NText(depth='3', :style='{ fontSize: "12px" }') {{ item.cdnBaseUrl }}
        .bucket-card-arrow
          NIcon(size='20')
            IconChevronRight
</template>

<script setup lang="ts">
import { IconBucket, IconChevronRight, IconCloud } from '@tabler/icons-vue'

const router = useRouter()
const bucket = useBucketStore()
const navigation = useNavigationStore()

onMounted(async () => {
  const list = await bucket.fetchBucketList()
  await navigation.handleInitialNavigation(list)
})

const goToBucket = (bucketName: string) => {
  if (!bucketName) return
  router.push(`/${bucketName}/`)
}
</script>

<style scoped lang="sass">
.bucket-home
  min-height: 60vh
  display: flex
  flex-direction: column

.bucket-home-header
  .bucket-logo
    display: inline-block
    padding: 1.5rem
    border-radius: 50%
    background: linear-gradient(135deg, rgba(246, 130, 31, 0.1) 0%, rgba(255, 154, 60, 0.15) 100%)
    html.dark &
      background: linear-gradient(135deg, rgba(246, 130, 31, 0.2) 0%, rgba(255, 154, 60, 0.25) 100%)

.bucket-grid
  display: grid
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))
  gap: 1rem
  padding: 1rem 0

.bucket-card
  display: flex
  align-items: center
  gap: 1rem
  padding: 1.25rem 1.5rem
  border-radius: 12px
  cursor: pointer
  transition: all 0.2s ease
  animation: fadeInUp 0.4s ease both
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)
  border: 1px solid rgba(0, 0, 0, 0.06)
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04)
  html.dark &
    background: linear-gradient(135deg, rgba(38, 38, 42, 0.9) 0%, rgba(32, 32, 36, 0.9) 100%)
    border: 1px solid rgba(255, 255, 255, 0.08)

  &:hover
    transform: translateY(-2px)
    box-shadow: 0 8px 24px rgba(246, 130, 31, 0.15)
    border-color: rgba(246, 130, 31, 0.3)
    html.dark &
      box-shadow: 0 8px 24px rgba(246, 130, 31, 0.2)
      border-color: rgba(246, 130, 31, 0.4)

  &:active
    transform: translateY(0)

.bucket-card-icon
  display: flex
  align-items: center
  justify-content: center
  width: 56px
  height: 56px
  border-radius: 12px
  flex-shrink: 0
  background: linear-gradient(135deg, #F6821F 0%, #FF9A3C 100%)
  color: white
  box-shadow: 0 4px 12px rgba(246, 130, 31, 0.3)

.bucket-card-content
  flex: 1
  min-width: 0

.bucket-card-name
  font-size: 1.1rem
  font-weight: 600
  color: #1f2937
  margin-bottom: 0.25rem
  html.dark &
    color: #f3f4f6

.bucket-card-url
  overflow: hidden
  text-overflow: ellipsis
  white-space: nowrap

.bucket-card-arrow
  flex-shrink: 0
  opacity: 0.4
  transition: all 0.2s ease
  .bucket-card:hover &
    opacity: 1
    transform: translateX(4px)
    color: #F6821F

@keyframes fadeInUp
  from
    opacity: 0
    transform: translateY(12px)
  to
    opacity: 1
    transform: translateY(0)
</style>
