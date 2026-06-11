#!/usr/bin/env node
/**
 * UTF-8 BOM Removal Tool
 * Scan and remove UTF-8 BOM (EF BB BF) from project files.
 */

import fs from 'fs'
import path from 'path'

const BOM = Buffer.from([0xEF, 0xBB, 0xBF])
const DEFAULT_EXTENSIONS = ['.vue', '.js', '.ts', '.css', '.json', '.html', '.cjs', '.mjs']

function scanDir(dir, extensions, results = { checked: 0, removed: 0, files: [] }) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      scanDir(fullPath, extensions, results)
    } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
      results.checked++
      const content = fs.readFileSync(fullPath)
      if (content.length >= 3 && content[0] === BOM[0] && content[1] === BOM[1] && content[2] === BOM[2]) {
        fs.writeFileSync(fullPath, content.subarray(3))
        results.removed++
        results.files.push(fullPath)
      }
    }
  }
  return results
}

function main() {
  const targetDir = process.argv[2] || path.join(process.cwd(), 'src')
  const extArg = process.argv[3]
  const extensions = extArg ? extArg.split(',').map(e => e.trim().startsWith('.') ? e.trim() : '.' + e.trim()) : DEFAULT_EXTENSIONS

  console.log('========================================')
  console.log('  BOM Removal Tool')
  console.log('========================================')
  console.log('Target:', targetDir)
  console.log('Extensions:', extensions.join(', '))
  console.log('')

  const results = scanDir(targetDir, extensions)

  console.log('')
  console.log('========================================')
  console.log(`Checked: ${results.checked} files`)
  if (results.removed > 0) {
    console.log(`Removed BOM from ${results.removed} files:`)
    results.files.forEach(f => console.log('  [FIXED]', f))
  } else {
    console.log('No BOM found. All files are UTF-8 without BOM.')
  }
  console.log('========================================')
}

main()
