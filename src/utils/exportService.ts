import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeStringify from 'rehype-stringify'
import { visit } from 'unist-util-visit'
import 'highlight.js/styles/github-dark.css'
import { saveFileDialog, writeFile } from '@/services/tauri'

let katexCssCache: string | null = null

async function getKatexCss(): Promise<string> {
  if (katexCssCache) return katexCssCache
  const res = await fetch('https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.css')
  katexCssCache = await res.text()
  return katexCssCache
}

function hasMath(markdown: string): boolean {
  return /(\$[^$]+\$|\$\$[^$]+\$\$)/.test(markdown)
}

export async function markdownToRenderedHtmlBody(markdown: string): Promise<string> {
  if (!markdown || markdown.trim() === '') return '<p></p>'

  const needsKatex = hasMath(markdown)

  const addSourcePosition = () => (tree: any) => {
    visit(tree, (node: any) => {
      if (node.position && node.type !== 'root' && node.type !== 'text' && node.type !== 'inlineCode') {
        if (!node.data) node.data = {}
        if (!node.data.hProperties) node.data.hProperties = {}
        node.data.hProperties['data-source-start'] = node.position.start.line
        node.data.hProperties['data-source-end'] = node.position.end.line
      }
    })
  }

  let pipeline = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(addSourcePosition)
    .use(remarkRehype)
    .use(rehypeHighlight)
    .use(rehypeStringify)

  if (needsKatex) {
    pipeline = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(addSourcePosition)
      .use(remarkRehype)
      .use(rehypeKatex)
      .use(rehypeHighlight)
      .use(rehypeStringify)
  }

  const result = await pipeline.process(markdown)
  return String(result)
}

function buildExportStyles(): string {
  return `
body { max-width: 800px; margin: 40px auto; padding: 0 20px; font-family: 'PingFang SC', 'SF Pro Text', 'Microsoft YaHei', 'Segoe UI', 'Source Han Sans SC', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.7; color: #1a1a1a; background: #fff; font-size: 16px; }
h1, h2, h3, h4, h5, h6 { margin-top: 2em; margin-bottom: 0.6em; font-weight: 700; line-height: 1.3; }
h1 { font-size: 1.8em; font-weight: 800; border-bottom: 2px solid #eaecef; padding-bottom: 0.35em; }
h2 { font-size: 1.55em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
h3 { font-size: 1.35em; }
h4 { font-size: 1.2em; }
h5 { font-size: 1.1em; }
h6 { font-size: 1em; font-weight: 400; color: #6b7280; }
p { margin: 0 0 1.2em; text-align: justify; }
strong { font-weight: 700; }
em { font-style: italic; }
a { color: #0366d6; text-decoration: none; }
a:hover { text-decoration: underline; }
hr { border: 0; border-top: 1px solid #eaecef; margin: 2.5em 0; }
code { background: #f6f8fa; padding: 0.15em 0.4em; border-radius: 4px; font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', monospace; font-size: 0.85em; }
pre { background: #f6f8fa; padding: 16px 20px; border-radius: 6px; overflow-x: auto; margin: 1.2em 0; line-height: 1.6; position: relative; font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', monospace; font-size: 0.8em; }
pre code { background: transparent; padding: 0; font-size: inherit; }
blockquote { margin: 1.5em 0; padding: 16px 20px; border-left: 4px solid #0366d6; color: #4b5563; background: #f6f8fa; border-radius: 0 6px 6px 0; font-style: italic; }
blockquote p { margin: 0; }
ul, ol { margin: 0 0 1.5em; padding-left: 1.8em; }
li { margin: 0.4em 0; line-height: 1.6; }
li > ul, li > ol { margin: 0.3em 0; }
li input[type="checkbox"] { margin-right: 0.5em; transform: scale(1.1); }
table { border-collapse: collapse; width: 100%; margin: 1.5em 0; border: 1px solid #dfe2e5; border-radius: 6px; overflow-x: auto; line-height: 1.5; }
th, td { border: 1px solid #dfe2e5; padding: 12px 16px; text-align: left; }
th { background: #f6f8fa; font-weight: 600; }
tr:nth-child(even) td { background: #fafbfc; }
img { max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 1.5em auto; }
sup { font-size: 0.7em; vertical-align: baseline; position: relative; top: -0.4em; }
sub { font-size: 0.7em; vertical-align: baseline; position: relative; bottom: -0.25em; }
mark { background: rgba(251, 191, 36, 0.4); color: #1f2937; padding: 0.15em 0.4em; border-radius: 4px; }
kbd { display: inline-flex; align-items: center; min-width: 24px; height: 24px; padding: 0 6px; font-size: 0.75em; font-family: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace; background: #f6f8fa; border: 1px solid #dfe2e5; border-radius: 4px; color: #6b7280; }
dl { margin: 1em 0; padding: 0; }
dt { font-weight: 700; margin-top: 1em; }
dd { margin-left: 1.5em; margin-bottom: 0.5em; }
.mermaid-render-container { display: block; margin: 1.5em 0; padding: 20px; background: #fafbfc; border: 1px solid #e1e4e8; border-radius: 8px; text-align: center; overflow-x: auto; }
.mermaid-render-container svg { max-width: 100%; height: auto; }
@media print { body { max-width: none; margin: 0; padding: 1.5cm 1.8cm; font-size: 10.5pt; line-height: 1.6; background: white; color: black; } h1 { font-size: 18pt; } h2 { font-size: 15pt; } h3 { font-size: 12pt; } h4 { font-size: 11pt; } h5 { font-size: 10.5pt; } h6 { font-size: 10.5pt; } code { font-size: 8pt; } pre { font-size: 8pt; line-height: 1.5; } table { font-size: 9pt; } @page { size: A4; margin: 2cm; } pre, code, table, img { page-break-inside: avoid; } h1, h2, h3 { page-break-after: avoid; } a { color: #0366d6; text-decoration: underline; } }
`
}

export async function exportHtml(markdown: string, fileName: string, returnContent = false): Promise<void | string> {
  const bodyHtml = await markdownToRenderedHtmlBody(markdown)
  const title = fileName || 'TypeNext Document'
  const safeName = title.replace(/[\\/:*?"<>|]/g, '_')
  const katexCss = hasMath(markdown) ? await getKatexCss() : ''

  const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
${buildExportStyles()}
${katexCss}
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`

  if (returnContent) return fullHtml

  try {
    const result = await saveFileDialog(`${safeName}.html`)
    if (result?.path && result.success) {
      await writeFile(result.path, fullHtml)
      return
    }
    if (!result) return
  } catch {}

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeName}.html`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a) }, 1000)
}

export async function exportPdf(markdown: string, fileName: string): Promise<void> {
  const bodyHtml = await markdownToRenderedHtmlBody(markdown)
  const title = fileName || 'TypeNext Document'
  const katexCss = hasMath(markdown) ? await getKatexCss() : ''

  document.querySelectorAll('.typenext-print-root').forEach(el => el.remove())

  const printRoot = document.createElement('div')
  printRoot.className = 'typenext-print-root'
  printRoot.innerHTML = `<style>@media screen { .typenext-print-root { display: none !important; } } @media print { body > *:not(.typenext-print-root) { display: none !important; } body { margin: 0 !important; padding: 0 !important; background: white !important; } }</style><div class="typenext-print-body"><style>${buildExportStyles()}${katexCss}</style>${bodyHtml}</div>`
  document.body.appendChild(printRoot)

  const originalTitle = document.title
  document.title = title
  setTimeout(() => { window.print(); setTimeout(() => { document.title = originalTitle; printRoot.remove() }, 500) }, 300)
}