import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { pickFile, saveFileDialog, writeFile, readFile } from '@/services/tauri'
import { useEditorStore } from '@/stores/editor'
import { useTabManager } from '@/stores/tabManager'
import { useHistoryStore } from '@/stores/history'
import { emitSaved } from '@/utils/eventBus'

export const useFileStore = defineStore('file', () => {
  const error = ref<string | null>(null)
  const editor = useEditorStore()
  const tab = useTabManager()
  const history = useHistoryStore()

  const debouncedAutoSave = useDebounceFn(async () => {
    if (!editor.filePath || editor.saved) return
    await saveFile()
  }, 30000)

  async function openFile() {
    try {
      const result = await pickFile()
      if (result) {
        tab.openTab(result.content, result.name, result.path)
        if (result.path) history.add(result.path, result.name)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '打开文件失败'
    }
  }

  async function openFromHistory(path: string) {
    try {
      const content = await readFile(path)
      const name = path.split(/[\\/]/).pop() || 'Untitled.md'
      history.add(path, name)
      tab.openTab(content, name, path)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '打开文件失败'
    }
  }

  async function openDroppedFile(file: File) {
    try {
      const content = await file.text()
      tab.openTab(content, file.name, null)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '读取文件失败'
    }
  }

  async function saveFile() {
    if (!editor.filePath) {
      await saveAsFile()
      return
    }
    try {
      await writeFile(editor.filePath, editor.markdown)
      editor.saved = true
      tab.updateActiveTab({ saved: true, content: editor.markdown })
      emitSaved()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '保存失败'
    }
  }

  async function saveAsFile() {
    try {
      const result = await saveFileDialog(editor.fileName)
      if (result && result.success) {
        const path = result.path
        const ext = path.split('.').pop()?.toLowerCase()
        let content = editor.markdown

        if (ext === 'html') {
          const { exportHtml } = await import('@/utils/exportService')
          const htmlContent = await exportHtml(editor.markdown, editor.fileName, true)
          content = htmlContent || editor.markdown
        } else if (ext === 'pdf') {
          const { exportPdf } = await import('@/utils/exportService')
          await exportPdf(editor.markdown, editor.fileName)
          editor.saved = true
          tab.updateActiveTab({ saved: true })
          return
        }

        await writeFile(path, content)
        editor.filePath = path
        editor.fileName = path.split(/[\\/]/).pop() || 'Untitled.md'
        editor.saved = true
        tab.updateActiveTab({
          saved: true,
          filePath: path,
          fileName: path.split(/[\\/]/).pop() || 'Untitled.md',
          content: editor.markdown,
        })
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '保存失败'
    }
  }

  function newFile() {
    tab.openTab('# 未命名\n\n开始写作...', '未命名')
  }

  watch(() => editor.markdown, debouncedAutoSave)

  return { error, openFile, openFromHistory, openDroppedFile, saveFile, saveAsFile, newFile }
})