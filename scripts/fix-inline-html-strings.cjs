const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../src');

function findVueFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.includes('node_modules')) {
      findVueFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.vue')) {
      files.push(fullPath);
    }
  }
  return files;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // Pattern: string that starts with ' or " and contains overflow-wrap or break-word
  // and spans multiple lines within <script> block
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let scriptMatch;

  while ((scriptMatch = scriptRegex.exec(content)) !== null) {
    const scriptContent = scriptMatch[1];
    const scriptStart = scriptMatch.index + scriptMatch[0].indexOf(scriptContent);

    // Find strings that span multiple lines and contain CSS-related content
    // Match single-quoted strings that span lines
    const multiLineStringRegex = /'([^'\\]*(?:\\.[^'\\]*)*)\n([\s\S]*?)'/g;
    let strMatch;

    while ((strMatch = multiLineStringRegex.exec(scriptContent)) !== null) {
      const fullMatch = strMatch[0];
      const inner = strMatch[1] + strMatch[2];

      // Only fix strings that look like inline HTML/CSS
      if (inner.includes('<!DOCTYPE') || inner.includes('<html') || inner.includes('<style') || inner.includes('overflow-wrap') || inner.includes('break-word')) {
        const fixed = "'" + inner.replace(/\n\s*/g, '') + "'";
        const absoluteStart = scriptStart + strMatch.index;
        content = content.slice(0, absoluteStart) + fixed + content.slice(absoluteStart + fullMatch.length);
        changed = true;
        // Reset regex since content changed
        scriptRegex.lastIndex = 0;
        break;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  return false;
}

function main() {
  const vueFiles = findVueFiles(SRC_DIR);
  let fixedCount = 0;

  for (const file of vueFiles) {
    try {
      if (fixFile(file)) {
        fixedCount++;
        console.log('Fixed:', path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/'));
      }
    } catch (err) {
      console.error('Error fixing', file, err.message);
    }
  }

  console.log(`\n✅ 共修复 ${fixedCount} 个文件`);
}

main();
