<template>
  <div class="source-editor-container">
    <Codemirror ref="cmRef" v-model="localContent" :extensions="extensions" height="100%" class="cm-editor" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useEventListener, useDebounceFn } from '@vueuse/core'
import { useEditorStore } from '@/stores/editor'
import { useSettingsStore } from '@/stores/settings'
import { emitSourceScroll, previewScrollBus } from '@/utils/eventBus'
import { Codemirror } from 'vue-codemirror'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { autocompletion, closeBrackets } from '@codemirror/autocomplete'
import { search } from '@codemirror/search'
import { defaultKeymap, history } from '@codemirror/commands'

const editorStore = useEditorStore()
const settingsStore = useSettingsStore()
const cmRef = ref<InstanceType<typeof Codemirror> | null>(null)
const localContent = ref(editorStore.markdown)

const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, color: '#111827', fontWeight: '800' },
  { tag: tags.heading2, color: '#111827', fontWeight: '700' },
  { tag: tags.heading3, color: '#111827', fontWeight: '700' },
  { tag: tags.heading4, color: '#111827', fontWeight: '600' },
  { tag: tags.heading5, color: '#374151', fontWeight: '600' },
  { tag: tags.heading6, color: '#6b7280', fontWeight: '600' },
  { tag: tags.emphasis, fontStyle: 'italic', color: '#4b5563' },
  { tag: tags.strong, fontWeight: '700', color: '#111827' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#9ca3af' },
  { tag: tags.url, color: '#4f46e5', textDecoration: 'underline' },
  { tag: tags.processingInstruction, color: '#9ca3af' },
  { tag: tags.comment, color: '#6b7280', fontStyle: 'italic' },
  { tag: tags.string, color: '#059669' },
  { tag: tags.number, color: '#d97706' },
  { tag: tags.escape, color: '#8b5cf6' },
])

const darkHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, color: '#e6edf3', fontWeight: '800' },
  { tag: tags.heading2, color: '#e6edf3', fontWeight: '700' },
  { tag: tags.heading3, color: '#e6edf3', fontWeight: '700' },
  { tag: tags.heading4, color: '#e6edf3', fontWeight: '600' },
  { tag: tags.heading5, color: '#8b949e', fontWeight: '600' },
  { tag: tags.heading6, color: '#6e7681', fontWeight: '600' },
  { tag: tags.emphasis, fontStyle: 'italic', color: '#8b949e' },
  { tag: tags.strong, fontWeight: '700', color: '#e6edf3' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#484f58' },
  { tag: tags.url, color: '#8957e5', textDecoration: 'underline' },
  { tag: tags.processingInstruction, color: '#484f58' },
  { tag: tags.comment, color: '#484f58', fontStyle: 'italic' },
  { tag: tags.string, color: '#3fb950' },
  { tag: tags.number, color: '#d29922' },
  { tag: tags.escape, color: '#a371f7' },
])

const completions = [
  { label: '# ', detail: '一级标题' },
  { label: '## ', detail: '二级标题' },
  { label: '### ', detail: '三级标题' },
  { label: '- ', detail: '无序列表' },
  { label: '1. ', detail: '有序列表' },
  { label: '> ', detail: '引用' },
  { label: '---', detail: '分割线' },
  { label: '**', detail: '加粗' },
  { label: '*', detail: '斜体' },
  { label: '[](url)', detail: '链接' },
  { label: '![](url)', detail: '图片' },
  { label: '```', detail: '代码块' },
  { label: '`', detail: '行内代码' },
  { label: '- [ ] ', detail: '任务列表' },
  { label: '- [x] ', detail: '已完成任务' },
  { label: '$', detail: '行内公式' },
  { label: '$$', detail: '块级公式' },
].map(c => ({ ...c, type: 'keyword' }))

const customTheme = EditorView.theme({
  '&': { height: '100%' },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-editor': { height: '100%', color: 'var(--text-primary)' },
  '.cm-content': { padding: '16px', backgroundColor: 'var(--editor-bg)' },
  '.cm-line': { fontSize: 'var(--editor-font-size)', lineHeight: 'var(--editor-line-height)', fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace", color: 'var(--text-primary)' },
  '.cm-cursor': { borderLeftColor: 'var(--accent-color)' },
  '.cm-activeLine': { backgroundColor: 'var(--bg-secondary)' },
  '.cm-selectionBackground': { backgroundColor: 'var(--selection-bg)' },
  '.cm-gutters': { backgroundColor: 'var(--line-numbers-bg)', borderRight: '1px solid var(--border-color)', color: 'var(--line-numbers-color)' },
  '.cm-lineNumbers .cm-gutterElement': { paddingRight: '12px', textAlign: 'right' },
}, { dark: false })

const currentHighlightStyle = computed(() => settingsStore.isDark ? darkHighlightStyle : lightHighlightStyle)

const extensions = computed(() => [
  history(),
  markdown(),
  syntaxHighlighting(currentHighlightStyle.value),
  autocompletion({ override: [(ctx) => ctx.matchBefore(/^\s*$/) ? { from: ctx.pos, options: completions, filter: false } : null] }),
  closeBrackets(),
  search({ top: true }),
  customTheme,
  lineNumbers(),
  EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      const content = update.view.state.doc.toString()
      if (content !== editorStore.markdown) {
        editorStore.markdown = content
        editorStore.saved = false
      }
      const cursor = update.view.state.selection.main.head
      const line = update.view.state.doc.lineAt(cursor)
      editorStore.cursor = { line: line.number, ch: cursor - line.from }
    }
    if (update.viewportChanged) debouncedSyncScroll()
  }),
  keymap.of([
    ...defaultKeymap,
    { key: 'Ctrl-b', run: (v) => { wrap(v, '**', '**'); return true } },
    { key: 'Ctrl-i', run: (v) => { wrap(v, '*', '*'); return true } },
    { key: 'Ctrl-u', run: (v) => { wrap(v, '__', '__'); return true } },
    { key: 'Ctrl-/', run: (v) => { wrap(v, '`', '`'); return true } },
    { key: 'Ctrl-k', run: (v) => { insertLink(v); return true } },
    { key: 'Ctrl-t', run: (v) => { insertTable(v); return true } },
    { key: 'Ctrl-l', run: (v) => { selectLine(v); return true } },
    { key: 'Tab', run: handleTab, preventDefault: true },
  ]),
])

