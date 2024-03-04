<script setup>
const props = defineProps({
  modelValue: Boolean,
  list: Array,
})

const emit = defineEmits(['update:modelValue', 'upload', 'createFolder'])

const sortedList = computed(() => {
  return (
    props?.list?.sort((a, b) => {
      return new Date(b.time) - new Date(a.time)
    }) || []
  )
})
</script>
<template>
  <div class="popup">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="popup-modal"
        @click="emit('update:modelValue', false)"
      ></div>
    </Transition>
    <Transition name="slide-up">
      <div v-if="modelValue" class="list-content flex flex-col gap-1">
        <div v-if="!sortedList.length" class="placeholder">
          <p style="text-align: center">No uploads yet</p>
        </div>
        <div v-else class="file-item flex gap-1" v-for="item in sortedList">
          <div
            v-if="item.thumbUrl"
            class="thumb"
            :style="{
              height: '2rem',
              width: '2rem',
              backgroundImage: `url(${item.thumbUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }"
          ></div>
          <div class="link flex-1">
            <input
              type="text"
              readonly
              :value="item.url"
              :style="{
                width: 'calc(100% - 2rem)',
                border: 'none',
                padding: '0.25rem',
                borderRadius: '0.25rem',
                fontSize: '0.8rem',
              }"
              @click="
                (e) => {
                  e.target.select()
                  document.execCommand('copy')
                }
              "
            />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
.popup-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  background-color: rgba(0, 0, 0, 0.2);
}

.list-content {
  position: fixed;
  bottom: 0;
  width: 100%;
  height: 80vh;
  z-index: 2;
  border-radius: 16px 16px 0 0;
  background-color: white;
  padding: 1rem;
  overflow: auto;
}
</style>
