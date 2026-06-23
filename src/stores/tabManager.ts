import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { readFile } from '@/services/tauri'
import { emitCloseTabConfirm } from '@/utils/eventBus'

interface TabInfo {
  id: string
  filePath: string | null
  fileName: string
  content: string
  saved: boolean
  cursor: { line: number; ch: number }
}

function genId(): string {
  return crypto.randomUUID()
}

function loadState(): { tabs: TabInfo[]; activeTabId: string | null } {
  try {
    const stored = localStorage.getItem('typenext-tabs')
    if (stored) {
      const parsed = JSON.parse(stored) as { tabs: TabInfo[]; activeTabId: string | null }
      for (const tab of parsed.tabs) {
        if (tab.filePath) tab.content = ''
        tab.saved = true
      }
      return parsed
    }
  } catch {}
  const id = genId()
  return {
    tabs: [{ id, filePath: null, fileName: '未命名', content: '# 未命名\n\n开始写作...', saved: true, cursor: { line: 0, ch: 0 } }],
    activeTabId: id,
  }
}

export const useTabManager = defineStore('tabManager', () => {
  const initial = loadState()
  const tabs = ref<TabInfo[]>(initial.tabs)
  const activeTabId = ref<string | null>(initial.activeTabId)
  const activeTab = computed<TabInfo | null>(() => tabs.value.find(t => t.id === activeTabId.value) || null)
  const tabCount = computed(() => tabs.value.length)

  watch(tabs, () => {
    const serializable = tabs.value.map(t => ({ ...t, content: t.filePath ? '' : t.content }))
    localStorage.setItem('typenext-tabs', JSON.stringify({ tabs: serializable, activeTabId: activeTabId.value }))
  }, { deep: true })

  function openTab(content: string, name: string, filePath: string | null = null) {
    const tab: TabInfo = { id: genId(), filePath, fileName: name, content, saved: true, cursor: { line: 0, ch: 0 } }
    tabs.value.push(tab)
    switchTab(tab.id)
  }

  function switchTab(id: string) {
    const editorStore = useEditorStore()
    const current = activeTab.value
    if (current) {
      current.content = editorStore.markdown
      current.cursor = { ...editorStore.cursor }
      current.saved = editorStore.saved
    }
    activeTabId.value = id
    const next = tabs.value.find(t => t.id === id)
    if (next) {
      editorStore.markdown = next.content
      editorStore.filePath = next.filePath
      editorStore.fileName = next.fileName
      editorStore.saved = next.saved
      editorStore.cursor = { ...next.cursor }
    }
  }

  function updateActiveTab(data: Partial<Pick<TabInfo, 'content' | 'saved' | 'filePath' | 'fileName' | 'cursor'>>) {
    const tab = activeTab.value
    if (!tab) return
    Object.assign(tab, data)
  }

  function closeTab(id: string) {
    const idx = tabs.value.findIndex(t => t.id === id)
    if (idx === -1) return
    tabs.value.splice(idx, 1)
    if (tabs.value.length === 0) {
      openTab('# 未命名\n\n开始写作...', '未命名')
      return
    }
    if (activeTabId.value === id) {
      switchTab(tabs.value[Math.min(idx, tabs.value.length - 1)].id)
    }
  }

  function requestCloseTab() {
    const editorStore = useEditorStore()
    if (!editorStore.saved && editorStore.markdown.trim()) {
      emitCloseTabConfirm(editorStore.fileName, (confirmed: boolean) => {
        if (confirmed) closeTab(activeTabId.value!)
      })
    } else {
      closeTab(activeTabId.value!)
    }
  }

  async function initFromDisk() {
    const editorStore = useEditorStore()
    for (const tab of tabs.value) {
      if (!tab.filePath || tab.content) continue
      try {
        tab.content = await readFile(tab.filePath)
        tab.saved = true
      } catch {
        tab.content = '# 未命名\n\n开始写作...'
        tab.saved = true
      }
    }
    if (activeTab.value) {
      editorStore.markdown = activeTab.value.content
      editorStore.filePath = activeTab.value.filePath
      editorStore.fileName = activeTab.value.fileName
      editorStore.saved = activeTab.value.saved
      editorStore.cursor = { ...activeTab.value.cursor }
    }
  }

  function selectPrevTab() {
    if (tabs.value.length <= 1) return
    const currentIdx = tabs.value.findIndex(t => t.id === activeTabId.value)
    const prevIdx = currentIdx > 0 ? currentIdx - 1 : tabs.value.length - 1
    switchTab(tabs.value[prevIdx].id)
  }

  function selectNextTab() {
    if (tabs.value.length <= 1) return
    const currentIdx = tabs.value.findIndex(t => t.id === activeTabId.value)
    const nextIdx = currentIdx < tabs.value.length - 1 ? currentIdx + 1 : 0
    switchTab(tabs.value[nextIdx].id)
  }

  function moveTab(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= tabs.value.length || toIndex >= tabs.value.length) return
    const [moved] = tabs.value.splice(fromIndex, 1)
    tabs.value.splice(toIndex, 0, moved)
  }

  return { tabs, activeTabId, activeTab, tabCount, openTab, switchTab, updateActiveTab, closeTab, requestCloseTab, initFromDisk, selectPrevTab, selectNextTab, moveTab }
})