<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useEditorStore } from '@/stores/editor'
import { useSettingsStore } from '@/stores/settings'
import { FileText, Clock, FileEdit, CheckCircle, HelpCircle, Sun, Moon } from '@lucide/vue'
import { emitToggleHelp } from '@/utils/eventBus'

const editorStore = useEditorStore()
const settingsStore = useSettingsStore()
const lastSavedTime = ref('')
const showSavedIndicator = ref(false)

const wordCount = computed(() => {
  const md = editorStore.markdown || ''
  return md.replace(/\s+/g, '').length
})

const lineCount = computed(() => {
  return (editorStore.markdown || '').split('\n').length
})

useEventListener(window, 'typenext-saved', () => {
  const now = new Date()
  lastSavedTime.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  showSavedIndicator.value = true
  setTimeout(() => { showSavedIndicator.value = false }, 2000)
})

function onToggleTheme() {
  settingsStore.toggleTheme()
}

function onToggleHelp() {
  emitToggleHelp()
}
</script>

<template>
  <div class="status-bar">
    <span class="status-item status-file">
      <FileText :size="12" />
      {{ editorStore.fileName }}
      <span v-if="!editorStore.saved" class="dirty">●</span>
    </span>
    <span v-if="showSavedIndicator" class="status-item status-saved">
      <CheckCircle :size="12" /> 已保存
    </span>
    <span class="status-spacer"></span>
    <span class="status-item status-cursor">
      <FileEdit :size="12" />
      {{ lineCount }} 行 · 行 {{ editorStore.cursor.line + 1 }} · 列 {{ editorStore.cursor.ch + 1 }}
    </span>
    <span class="status-item status-words">{{ wordCount }} 字</span>
    <span v-if="lastSavedTime" class="status-item status-time">
      <Clock :size="12" />
      {{ lastSavedTime }}
    </span>
    <button class="status-btn status-theme" @click="onToggleTheme" title="切换主题">
      <Sun v-if="!settingsStore.isDark" :size="12" />
      <Moon v-else :size="12" />
    </button>
    <button class="status-btn status-help" @click="onToggleHelp" title="帮助">
      <HelpCircle :size="12" />
    </button>
  </div>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 16px;
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
  background: var(--bg-secondary, #f5f5f5);
  border-top: 1px solid var(--border-color, #e5e7eb);
  user-select: none;
}
.status-item {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}
.status-spacer { flex: 1; }
.status-file {
  color: var(--text-primary, #111);
  font-weight: 500;
}
.dirty {
  color: var(--accent-color, #f59e0b);
  margin-left: 4px;
  font-weight: 600;
}
.status-saved {
  color: #10b981;
  margin-left: 8px;
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.status-cursor, .status-words, .status-time { padding-left: 16px; }
.status-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-left: 4px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.15s ease;
}
.status-btn:hover {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
}
</style>