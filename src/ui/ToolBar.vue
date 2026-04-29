<template>
  <div class="toolbar">
    <div class="toolbar-group">
      <button @click="handlePasteSvg">SVGを貼付け</button>
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

    <!-- paste fallback modal -->
    <div v-if="showPasteModal" class="modal-backdrop" @click.self="showPasteModal = false">
      <div class="modal">
        <p>SVG文字列を貼り付けてください</p>
        <textarea v-model="pasteText" rows="8" placeholder="<svg ...>" />
        <div class="modal-actions">
          <button @click="showPasteModal = false">キャンセル</button>
          <button @click="applyPaste">読み込む</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '../state/store'
import { serializeSvg } from '../data/serialize'

const store = useEditorStore()
const fileInputRef = ref<HTMLInputElement | null>(null)
const showPasteModal = ref(false)
const pasteText = ref('')

async function handlePasteSvg() {
  try {
    const text = await navigator.clipboard.readText()
    if (text.trim().startsWith('<')) {
      store.loadSvg(text)
    } else {
      pasteText.value = ''
      showPasteModal.value = true
    }
  } catch {
    pasteText.value = ''
    showPasteModal.value = true
  }
}

function applyPaste() {
  if (pasteText.value.trim()) {
    store.loadSvg(pasteText.value)
  }
  showPasteModal.value = false
}

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

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #2d2d2d;
  border: 1px solid #555;
  border-radius: 6px;
  padding: 20px;
  width: 480px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.modal p {
  color: #ccc;
  font-size: 13px;
  margin: 0;
}

.modal textarea {
  background: #1e1e1e;
  color: #ccc;
  border: 1px solid #555;
  border-radius: 3px;
  padding: 8px;
  font-family: monospace;
  font-size: 11px;
  resize: vertical;
  width: 100%;
  box-sizing: border-box;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
