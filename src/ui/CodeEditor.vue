<template>
  <div class="code-editor" ref="containerEl" />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { useEditorStore } from '../state/store'
import { serializeSvg } from '../data/serialize'

window.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker()
  },
}

const store = useEditorStore()
const containerEl = ref<HTMLElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let isFocused = false
let timer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  editor = monaco.editor.create(containerEl.value!, {
    value: store.document ? serializeSvg(store.document) : '',
    language: 'xml',
    theme: 'vs-dark',
    fontSize: 12,
    lineHeight: 19,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: 'off',
  })

  editor.onDidFocusEditorText(() => { isFocused = true })
  editor.onDidBlurEditorText(() => {
    isFocused = false
    if (store.document) editor!.setValue(serializeSvg(store.document))
  })
  editor.onDidChangeModelContent(() => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => store.updateSvg(editor!.getValue()), 500)
  })
})

onUnmounted(() => {
  editor?.dispose()
})

watch(() => store.document, (doc) => {
  if (isFocused || !editor) return
  const next = doc ? serializeSvg(doc) : ''
  if (editor.getValue() !== next) editor.setValue(next)
}, { deep: true })
</script>

<style scoped>
.code-editor {
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  border-right: 1px solid #3c3c3c;
  overflow: hidden;
  height: 100%;
}
</style>
