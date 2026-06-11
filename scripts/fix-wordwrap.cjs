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

function extractStyleBlocks(content) {
  const styles = [];
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleRegex.exec(content)) !== null) {
    styles.push({
      full: match[0],
      inner: match[1],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return styles;
}

// Patterns to replace in style blocks
// Each: [regex, replacement]
const REPLACEMENTS = [
  // .data-table td: remove the nowrap + ellipsis trilogy
  {
    regex: /(\.data-table\s+td\s*\{[^{}]*?)white-space\s*:\s*nowrap\s*;?/gi,
    repl: '$1',
  },
  {
    regex: /(\.data-table\s+td\s*\{[^{}]*?)overflow\s*:\s*hidden\s*;?/gi,
    repl: '$1',
  },
  {
    regex: /(\.data-table\s+td\s*\{[^{}]*?)text-overflow\s*:\s*ellipsis\s*;?/gi,
    repl: '$1',
  },
  // .text-truncate class: convert to wrap-friendly
  {
    regex: /\.text-truncate\s*\{[^{}]*?white-space\s*:\s*nowrap\s*;?[^{}]*\}/gi,
    repl: '.text-truncate { overflow-wrap: break-word; word-wrap: break-word; }',
  },
  // .desc-cell
  {
    regex: /(\.desc-cell\s*\{[^{}]*?)white-space\s*:\s*nowrap\s*;?/gi,
    repl: '$1',
  },
  // .remark-cell
  {
    regex: /(\.remark-cell\s*\{[^{}]*?)white-space\s*:\s*nowrap\s*;?/gi,
    repl: '$1',
  },
  // .list-notes
  {
    regex: /(\.list-notes\s*\{[^{}]*?)white-space\s*:\s*nowrap\s*;?/gi,
    repl: '$1',
  },
  // .todo-table td (similar to data-table)
  {
    regex: /(\.todo-table\s+td\s*\{[^{}]*?)white-space\s*:\s*nowrap\s*;?/gi,
    repl: '$1',
  },
  {
    regex: /(\.todo-table\s+td\s*\{[^{}]*?)overflow\s*:\s*hidden\s*;?/gi,
    repl: '$1',
  },
  {
    regex: /(\.todo-table\s+td\s*\{[^{}]*?)text-overflow\s*:\s*ellipsis\s*;?/gi,
    repl: '$1',
  },
  // .inv-table td (inbound section)
  {
    regex: /(\.inv-table\s+(?:th\s*,\s*\.inv-table\s+td|th,\s*td|td)\s*\{[^{}]*?)white-space\s*:\s*nowrap\s*;?/gi,
    repl: '$1',
  },
  // .matrix-table td
  {
    regex: /(\.matrix-table\s+(?:th\s*,\s*\.matrix-table\s+td|th,\s*td|td)\s*\{[^{}]*?)white-space\s*:\s*nowrap\s*;?/gi,
    repl: '$1',
  },
  // .cell-actions nowrap removal
  {
    regex: /(\.cell-actions\s*\{[^{}]*?)white-space\s*:\s*nowrap\s*;?/gi,
    repl: '$1',
  },
  // .gantt-time-axis (specific rule for production management)
  {
    regex: /(\.gantt-time-axis\s*\{[^{}]*?)white-space\s*:\s*nowrap\s*;?/gi,
    repl: '$1',
  },
];

// Inline style patterns in template (only for content cells, not controls)
const INLINE_REPLACEMENTS = [
  // Logs.vue table cell
  {
    regex: /style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"/gi,
    repl: 'style="max-width:300px;overflow-wrap:break-word;word-wrap:break-word"',
  },
  // DocSettings.vue table cell
  {
    regex: /style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"/gi,
    repl: 'style="max-width:300px;overflow-wrap:break-word;word-wrap:break-word"',
  },
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // Process style blocks
  const blocks = extractStyleBlocks(content);
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    let newInner = block.inner;
    for (const { regex, repl } of REPLACEMENTS) {
      const before = newInner;
      newInner = newInner.replace(regex, repl);
      if (newInner !== before) changed = true;
    }
    // Clean up empty declarations or trailing spaces inside rules
    newInner = newInner.replace(/\{\s*\}/g, '{}');
    newInner = newInner.replace(/;\s*;/g, ';');
    newInner = newInner.replace(/\{\s*;/g, '{');
    if (newInner !== block.inner) {
      const newBlock = block.full.replace(block.inner, newInner);
      content = content.slice(0, block.start) + newBlock + content.slice(block.end);
    }
  }

  // Process inline styles in template
  for (const { regex, repl } of INLINE_REPLACEMENTS) {
    const before = content;
    content = content.replace(regex, repl);
    if (content !== before) changed = true;
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
