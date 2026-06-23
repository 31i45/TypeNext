<script setup lang="ts">
import { ref } from 'vue'
import { useTabManager } from '@/stores/tabManager'
import { FileText, Plus, X, GripVertical } from '@lucide/vue'
import { emitCloseTabRequest } from '@/utils/eventBus'

const tabManager = useTabManager()
const draggingIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function onMiddleClick(_id: string, e: MouseEvent) {
  if (e.button === 1) {
    e.preventDefault()
    emitCloseTabRequest()
  }
}

function onCloseClick() {
  emitCloseTabRequest()
}

function onDragStart(e: DragEvent, index: number) {
  draggingIndex.value = index
  e.dataTransfer?.setData('text/plain', index.toString())
}

function onDragOver(e: DragEvent, index: number) {
  e.preventDefault()
  if (draggingIndex.value !== null && draggingIndex.value !== index) {
    dragOverIndex.value = index
  }
}

function onDragLeave() {
  dragOverIndex.value = null
}

function onDrop(_e: DragEvent, toIndex: number) {
  if (draggingIndex.value !== null && draggingIndex.value !== toIndex) {
    tabManager.moveTab(draggingIndex.value, toIndex)
  }
  draggingIndex.value = null
  dragOverIndex.value = null
}

function onDragEnd() {
  draggingIndex.value = null
  dragOverIndex.value = null
}
</script>

<template>
  <div class="tab-bar" role="tablist">
    <div
      v-for="(tab, index) in tabManager.tabs"
      :key="tab.id"
      class="tab"
      :class="{ 
        'tab-active': tab.id === tabManager.activeTabId,
        'tab-dragging': draggingIndex === index,
        'tab-drag-over': dragOverIndex === index && draggingIndex !== index
      }"
      role="tab"
      draggable="true"
      @click="tabManager.switchTab(tab.id)"
      @mouseup="onMiddleClick(tab.id, $event)"
      @dragstart="onDragStart($event, index)"
      @dragover="onDragOver($event, index)"
      @dragleave="onDragLeave"
      @drop="onDrop($event, index)"
      @dragend="onDragEnd"
    >
      <GripVertical class="tab-grip" :size="12" />
      <FileText class="tab-icon" :size="12" />
      <span class="tab-title">{{ tab.fileName }}</span>
      <span v-if="!tab.saved" class="tab-dirty">●</span>
      <button class="tab-close" @click.stop="onCloseClick" title="关闭">
        <X :size="12" />
      </button>
    </div>
    <button class="tab-new" @click="tabManager.openTab('# 未命名\n\n开始写作...', '未命名')" title="新建标签">
      <Plus :size="14" />
    </button>
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 4px;
  background: var(--bg-secondary, #f5f5f5);
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  overflow-x: auto;
  overflow-y: hidden;
  user-select: none;
}
.tab-bar::-webkit-scrollbar {
  display: none;
}
.tab {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 4px;
  margin: 2px 2px;
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 5px;
  cursor: grab;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}
.tab:hover {
  background: var(--bg-hover, #fafafa);
}
.tab:active {
  cursor: grabbing;
}
.tab-active {
  color: var(--text-primary, #111);
  background: var(--accent-bg, #fff);
  border-color: var(--accent-color, #3b82f6);
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.15);
}
.tab-dragging {
  opacity: 0.5;
  transform: scale(0.95);
}
.tab-drag-over {
  border-color: var(--accent-color);
  background: var(--accent-light);
}
.tab-grip {
  margin-right: 2px;
  color: var(--text-tertiary, #9ca3af);
  opacity: 0;
  transition: opacity var(--transition-fast);
  flex-shrink: 0;
}
.tab:hover .tab-grip {
  opacity: 1;
}
.tab-icon {
  margin-right: 4px;
  color: var(--text-tertiary, #9ca3af);
  flex-shrink: 0;
}
.tab-title {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tab-dirty {
  color: var(--accent-color, #f59e0b);
  margin-left: 6px;
  font-size: 10px;
}
.tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 6px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-secondary, #9ca3af);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}
.tab-close:hover {
  background: var(--bg-hover, #e5e7eb);
  color: var(--text-primary, #111);
}
.tab-new {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin: 3px 2px;
  background: transparent;
  border: 1px dashed var(--border-color, #e5e7eb);
  border-radius: 6px;
  color: var(--text-secondary, #9ca3af);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}
.tab-new:hover {
  background: var(--bg-hover, #fafafa);
  color: var(--text-primary, #111);
  border-style: solid;
}
</style>
