import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const distDir = path.join(projectRoot, 'dist')
const htmlPath = path.join(distDir, 'index.html')
const publicFavicon = path.join(projectRoot, 'public', 'favicon.svg')
const outputDir = path.join(projectRoot, 'dist-standalone')
const outputFile = path.join(outputDir, 'index.html')
const workspaceCopy = path.join(projectRoot, '..', 'SafePulse-职业疲劳监测系统.html')

let html = fs.readFileSync(htmlPath, 'utf8')

const cssTag = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/)
const jsTag = html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/)

if (!cssTag || !jsTag) {
  throw new Error('无法在 dist/index.html 中找到 CSS 或 JS 资源')
}

function readAsset(reference) {
  const relative = reference.replace(/^\/+/, '').replace(/^\.\//, '')
  return fs.readFileSync(path.join(distDir, relative), 'utf8')
}

const css = readAsset(cssTag[1]).replace(/<\/style/gi, '<\\/style')
const js = readAsset(jsTag[1]).replace(/<\/script/gi, '<\\/script')

// Important: use replacement callbacks. The bundled JS contains "$&" and
// similar sequences, which String.replace would otherwise interpret as
// replacement patterns and corrupt the output (premature </script>).
html = html.replace(cssTag[0], () => `<style>\n${css}\n</style>`)
html = html.replace(jsTag[0], () => `<script type="module">\n${js}\n</script>`)

if (fs.existsSync(publicFavicon)) {
  const favicon = fs.readFileSync(publicFavicon).toString('base64')
  html = html.replace(
    /<link rel="icon"[^>]*>/,
    () => `<link rel="icon" href="data:image/svg+xml;base64,${favicon}" />`,
  )
}

html = html.replace(
  '<head>',
  () =>
    '<head>\n    <!--\n      SafePulse 单文件演示版\n      可直接双击打开；数据保存在当前浏览器 localStorage（不可用时自动降级为内存模式）。\n    -->',
)

fs.mkdirSync(outputDir, { recursive: true })
fs.writeFileSync(outputFile, html, 'utf8')
fs.copyFileSync(outputFile, workspaceCopy)

const size = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0)
console.log(`Standalone HTML generated: ${outputFile}`)
console.log(`Workspace copy: ${workspaceCopy}`)
console.log(`Size: ${size} KB`)
