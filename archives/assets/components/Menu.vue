<script setup>
const show = defineModel({ default: false })
defineProps({
  items: {
    type: Array,
    required: true,
  },
  closeAfterClick: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['click'])
</script>

<template>
  <div class="menu">
    <Transition name="fade">
      <div v-show="show" class="menu-modal" @click="show = false"></div>
    </Transition>
    <div v-show="show" class="menu-content">
      <ul>
        <li
          v-for="(item, index) in items"
          :key="index"
          @click="
            () => {
              show = !closeAfterClick
              emit('click', item)
            }
          "
        >
          <component
            v-if="typeof item.render === 'function'"
            :is="item.render"
          ></component>
          <span
            v-else-if="typeof item.text === 'string'"
            v-text="item.text"
          ></span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.menu-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.2);
  z-index: 1;
}

.menu-content {
  position: absolute;
  background-color: white;
  z-index: 2;
  border-radius: 6px;
  right: -100%;
  min-width: 128px;
}

.menu-content li {
  padding: 10px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.menu-content li:hover {
  background-color: rgba(0, 0, 0, 0.1);
}
</style>
