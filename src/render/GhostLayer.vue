<template>
  <path
    v-if="ghostD"
    :d="ghostD"
    fill="none"
    stroke="#aaa"
    stroke-width="1"
    opacity="0.4"
    stroke-dasharray="4 3"
    pointer-events="none"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../state/store'
import { segmentsToD } from '../data/pathString'

const store = useEditorStore()
const ghostD = computed(() =>
  store.ghostSegments ? segmentsToD(store.ghostSegments) : null
)
</script>
