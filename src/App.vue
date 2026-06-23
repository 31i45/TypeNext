<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useEventListener, useDropZone } from '@vueuse/core'
import EditorLayout from '@/components/EditorLayout.vue'
import TabBar from '@/components/TabBar.vue'
import StatusBar from '@/components/StatusBar.vue'
import { useFileStore } from '@/stores/file'
import { useTabManager } from '@/stores/tabManager'
import { useSettingsStore } from '@/stores/settings'
import { toggleHelpBus, closeTabRequestBus, closeTabConfirmBus } from '@/utils/eventBus'

const fileStore = useFileStore()
const tabManager = useTabManager()
const settingsStore = useSettingsStore()
const showHelp = ref(false)
const showCloseConfirm = ref(false)
const showSettings = ref(false)
const closeConfirmFileName = ref('')
let closeConfirmCallback: ((confirmed: boolean) => void) | null = null

function onToggleHelp() { showHelp.value = !showHelp.value }
function onToggleSettings() { showSettings.value = !showSettings.value }

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (showHelp.value) showHelp.value = false
    if (showCloseConfirm.value) { showCloseConfirm.value = false; closeConfirmCallback?.(false); closeConfirmCallback = null }
    if (showSettings.value) showSettings.value = false
  }
}

function onCloseTabRequest() { tabManager.requestCloseTab() }

function onCloseTabConfirm(data: { fileName: string; callback: (confirmed: boolean) => void }) {
  closeConfirmFileName.value = data.fileName
  closeConfirmCallback = data.callback
  showCloseConfirm.value = true
}

function handleCloseConfirm(confirmed: boolean) {
  showCloseConfirm.value = false
  closeConfirmCallback?.(confirmed)
  closeConfirmCallback = null
}

toggleHelpBus.on(onToggleHelp)
useEventListener(window, 'toggle-settings', onToggleSettings)
closeTabRequestBus.on(onCloseTabRequest)
closeTabConfirmBus.on(onCloseTabConfirm)
useEventListener(document, 'keydown', onKeydown, { capture: true })

useDropZone(document.body, {
  onDrop(files) {
    if (!files) return
    for (const file of files) {
      if (file.name.toLowerCase().endsWith('.md') || file.type.includes('markdown')) {
        fileStore.openDroppedFile(file)
      }
    }
  },
})

onMounted(async () => {
  try { await tabManager.initFromDisk() }
  catch { tabManager.openTab('# 未命名\n\n开始写作...', '未命名') }
})
</script>

