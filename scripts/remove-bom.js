import fs from 'node:fs'
import path from 'node:path'

const rootDir = path.resolve(process.cwd(), 'src')
const exts = new Set(['.js', '.ts', '.vue', '.css', '.json'])
const bom = '\uFEFF'

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath, files)
      continue
    }
    if (exts.has(path.extname(entry.name))) {
      files.push(fullPath)
    }
  }
  return files
}

let checked = 0
let fixed = 0

for (const file of walk(rootDir)) {
  checked++
  const content = fs.readFileSync(file, 'utf8')
  if (!content.startsWith(bom)) continue
  fs.writeFileSync(file, content.slice(1), 'utf8')
  fixed++
}

console.log(`Checked ${checked} files, removed BOM from ${fixed} files.`)
