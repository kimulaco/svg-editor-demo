<template>
  <div class="path-list">
    <div class="path-list-header">PATHS</div>
    <div
      v-if="!store.document"
      class="path-list-empty"
    >
      SVGを読み込んでください
    </div>
    <div
      v-for="(el, i) in store.pathElements"
      :key="el.id"
      class="path-item"
      :class="{ active: store.activePathIndex === i }"
      @click="() => store.setActivePath(i)"
    >
      <span
        class="path-swatch"
        :style="{ background: el.attrs.fill && el.attrs.fill !== 'none' ? el.attrs.fill : '#888' }"
      />
      <span class="path-label">path[{{ i }}]</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditorStore } from '../state/store'

const store = useEditorStore()
</script>

<style scoped>
.path-list {
  width: 160px;
  background: #252526;
  border-right: 1px solid #3c3c3c;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;
}

.path-list-header {
  font-size: 10px;
  color: #888;
  letter-spacing: 0.08em;
  padding: 8px 10px 4px;
  border-bottom: 1px solid #3c3c3c;
}

.path-list-empty {
  font-size: 11px;
  color: #555;
  padding: 12px 10px;
}

.path-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  font-size: 12px;
  color: #ccc;
  cursor: pointer;
  user-select: none;
}

.path-item:hover {
  background: #2a2d2e;
}

.path-item.active {
  background: #094771;
  color: #fff;
}

.path-swatch {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
  border: 1px solid #555;
}

.path-label {
  font-family: monospace;
  font-size: 11px;
}
</style>
