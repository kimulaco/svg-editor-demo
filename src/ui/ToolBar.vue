<template>
  <div class="toolbar">
    <div class="toolbar-group">
      <button @click="handleLoadFile">ファイル読込</button>
    </div>
    <div class="toolbar-group">
      <button :disabled="store.history.past.length === 0" @click="store.undo">↶ Undo</button>
      <button :disabled="store.history.future.length === 0" @click="store.redo">↷ Redo</button>
    </div>
    <div class="toolbar-group">
      <button :disabled="!store.activePath" @click="handleCopyD">d をコピー</button>
      <button :disabled="!store.document" @click="handleExport">SVG書出し</button>
    </div>

    <!-- hidden file input -->
    <input ref="fileInputRef" type="file" accept=".svg" style="display:none" @change="onFileChange" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '../state/store'
import { serializeSvg } from '../data/serialize'

const store = useEditorStore()
const fileInputRef = ref<HTMLInputElement | null>(null)

function handleLoadFile() {
  fileInputRef.value?.click()
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const text = ev.target?.result as string
    if (text) store.loadSvg(text)
  }
  reader.readAsText(file)
}

function handleCopyD() {
  if (store.activeD) navigator.clipboard.writeText(store.activeD)
}

function handleExport() {
  if (!store.document) return
  const svg = serializeSvg(store.document)
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'edited.svg'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  background: #2d2d2d;
  border-bottom: 1px solid #3c3c3c;
  height: 100%;
  flex-shrink: 0;
}

.toolbar-group {
  display: flex;
  gap: 4px;
}

.toolbar-group + .toolbar-group {
  border-left: 1px solid #3c3c3c;
  padding-left: 8px;
}

button {
  background: #3c3c3c;
  color: #ccc;
  border: 1px solid #555;
  border-radius: 3px;
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

button:hover:not(:disabled) {
  background: #4a4a4a;
  color: #fff;
}

button:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
