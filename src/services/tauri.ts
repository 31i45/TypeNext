import { invoke } from '@tauri-apps/api/core'

/**
 * 极简文件 I/O：打开 / 保存 / 另存为。
 * 仅保留真正被前端使用的命令。
 */

export interface FileContent {
  path: string
  content: string
  name: string
}

export interface SaveResult {
  path: string
  success: boolean
}

export async function pickFile(): Promise<FileContent | null> {
  return invoke('pick_file')
}

export async function saveFileDialog(defaultPath?: string): Promise<SaveResult | null> {
  return invoke('save_file_dialog', { defaultPath })
}

export async function writeFile(path: string, content: string): Promise<boolean> {
  return invoke('write_file', { path, content })
}

export async function readFile(path: string): Promise<string> {
  return invoke('read_file', { path })
}
