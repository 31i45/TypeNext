import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useStorage } from '@vueuse/core'

const MAX_HISTORY = 10

interface HistoryItem {
  path: string
  name: string
  lastOpened: number
}

export const useHistoryStore = defineStore('history', () => {
  const recentFiles = useStorage<HistoryItem[]>('typenext-file-history', [])

  const sortedRecentFiles = computed(() => [...recentFiles.value].sort((a, b) => b.lastOpened - a.lastOpened))

  function add(path: string, name: string) {
    const idx = recentFiles.value.findIndex(item => item.path === path)
    if (idx !== -1) recentFiles.value.splice(idx, 1)
    recentFiles.value.unshift({ path, name, lastOpened: Date.now() })
    if (recentFiles.value.length > MAX_HISTORY) recentFiles.value = recentFiles.value.slice(0, MAX_HISTORY)
  }

  function clear() {
    recentFiles.value = []
  }

  return { recentFiles, sortedRecentFiles, add, clear }
})