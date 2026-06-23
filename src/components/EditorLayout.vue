<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'
import SourceEditor from './SourceEditor.vue'
import MarkdownPreview from './MarkdownPreview.vue'

const settingsStore = useSettingsStore()
</script>

<template>
  <div class="editor-layout" :class="settingsStore.viewMode">
    <div v-if="settingsStore.viewMode === 'source' || settingsStore.viewMode === 'split'" class="source-panel">
      <SourceEditor />
    </div>
    <div v-if="settingsStore.viewMode === 'preview' || settingsStore.viewMode === 'split'" class="preview-panel">
      <MarkdownPreview />
    </div>
  </div>
</template>

<style scoped>
.editor-layout {
  flex: 1;
  display: flex;
  min-height: 0;
  background: var(--editor-bg);
}

.source-panel,
.preview-panel {
  flex: 1;
  min-height: 0;
  min-width: 0;
}

.editor-layout.split {
  .source-panel {
    border-right: 1px solid var(--border-color);
  }
}

.editor-layout.source {
  .source-panel {
    flex: 1;
  }
}

.editor-layout.preview {
  .preview-panel {
    flex: 1;
  }
}
</style>