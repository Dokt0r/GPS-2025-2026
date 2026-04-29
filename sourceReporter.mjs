import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function toFsPath(moduleId) {
  if (!moduleId) return ''; // Evitar fallos si no hay ruta
  if (moduleId.startsWith('file:')) return fileURLToPath(moduleId)
  if (process.platform === 'win32') return moduleId.replace(/\//g, '\\')
  return moduleId
}

function resolveImport(importPath, testFileDir) {
  const base = resolve(testFileDir, importPath)
  for (const ext of ['', '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx']) {
    const full = base + ext
    if (existsSync(full)) return full
  }
  return null
}

function extractRelativeImports(content) {
  const imports = []
  for (const regex of [/from\s+['"]([^'"]+)['"]/g, /require\(['"]([^'"]+)['"]\)/g]) {
    let match
    while ((match = regex.exec(content)) !== null) {
      if (match[1].startsWith('.')) imports.push(match[1])
    }
  }
  return imports
}

function extractTestedPrefixes(testContent) {
  const prefixes = new Set()
  const regex = /['"`](\/api\/[^'"`?#\s/]+)/g
  let match
  while ((match = regex.exec(testContent)) !== null) prefixes.add(match[1])
  return prefixes
}

function parseRouteRegistry(content, fileDir) {
  const varToPath = {}
  const requireRe = /(?:const|let|var)\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g
  let m
  while ((m = requireRe.exec(content)) !== null) varToPath[m[1]] = m[2]

  const routes = []
  const useRe = /app\.use\(['"]([^'"]+)['"]\s*,\s*(\w+)\)/g
  while ((m = useRe.exec(content)) !== null) {
    const importPath = varToPath[m[2]]
    if (importPath) routes.push({ prefix: m[1], importPath, fileDir })
  }
  return routes
}

function parseLocalSrcImports(testContent, testFilePath) {
  const seen = new Set()
  const results = []
  const testedPrefixes = extractTestedPrefixes(testContent)

  function walk(fileContent, fileDir) {
    const registryRoutes = parseRouteRegistry(fileContent, fileDir)
    if (registryRoutes.length > 0) {
      for (const { prefix, importPath, fileDir: rDir } of registryRoutes) {
        const matches = [...testedPrefixes].some(p => p.startsWith(prefix))
        if (!matches) continue
        const resolved = resolveImport(importPath, rDir)
        if (!resolved || seen.has(resolved) || !/[/\\]src[/\\]/.test(resolved)) continue
        seen.add(resolved)
        results.push(resolved)
        try { walk(readFileSync(resolved, 'utf-8'), dirname(resolved)) } catch { }
      }
      for (const p of extractRelativeImports(fileContent)) {
        const resolved = resolveImport(p, fileDir)
        if (!resolved || seen.has(resolved) || !/[/\\]src[/\\]/.test(resolved)) continue
        if (registryRoutes.some(r => resolveImport(r.importPath, r.fileDir) === resolved)) continue
        seen.add(resolved)
        results.push(resolved)
        try { walk(readFileSync(resolved, 'utf-8'), dirname(resolved)) } catch { }
      }
      return
    }

    for (const p of extractRelativeImports(fileContent)) {
      const resolved = resolveImport(p, fileDir)
      if (!resolved || seen.has(resolved) || !/[/\\]src[/\\]/.test(resolved)) continue
      seen.add(resolved)
      results.push(resolved)
      try { walk(readFileSync(resolved, 'utf-8'), dirname(resolved)) } catch { }
    }
  }

  walk(testContent, dirname(testFilePath))
  return results
}

// ADAPTADO A VITEST: 'tasks' en lugar de 'children', y result no es función
function countTestsInCollection(tasks, state) {
  let n = 0
  if (!tasks) return n;
  for (const task of tasks) {
    if (task.type === 'test') {
      if (task.result?.state === state) n++
    } else if (task.tasks) {
      n += countTestsInCollection(task.tasks, state)
    }
  }
  return n
}

// ADAPTADO A VITEST
function renderChildren(tasks, depth = 0) {
  let html = ''
  if (!tasks) return html;
  const indent = depth * 18

  for (const task of tasks) {
    if (task.type === 'suite') {
      html += `<div class="suite" style="padding-left:${indent}px">
        <span class="suite-label">${escapeHtml(task.name)}</span>
        ${renderChildren(task.tasks, depth + 1)}
      </div>`
    } else if (task.type === 'test') {
      const state = task.result?.state || 'skipped'
      const cls = state === 'passed' ? 'pass' : state === 'failed' ? 'fail' : 'skip'
      const icon = state === 'passed' ? '✓' : state === 'failed' ? '✗' : '○'
      const err = task.result?.errors?.[0]?.message || ''
      html += `<div class="task-row ${cls}" style="padding-left:${indent + 18}px">
        <span class="task-icon">${icon}</span>
        <span class="task-name">${escapeHtml(task.name)}</span>
        ${err ? `<div class="task-error">${escapeHtml(err)}</div>` : ''}
      </div>`
    }
  }
  return html
}

function buildSourceBlocks(sourceFiles) {
  return sourceFiles.map(srcPath => {
    try {
      const content = readFileSync(srcPath, 'utf-8')
      const label = srcPath.replace(/\\/g, '/').replace(/.*\/src\//, 'src/')
      return `<details class="code-block">
        <summary class="code-label source-label">${escapeHtml(label)}</summary>
        <pre class="code"><code class="language-javascript">${escapeHtml(content)}</code></pre>
      </details>`
    } catch {
      return ''
    }
  }).join('')
}

function buildSections(files) {
  return files.map(file => {
    // ADAPTADO A VITEST: 'filepath' en lugar de 'moduleId'
    const filePath = toFsPath(file.filepath)
    let testCode = ''
    try { 
      testCode = readFileSync(filePath, 'utf-8') 
    } catch (err) { 
      // Si falla, mostramos el error en vez de dejarlo todo en blanco
      return `<div style="padding: 16px; border: 1px solid red; background: #fff5f5; margin-bottom: 16px;">
        <strong>Error procesando archivo:</strong> ${escapeHtml(filePath)}<br>
        <small>${escapeHtml(err.message)}</small>
      </div>`
    }

    const sourceFiles = parseLocalSrcImports(testCode, filePath)
    const passCount = countTestsInCollection(file.tasks, 'passed')
    const failCount = countTestsInCollection(file.tasks, 'failed')
    const skipCount = countTestsInCollection(file.tasks, 'skipped')
    const hasFailure = failCount > 0
    // ADAPTADO A VITEST: 'name' en lugar de 'relativeModuleId'
    const shortPath = file.name.replace(/\\/g, '/')

    return `<details class="test-file ${hasFailure ? 'has-failures' : 'all-pass'}">
      <summary class="file-summary">
        <span class="file-status-icon">${hasFailure ? '✗' : '✓'}</span>
        <span class="file-name">${escapeHtml(shortPath)}</span>
        <span class="file-stats">
          <span class="stat-pass">${passCount} passed</span>
          ${failCount ? `<span class="stat-fail">${failCount} failed</span>` : ''}
          ${skipCount ? `<span class="stat-skip">${skipCount} skipped</span>` : ''}
        </span>
      </summary>
      <div class="file-body">
        <div class="task-tree">${renderChildren(file.tasks)}</div>
        <div class="code-pair">
          <details class="code-block">
            <summary class="code-label test-label">Código del test — ${escapeHtml(shortPath)}</summary>
            <pre class="code"><code class="language-javascript">${escapeHtml(testCode)}</code></pre>
          </details>
          ${buildSourceBlocks(sourceFiles)}
        </div>
      </div>
    </details>`
  }).join('\n')
}

function generateHtml(sections, title) {
// EL MISMO HTML QUE YA TENÍAS (no lo cambio para que conserve tus estilos)
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script>document.addEventListener('DOMContentLoaded', () => hljs.highlightAll())</script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f6f8fa; color: #24292f; margin: 0; padding: 24px; }
    h1 { font-size: 1.4rem; font-weight: 700; margin: 0 0 20px; color: #1f2328; }
    .test-file { background: #fff; border: 1px solid #d0d7de; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
    .test-file.has-failures { border-left: 4px solid #cf222e; }
    .test-file.all-pass     { border-left: 4px solid #1a7f37; }
    .file-summary { display: flex; align-items: center; gap: 10px; padding: 12px 16px; cursor: pointer; list-style: none; background: #f6f8fa; border-bottom: 1px solid #d0d7de; user-select: none; }
    .file-summary::-webkit-details-marker { display: none; }
    .file-summary::before { content: '▾'; font-size: 0.8rem; color: #57606a; transition: transform .15s; }
    details.test-file:not([open]) .file-summary::before { transform: rotate(-90deg); }
    details.test-file:not([open]) .file-summary { border-bottom: none; }
    .file-status-icon { font-size: 1rem; font-weight: bold; }
    .has-failures .file-status-icon { color: #cf222e; }
    .all-pass .file-status-icon     { color: #1a7f37; }
    .file-name  { font-weight: 600; font-size: 0.9rem; flex: 1; }
    .file-stats { display: flex; gap: 8px; font-size: 0.8rem; }
    .stat-pass  { color: #1a7f37; }
    .stat-fail  { color: #cf222e; }
    .stat-skip  { color: #9a6700; }
    .file-body { padding: 16px; }
    .task-tree { margin-bottom: 16px; font-size: 0.85rem; }
    .suite { margin: 4px 0; }
    .suite-label { font-weight: 600; color: #57606a; font-size: 0.8rem; text-transform: uppercase; letter-spacing: .04em; }
    .task-row { display: flex; align-items: flex-start; gap: 6px; padding: 2px 0; }
    .task-icon { font-weight: bold; flex-shrink: 0; margin-top: 1px; }
    .task-row.pass .task-icon { color: #1a7f37; }
    .task-row.fail .task-icon { color: #cf222e; }
    .task-row.skip .task-icon { color: #9a6700; }
    .task-name { color: #24292f; }
    .task-error { margin-top: 4px; padding: 6px 10px; background: #fff5f5; border-left: 3px solid #cf222e; border-radius: 4px; font-family: 'SFMono-Regular', Consolas, monospace; font-size: 0.78rem; color: #cf222e; white-space: pre-wrap; word-break: break-word; }
    .code-pair  { display: flex; flex-direction: column; gap: 16px; }
    .code-block { border: 1px solid #d0d7de; border-radius: 6px; overflow: hidden; }
    .code-label { display: flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 0.78rem; font-weight: 600; letter-spacing: .03em; cursor: pointer; user-select: none; list-style: none; }
    .code-label::-webkit-details-marker { display: none; }
    .code-label::before { content: '▾'; font-size: 0.7rem; transition: transform .15s; }
    details.code-block:not([open]) .code-label::before { transform: rotate(-90deg); }
    .test-label   { background: #ddf4ff; color: #0550ae; border-bottom: 1px solid #b6e3ff; }
    .source-label { background: #fff8c5; color: #7d4e00; border-bottom: 1px solid #eac54f; }
    details.code-block:not([open]) .code-label { border-bottom: none; }
    .code { margin: 0; padding: 14px 16px; overflow-x: auto; font-size: 0.8rem; line-height: 1.55; background: #f6f8fa; }
    .code code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; background: transparent; padding: 0; }
    .hljs { background: transparent; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${sections}
</body>
</html>`
}

export default class SourceReporter {
  constructor(options = {}) {
    this.outputFile = options.outputFile ?? './test-report/source-report.html'
    this.title = options.title ?? 'Backend — Reporte con Código Fuente'
  }

  // ADAPTADO A VITEST: El hook se llama onFinished, y recibe 'files'
  onFinished(files = []) {
    try {
      const sections = buildSections(files)
      const html = generateHtml(sections, this.title)
      const outPath = resolve(this.outputFile)
      const outDir = dirname(outPath)
      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
      writeFileSync(outPath, html, 'utf-8')
      console.log(`\n✅ Source report generado: ${outPath}`)
    } catch (err) {
      console.error('SourceReporter error critico:', err)
    }
  }
}