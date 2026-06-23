import { defineStore } from 'pinia'
import { useDark, useToggle, useStorage } from '@vueuse/core'

export type ViewMode = 'source' | 'split' | 'preview'

export const useSettingsStore = defineStore('settings', () => {
  const isDark = useDark({
    selector: 'html',
    attribute: 'class',
    valueDark: 'dark',
    valueLight: '',
  })
  const toggleTheme = useToggle(isDark)
  
  const fontSize = useStorage('typenext-font-size', 14)
  const lineHeight = useStorage('typenext-line-height', 1.7)
  const viewMode = useStorage<ViewMode>('typenext-view-mode', 'source')

  function setViewMode(mode: ViewMode) {
    viewMode.value = mode
  }

  function cycleViewMode() {
    const modes: ViewMode[] = ['source', 'split', 'preview']
    const currentIdx = modes.indexOf(viewMode.value)
    viewMode.value = modes[(currentIdx + 1) % modes.length]
  }

  return { isDark, fontSize, lineHeight, toggleTheme, viewMode, setViewMode, cycleViewMode }
})
