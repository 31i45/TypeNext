<template>
  <div class="markdown-preview-wrapper" ref="previewRef">
    <div class="markdown-preview-content" v-html="previewHtml"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import { useEventListener, useDebounceFn } from '@vueuse/core'
import { useEditorStore } from '@/stores/editor'
import { useSettingsStore } from '@/stores/settings'
import { emitPreviewScroll, sourceScrollBus } from '@/utils/eventBus'

const editorStore = useEditorStore()
const settingsStore = useSettingsStore()
const previewHtml = ref('')
const previewRef = ref<HTMLElement | null>(null)

interface ParagraphMapping {
  sourceStart: number
  sourceEnd: number
  previewElement: HTMLElement
  previewTop: number
}

let paragraphMappings: ParagraphMapping[] = []

async function updatePreview() {
  if (!editorStore.markdown?.trim()) { previewHtml.value = '<p></p>'; return }
  try {
    const { markdownToRenderedHtmlBody } = await import('@/utils/exportService')
    previewHtml.value = await markdownToRenderedHtmlBody(editorStore.markdown)
    await renderMermaidDiagrams()
    await buildParagraphMapping()
  } catch (e) {
    previewHtml.value = `<pre style="white-space:pre-wrap;padding:16px;background:var(--bg-code);border-radius:6px;">${editorStore.markdown}</pre>`
  }
}

async function renderMermaidDiagrams() {
  await nextTick()
  const containers = document.querySelectorAll('.mermaid-render-container')
  if (!containers.length) return
  const { default: mermaid } = await import('mermaid')
  mermaid.initialize({ startOnLoad: false, theme: settingsStore.isDark ? 'dark' : 'default' })
  for (const c of containers) {
    const code = c.getAttribute('data-mermaid-code')
    if (!code) continue
    try { c.innerHTML = (await mermaid.render('m-' + Math.random().toString(36).slice(2), code)).svg }
    catch (e) { c.innerHTML = `<div style="color:#d73a49;padding:20px;">Mermaid 错误: ${(e as Error).message}</div>` }
  }
}

async function buildParagraphMapping() {
  await nextTick()
  paragraphMappings = []
  const content = previewRef.value?.querySelector('.markdown-preview-content')
  if (!content) return
  
  const elements = content.querySelectorAll('[data-source-start]')
  for (const el of elements) {
    const start = parseInt(el.getAttribute('data-source-start') || '0')
    const end = parseInt(el.getAttribute('data-source-end') || '0')
    if (start > 0) {
      paragraphMappings.push({
        sourceStart: start,
        sourceEnd: end,
        previewElement: el as HTMLElement,
        previewTop: 0
      })
    }
  }
  
  updatePreviewPositions()
}

function updatePreviewPositions() {
  const content = previewRef.value?.querySelector('.markdown-preview-content')
  if (!content) return
  
  const contentRect = content.getBoundingClientRect()
  for (const mapping of paragraphMappings) {
    const rect = mapping.previewElement.getBoundingClientRect()
    mapping.previewTop = rect.top - contentRect.top
  }
  
  paragraphMappings.sort((a, b) => a.sourceStart - b.sourceStart)
}

let isScrollingFromSource = false

const debouncedScroll = useDebounceFn(() => {
  if (!previewRef.value || isScrollingFromSource) return
  updatePreviewPositions()
  
  const previewContent = previewRef.value.querySelector('.markdown-preview-content')
  if (!previewContent) return
  
  const scrollTop = previewRef.value.scrollTop
  const max = previewContent.scrollHeight - previewRef.value.clientHeight
  
  if (max <= 0) return
  
  const scrollPercentage = scrollTop / max
  const totalLines = (editorStore.markdown || '').split('\n').length
  
  if (paragraphMappings.length > 0) {
    const targetPreviewTop = scrollTop
    let closestMapping: ParagraphMapping | null = null
    let minDiff = Infinity
    
    for (const mapping of paragraphMappings) {
      const diff = Math.abs(mapping.previewTop - targetPreviewTop)
      if (diff < minDiff) {
        minDiff = diff
        closestMapping = mapping
      }
    }
    
    if (closestMapping) {
      const avgLine = (closestMapping.sourceStart + closestMapping.sourceEnd) / 2
      const sourcePercentage = avgLine / totalLines
      emitPreviewScroll(Math.min(1, Math.max(0, sourcePercentage)))
      return
    }
  }
  
  emitPreviewScroll(scrollPercentage)
}, 50)

