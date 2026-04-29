<template>
  <div class="code-editor">
    <textarea
      v-model="localText"
      spellcheck="false"
      autocomplete="off"
      @input="onInput"
      @focus="isFocused = true"
      @blur="onBlur"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useEditorStore } from '../state/store'
import { serializeSvg } from '../data/serialize'

const store = useEditorStore()
const localText = ref('')
const isFocused = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

watch(() => store.document, (doc) => {
  if (isFocused.value) return
  localText.value = doc ? serializeSvg(doc) : ''
}, { deep: true })

function onInput() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => store.updateSvg(localText.value), 500)
}

function onBlur() {
  isFocused.value = false
  if (store.document) localText.value = serializeSvg(store.document)
}
</script>

<style scoped>
.code-editor {
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  border-right: 1px solid #3c3c3c;
  overflow: hidden;
}

textarea {
  flex: 1;
  width: 100%;
  height: 100%;
  background: transparent;
  color: #d4d4d4;
  border: none;
  outline: none;
  resize: none;
  padding: 12px;
  font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
  tab-size: 2;
  white-space: pre;
  overflow: auto;
  box-sizing: border-box;
}
</style>
