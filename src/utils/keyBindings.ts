import { whenever, useMagicKeys } from '@vueuse/core'
import { useSettingsStore } from '@/stores/settings'
import { useTabManager } from '@/stores/tabManager'
import { useFileStore } from '@/stores/file'
import { useEditorStore } from '@/stores/editor'
import { emitFlushDebounce, emitCloseTabRequest } from '@/utils/eventBus'

export function initGlobalKeyBindings() {
  const settingsStore = useSettingsStore()
  const tabManager = useTabManager()
  const fileStore = useFileStore()
  const editorStore = useEditorStore()

  const { ctrl_s, ctrl_shift_s, ctrl_o, ctrl_n, ctrl_w, ctrl_tab, ctrl_shift_tab, ctrl_p, ctrl_shift_m } = useMagicKeys({
    passive: false,
    onEventFired(e) {
      const blocked = ['ctrl_s', 'ctrl_shift_s', 'ctrl_o', 'ctrl_n', 'ctrl_w', 'ctrl_tab', 'ctrl_shift_tab', 'ctrl_p', 'ctrl_shift_m']
      if (blocked.some(k => {
        const parts = k.split('_')
        const hasCtrl = parts.includes('ctrl') && (e as KeyboardEvent).ctrlKey
        const hasShift = parts.includes('shift') && (e as KeyboardEvent).shiftKey
        const key = parts.filter(p => !['ctrl', 'shift', 'alt'].includes(p))[0]
        return hasCtrl && hasShift === (parts.includes('shift')) && (e as KeyboardEvent).key.toLowerCase() === key
      })) {
        e.preventDefault()
        e.stopPropagation()
      }
    },
  })

  whenever(ctrl_s, () => {
    emitFlushDebounce()
    fileStore.saveFile()
  })

  whenever(ctrl_shift_s, () => {
    emitFlushDebounce()
    fileStore.saveAsFile()
  })

  whenever(ctrl_o, () => fileStore.openFile())
  whenever(ctrl_n, () => fileStore.newFile())
  whenever(ctrl_w, () => emitCloseTabRequest())
  whenever(ctrl_tab, () => tabManager.selectNextTab())
  whenever(ctrl_shift_tab, () => tabManager.selectPrevTab())
  whenever(ctrl_shift_m, () => settingsStore.cycleViewMode())
  whenever(ctrl_p, async () => {
    emitFlushDebounce()
    const { exportPdf } = await import('@/utils/exportService')
    exportPdf(editorStore.markdown, editorStore.fileName)
  })
}