function handleSourceScroll(sourcePercentage: number) {
  if (!previewRef.value || isScrollingFromSource) return
  updatePreviewPositions()
  
  const previewContent = previewRef.value.querySelector('.markdown-preview-content')
  if (!previewContent) return
  
  const totalLines = (editorStore.markdown || '').split('\n').length
  const targetLine = Math.max(1, Math.round(sourcePercentage * totalLines))
  
  if (paragraphMappings.length > 0) {
    let targetMapping: ParagraphMapping | null = null
    
    for (let i = 0; i < paragraphMappings.length; i++) {
      const mapping = paragraphMappings[i]
      const nextMapping = paragraphMappings[i + 1]
      
      if (targetLine >= mapping.sourceStart) {
        if (!nextMapping || targetLine < nextMapping.sourceStart) {
          targetMapping = mapping
          break
        }
      }
    }
    
    if (!targetMapping) {
      targetMapping = paragraphMappings[paragraphMappings.length - 1]
    }
    
    if (targetMapping) {
      isScrollingFromSource = true
      const targetScroll = targetMapping.previewTop - previewRef.value.clientHeight * 0.3
      previewRef.value.scrollTop = Math.max(0, targetScroll)
      setTimeout(() => { isScrollingFromSource = false }, 100)
      return
    }
  }
  
  isScrollingFromSource = true
  const max = previewContent.scrollHeight - previewRef.value.clientHeight
  previewRef.value.scrollTop = max * sourcePercentage
  setTimeout(() => { isScrollingFromSource = false }, 100)
}

useEventListener(previewRef, 'scroll', debouncedScroll)
sourceScrollBus.on(handleSourceScroll)
onMounted(updatePreview)
watch(() => [editorStore.markdown, settingsStore.fontSize, settingsStore.lineHeight], updatePreview)
</script>

<style lang="scss">
.markdown-preview-wrapper {
  height: 100%;
  background: var(--editor-bg);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) transparent;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 3px; }
}

.markdown-preview-content {
  max-width: 780px;
  margin: 0 auto;
  padding: 32px 24px 64px;
  font-family: 'PingFang SC', 'SF Pro Text', 'Microsoft YaHei', 'Segoe UI', 'Source Han Sans SC', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: v-bind('settingsStore.fontSize + "px"');
  line-height: v-bind('settingsStore.lineHeight.toString()');
  color: var(--text-primary);

  p { margin: 0 0 1.2em; text-align: justify; }
  h1, h2, h3, h4, h5, h6 { font-weight: 700; color: var(--text-primary); margin-top: 2em; margin-bottom: 0.6em; line-height: 1.3; }
  h1 { font-size: 1.8em; font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 0.35em; }
  h2 { font-size: 1.55em; border-bottom: 1px solid var(--border-light); padding-bottom: 0.3em; }
  h3 { font-size: 1.35em; }
  h4 { font-size: 1.2em; }
  h5 { font-size: 1.1em; }
  h6 { font-size: 1em; color: var(--text-secondary); font-weight: 400; }
  strong { font-weight: 700; color: var(--bold-color); }
  em { font-style: italic; color: var(--italic-color); }
  code { background: var(--bg-code); padding: 0.15em 0.4em; border-radius: 4px; font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', monospace; font-size: 0.85em; color: var(--code-color); }
  pre { background: var(--bg-code); border-radius: var(--radius-lg); padding: 16px 20px; margin: 1.2em 0; overflow-x: auto; font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', monospace; font-size: 0.8em; line-height: 1.6; border: 1px solid var(--border-color); code { background: transparent; padding: 0; } }
  blockquote { margin: 1.5em 0; padding: 16px 20px; border-left: 4px solid var(--accent-color); background: var(--quote-bg); border-radius: 0 var(--radius-md); color: var(--text-secondary); font-style: italic; p { margin: 0; } }
  a { color: var(--link-color); text-decoration: none; &:hover { color: var(--link-hover); text-decoration: underline; } }
  img { max-width: 100%; border-radius: var(--radius-lg); margin: 1.5em 0; display: block; }
  ul, ol { padding-left: 1.8em; margin: 0 0 1.5em; }
  li { margin: 0.4em 0; line-height: 1.6; }
  table { border-collapse: collapse; width: 100%; margin: 1.5em 0; border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow-x: auto; line-height: 1.5; th, td { padding: 12px 16px; text-align: left; border-right: 1px solid var(--border-color); } th { background: var(--table-header-bg); font-weight: 600; } tr:nth-child(even) td { background: var(--bg-accent); } }
  hr { border: none; height: 1px; background: linear-gradient(90deg, transparent, var(--border-color), transparent); margin: 2.5em 0; }
  del, s, strike { text-decoration: line-through; color: var(--text-tertiary); }
  sup, sub { font-size: 0.7em; vertical-align: baseline; position: relative; }
  sup { top: -0.4em; }
  sub { bottom: -0.25em; }
  kbd { display: inline-flex; align-items: center; min-width: 24px; height: 24px; padding: 0 6px; font-size: 0.75em; font-family: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace; background: var(--bg-code); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-secondary); }
  mark { background: rgba(251, 191, 36, 0.4); color: #1f2937; padding: 0.15em 0.4em; border-radius: 4px; }
  .katex-display { margin: 1.5em 0; overflow-x: auto; }
}

.dark mark { background: rgba(251, 191, 36, 0.25); color: #fbbf24; }
.dark pre, .dark code { --bg-code: #1c2128; --border-color: #30363d; }
</style>