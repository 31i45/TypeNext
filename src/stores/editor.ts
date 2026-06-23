import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useEditorStore = defineStore('editor', () => {
  const markdown = ref('# 未命名\n\n开始写作...')
  const filePath = ref<string | null>(null)
  const fileName = ref('未命名')
  const saved = ref(true)
  const cursor = ref({ line: 0, ch: 0 })

  return { markdown, filePath, fileName, saved, cursor }
})