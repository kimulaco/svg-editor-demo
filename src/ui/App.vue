<template>
  <div class="app-layout">
    <ToolBar />
    <div class="main-area">
      <PathList />
      <Canvas />
    </div>
  </div>
</template>

<script setup lang="ts">
import ToolBar from './ToolBar.vue'
import PathList from './PathList.vue'
import Canvas from '../render/Canvas.vue'
import { useKeyboard } from '../interaction/useKeyboard'

useKeyboard()
</script>

<style>
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #app {
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: #1e1e1e;
  color: #ccc;
  font-family: system-ui, -apple-system, sans-serif;
}
</style>

<style scoped>
.app-layout {
  display: grid;
  grid-template-rows: 40px 1fr;
  height: 100vh;
  width: 100vw;
}

.main-area {
  display: flex;
  overflow: hidden;
}
</style>