<template>
  <div class="typenext">
    <TabBar />
    <EditorLayout />
    <StatusBar />

    <div v-if="showHelp" class="help-overlay" @click.self="showHelp = false">
      <div class="help-modal" role="dialog" aria-modal="true">
        <div class="help-title">TypeNext 快捷键</div>
        <div class="help-section">
          <div class="help-group">文件</div>
          <div class="help-item"><kbd>Ctrl</kbd>+<kbd>N</kbd> 新建文件</div>
          <div class="help-item"><kbd>Ctrl</kbd>+<kbd>O</kbd> 打开文件</div>
          <div class="help-item"><kbd>Ctrl</kbd>+<kbd>S</kbd> 保存文件</div>
          <div class="help-item"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> 另存为（支持 MD/HTML/PDF）</div>
          <div class="help-item"><kbd>Ctrl</kbd>+<kbd>W</kbd> 关闭标签（无标签时新建）</div>
        </div>
        <div class="help-section">
          <div class="help-group">标签</div>
          <div class="help-item"><kbd>Ctrl</kbd>+<kbd>Tab</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Tab</kbd> 切换标签</div>
        </div>
        <div class="help-section">
          <div class="help-group">编辑</div>
          <div class="help-item"><kbd>Ctrl</kbd>+<kbd>Z</kbd> 撤销 · <kbd>Ctrl</kbd>+<kbd>Y</kbd> 重做</div>
          <div class="help-item"><kbd>Ctrl</kbd>+<kbd>B</kbd> 加粗 · <kbd>Ctrl</kbd>+<kbd>I</kbd> 斜体 · <kbd>Ctrl</kbd>+<kbd>U</kbd> 下划线</div>
          <div class="help-item"><kbd>Ctrl</kbd>+<kbd>/</kbd> 行内代码 · <kbd>Ctrl</kbd>+<kbd>K</kbd> 插入链接</div>
          <div class="help-item"><kbd>Ctrl</kbd>+<kbd>T</kbd> 插入表格 · <kbd>Ctrl</kbd>+<kbd>L</kbd> 选中整行</div>
        </div>
        <div class="help-section">
          <div class="help-group">打印</div>
          <div class="help-item"><kbd>Ctrl</kbd>+<kbd>P</kbd> 打印文档</div>
        </div>
        <div class="help-section">
          <div class="help-group">视图</div>
          <div class="help-item"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd> 循环切换视图（源码/分屏/预览）</div>
          <div class="help-item">点击状态栏太阳/月亮图标切换主题</div>
        </div>
        <div class="help-section help-tips">
          <div class="help-group">其他 Markdown 语法直接敲击即可</div>
          <div class="help-item"># ## ### → 标题 · **文字** → 加粗 · *文字* → 斜体</div>
          <div class="help-item">- / 1. → 列表 · &gt; → 引用 · --- → 分割线 · `code` → 行内代码</div>
          <div class="help-item">[文字](链接) → 链接 · ![描述](图片) → 图片 · ```lang → 代码块（含 mermaid 图表）</div>
          <div class="help-item">$公式$ → 行内数学 · $$公式$$ → 块级数学</div>
        </div>
        <div class="help-footer">按 <kbd>Esc</kbd> 或点击空白处关闭</div>
      </div>
    </div>

    <div v-if="showCloseConfirm" class="help-overlay" @click.self="handleCloseConfirm(false)">
      <div class="help-modal" role="dialog" aria-modal="true">
        <div class="help-title">确认关闭</div>
        <div class="help-section">
          <div class="help-item">文件「{{ closeConfirmFileName }}」尚未保存，确定要关闭吗？</div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="handleCloseConfirm(false)">取消</button>
          <button class="btn btn-primary" @click="handleCloseConfirm(true)">关闭（不保存）</button>
        </div>
      </div>
    </div>

    <div v-if="showSettings" class="help-overlay" @click.self="showSettings = false">
      <div class="help-modal" role="dialog" aria-modal="true">
        <div class="help-title">设置</div>
        <div class="help-section">
          <div class="help-group">外观</div>
          <div class="help-item">
            <label>字体大小：</label>
            <input type="range" :value="settingsStore.fontSize" min="12" max="24" @input="(e) => settingsStore.fontSize = Number((e.target as HTMLInputElement).value)" />
            <span>{{ settingsStore.fontSize }}px</span>
          </div>
          <div class="help-item">
            <label>行高：</label>
            <input type="range" :value="settingsStore.lineHeight" min="1.2" max="2.5" step="0.1" @input="(e) => settingsStore.lineHeight = Number((e.target as HTMLInputElement).value)" />
            <span>{{ settingsStore.lineHeight }}</span>
          </div>
          <div class="help-item">
            <button class="btn btn-primary" @click="settingsStore.toggleTheme()">
              {{ settingsStore.isDark ? '切换到浅色主题' : '切换到深色主题' }}
            </button>
          </div>
        </div>
        <div class="help-footer">按 <kbd>Esc</kbd> 或点击空白处关闭</div>
      </div>
    </div>
  </div>
</template>

<style>
.typenext {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary, #fff);
}

.typenext > :nth-child(2) {
  flex: 1;
  min-height: 0;
}

kbd {
  display: inline-block;
  padding: 1px 7px;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.15));
  border-bottom-width: 2px;
  border-radius: 4px;
  background: var(--bg-secondary, #f6f6f6);
  color: var(--text-primary, #222);
  line-height: 1.4;
}
</style>
