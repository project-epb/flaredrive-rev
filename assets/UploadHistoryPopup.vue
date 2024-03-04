<script setup>
const props = defineProps({
  modelValue: Boolean,
  list: Array,
})

const emit = defineEmits(['update:modelValue', 'update:list'])

const sortedList = Vue.computed(() => {
  return (
    props?.list?.sort((a, b) => {
      return new Date(b.time) - new Date(a.time)
    }) || []
  )
})

function copyText(text = '') {
  const input = document.createElement('input')
  input.value = text
  document.body.appendChild(input)
  input.select()
  document.execCommand('copy')
  document.body.removeChild(input)
}

function handleJumpTo(url = '') {
  window.open(url, '_blank')
}
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
              height: '3rem',
              width: '3rem',
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
                width: '100%',
                border: '1px solid #ddd',
                padding: '0.5rem',
                borderRadius: '0.25rem',
                fontSize: '1rem',
              }"
              @click="
                (e) => {
                  e.target.select()
                }
              "
            />
          </div>
          <div class="actions flex gap-1">
            <button
              @click="copyText(item.url)"
              :style="{
                background: '#ddd',
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
              }"
            >
              Copy
            </button>
            <button
              @click="handleJumpTo(item.url)"
              :style="{
                background: '#ddd',
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
              }"
            >
              View
            </button>
            <button
              @click="emit('update:list', props.list.filter((i) => i.key !== item.key))"
              :style="{
                background: '#ffbdbd',
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
              }"
            >
              ×
            </button>
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
