import { useEventBus } from '@vueuse/core'

// 全局事件总线 - 使用不同的事件名区分不同类型
export const savedBus = useEventBus<void>('typenext-saved')
export const previewScrollBus = useEventBus<number>('typenext-preview-scroll')
export const sourceScrollBus = useEventBus<number>('typenext-source-scroll')
export const closeTabRequestBus = useEventBus<void>('typenext-close-tab-request')
export const closeTabConfirmBus = useEventBus<{ fileName: string; callback: (confirmed: boolean) => void }>('typenext-close-tab-confirm')
export const flushDebounceBus = useEventBus<void>('typenext-flush-debounce')
export const toggleHelpBus = useEventBus<void>('toggle-help')

// 便捷方法
export const emitSaved = () => savedBus.emit()
export const emitPreviewScroll = (scrollPercentage: number) => previewScrollBus.emit(scrollPercentage)
export const emitSourceScroll = (scrollPercentage: number) => sourceScrollBus.emit(scrollPercentage)
export const emitCloseTabRequest = () => closeTabRequestBus.emit()
export const emitCloseTabConfirm = (fileName: string, callback: (confirmed: boolean) => void) => closeTabConfirmBus.emit({ fileName, callback })
export const emitFlushDebounce = () => flushDebounceBus.emit()
export const emitToggleHelp = () => toggleHelpBus.emit()