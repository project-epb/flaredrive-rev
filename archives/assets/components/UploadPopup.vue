<script setup>
defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(["update:modelValue", "upload", "createFolder"]);
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
      <div v-if="modelValue" class="popup-content">
        <div class="button-grid">
          <button onclick="this.lastElementChild.click()">
            <img src="https://unpkg.com/@tabler/icons@3.1.0/icons/outline/camera-up.svg" />
            <span>Take Photo</span>
            <input
              type="file"
              accept="image/*"
              capture="camera"
              hidden
              @change="emit('upload', $event.target)"
            />
          </button>
          <button onclick="this.lastElementChild.click()">
            <img src="https://unpkg.com/@tabler/icons@3.1.0/icons/outline/photo-up.svg" />
            <span>Image/Video</span>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              @change="emit('upload', $event.target)"
            />
          </button>
          <button onclick="this.lastElementChild.click()">
            <img src="https://unpkg.com/@tabler/icons@3.1.0/icons/outline/file-upload.svg" />
            <span>File</span>
            <input
              type="file"
              accept="*"
              multiple
              hidden
              @change="emit('upload', $event.target)"
            />
          </button>
          <button type="button" @click="emit('createFolder')">
            <img src="https://unpkg.com/@tabler/icons@3.1.0/icons/outline/folder-plus.svg" />
            <span>Create Folder</span>
          </button>
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

.popup-content {
  position: fixed;
  bottom: 0;
  width: 100%;
  z-index: 2;
  border-radius: 16px 16px 0 0;
  background-color: white;
}

.popup .button-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-gap: 8px;
  padding: 8px;
}

.popup button {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  font-size: 12px;
}

.popup svg, .popup img {
  width: 32px;
  height: 32px;
  margin: 8px;
}
</style>