function wrap(view: EditorView, before: string, after: string) {
  const { from, to } = view.state.selection.main
  const content = from === to ? '' : view.state.doc.sliceString(from, to)
  view.dispatch({
    changes: { from, to, insert: before + content + after },
    selection: { anchor: from + before.length, head: from + before.length + content.length },
  })
}

function insertLink(view: EditorView) {
  const { from, to } = view.state.selection.main
  const text = from === to ? '' : view.state.doc.sliceString(from, to)
  const link = `[${text || '链接文字'}](https://)`
  view.dispatch({ changes: { from, to, insert: link }, selection: { anchor: from + link.length - 1 } })
}

function insertTable(view: EditorView) {
  const table = `| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n`
  const { from, to } = view.state.selection.main
  view.dispatch({ changes: { from, to, insert: table }, selection: { anchor: from } })
}

function selectLine(view: EditorView) {
  const line = view.state.doc.lineAt(view.state.selection.main.head)
  view.dispatch({ selection: { anchor: line.from, head: line.to } })
}

function handleTab(view: EditorView) {
  const line = view.state.doc.lineAt(view.state.selection.main.head)
  if (/^\s*([-*+]|\d+\.)\s/.test(line.text)) {
    view.dispatch({ changes: { from: view.state.selection.main.from, to: view.state.selection.main.to, insert: '  ' } })
    return true
  }
  return false
}

let isScrollingFromPreview = false

const debouncedSyncScroll = useDebounceFn(() => {
  if (isScrollingFromPreview || !cmRef.value) return
  const scroller = (cmRef.value as any).view?.dom.querySelector('.cm-scroller') as HTMLElement
  if (!scroller) return
  
  const totalLines = (editorStore.markdown || '').split('\n').length
  const lineHeight = parseFloat(scroller.style.lineHeight) || 20
  const currentLine = Math.round(scroller.scrollTop / lineHeight) + 1
  const scrollPercentage = totalLines > 0 ? currentLine / totalLines : 0
  
  emitSourceScroll(Math.min(1, Math.max(0, scrollPercentage)))
}, 50)

function handlePreviewScroll(scrollPercentage: number) {
  if (isScrollingFromPreview || !cmRef.value) return
  isScrollingFromPreview = true
  const scroller = (cmRef.value as any).view?.dom.querySelector('.cm-scroller') as HTMLElement
  if (!scroller) { setTimeout(() => { isScrollingFromPreview = false }, 100); return }
  
  const totalLines = (editorStore.markdown || '').split('\n').length
  const computedStyle = window.getComputedStyle(scroller)
  const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(scroller.style.lineHeight) || 20
  const targetLine = Math.max(1, Math.round(scrollPercentage * totalLines))
  scroller.scrollTop = (targetLine - 1) * lineHeight
  
  setTimeout(() => { isScrollingFromPreview = false }, 100)
}

watch(() => editorStore.markdown, (v) => { if (v !== localContent.value) localContent.value = v })

function updateEditorStyles() {
  document.documentElement.style.setProperty('--editor-font-size', settingsStore.fontSize + 'px')
  document.documentElement.style.setProperty('--editor-line-height', settingsStore.lineHeight.toString())
}

watch([() => settingsStore.fontSize, () => settingsStore.lineHeight], updateEditorStyles)

function focus() { (cmRef.value as any)?.view?.focus() }

defineExpose({ focus })

useEventListener(window, 'typenext-focus-source', focus)
previewScrollBus.on(handlePreviewScroll)

onMounted(() => {
  updateEditorStyles()
  nextTick(() => {
    const scroller = (cmRef.value as any)?.view?.dom.querySelector('.cm-scroller')
    if (scroller) useEventListener(scroller, 'scroll', debouncedSyncScroll)
  })
})
</script>

<style lang="scss" scoped>
.source-editor-container { 
  height: 100%; 
  overflow: hidden; 
}
:deep(.cm-editor) { height: 100%; color: var(--text-primary) !important; }
:deep(.cm-scroller) { overflow: auto; background-color: var(--editor-bg) !important; }
:deep(.cm-content) { background-color: var(--editor-bg) !important; color: var(--text-primary) !important; }
:deep(.cm-line) { color: var(--text-primary) !important; }
:deep(.cm-gutters) { background-color: var(--line-numbers-bg) !important; border-right: 1px solid var(--border-color) !important; }
:deep(.cm-lineNumbers .cm-gutterElement) { color: var(--line-numbers-color) !important; }
</style>