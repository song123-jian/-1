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

// Regex patterns to remove nowrap/ellipsis from content cells in style blocks
// Key principle: td elements should wrap; th/button/badge/calendar can keep nowrap.
const STYLE_REPLACEMENTS = [
  // Generic: any *-table td (customer-table, todo-table, inv-table, matrix-table, etc.)
  {
    regex: /((?:\.[a-zA-Z0-9_-]+-table|\.table)\s+td\s*\{[^{}]*?)white-space\s*:\s*nowrap\s*;?/gi,
    repl: '$1',
  },
  {
    regex: /((?:\.[a-zA-Z0-9_-]+-table|\.table)\s+td\s*\{[^{}]*?)overflow\s*:\s*hidden\s*;?/gi,
    repl: '$1',
  },
  {
    regex: /((?:\.[a-zA-Z0-9_-]+-table|\.table)\s+td\s*\{[^{}]*?)text-overflow\s*:\s*ellipsis\s*;?/gi,
    repl: '$1',
  },
  // Generic content cells with known class names
  {
    regex: /(\.desc-cell\s*\{[^{}]*?)white-space\s*:\s*nowrap\s*;?/gi,
    repl: '$1',
  },
  {
    regex: /(\.remark-cell\s*\{[^{}]*?)white-space\s*:\s*nowrap\s*;?/gi,
    repl: '$1',
  },
  {
    regex: /(\.list-notes\s*\{[^{}]*?)white-space\s*:\s*nowrap\s*;?/gi,
    repl: '$1',
  },
  {
    regex: /(\.text-truncate\s*\{[^{}]*?)white-space\s*:\s*nowrap\s*;?/gi,
    repl: '$1',
  },
  {
    regex: /(\.text-truncate\s*\{[^{}]*?)overflow\s*:\s*hidden\s*;?/gi,
    repl: '$1',
  },
  {
    regex: /(\.text-truncate\s*\{[^{}]*?)text-overflow\s*:\s*ellipsis\s*;?/gi,
    repl: '$1',
  },
  // cell-actions
  {
    regex: /(\.cell-actions\s*\{[^{}]*?)white-space\s*:\s*nowrap\s*;?/gi,
    repl: '$1',
  },
  // gantt-time-axis (ProductionManagement)
  {
    regex: /(\.gantt-time-axis\s*\{[^{}]*?)white-space\s*:\s*nowrap\s*;?/gi,
    repl: '$1',
  },
  // Generic: any rule that contains "notes" or "content" or "detail" in selector and has nowrap + ellipsis
  {
    regex: /((?:\.[a-zA-Z0-9_-]*(?:notes|content|detail|description|memo)\b)[a-zA-Z0-9_-]*\s*\{[^{}]*?)white-space\s*:\s*nowrap\s*;?/gi,
    repl: '$1',
  },
  {
    regex: /((?:\.[a-zA-Z0-9_-]*(?:notes|content|detail|description|memo)\b)[a-zA-Z0-9_-]*\s*\{[^{}]*?)overflow\s*:\s*hidden\s*;?/gi,
    repl: '$1',
  },
  {
    regex: /((?:\.[a-zA-Z0-9_-]*(?:notes|content|detail|description|memo)\b)[a-zA-Z0-9_-]*\s*\{[^{}]*?)text-overflow\s*:\s*ellipsis\s*;?/gi,
    repl: '$1',
  },
];

// Inline style replacements in template HTML
const INLINE_REPLACEMENTS = [
  // Generic pattern: td with max-width + ellipsis trilogy -> break-word
  {
    regex: /style="([^"]*?)max-width:\s*\d+px;?([^"]*?)overflow:\s*hidden;?([^"]*?)text-overflow:\s*ellipsis;?([^"]*?)white-space:\s*nowrap;?([^"]*)"/gi,
    replFn: (m, p1, p2, p3, p4, p5) => {
      // Build new style preserving other properties
      let parts = [];
      if (p1 && p1.trim()) parts.push(p1.trim());
      if (p5 && p5.trim()) parts.push(p5.trim());
      // Keep max-width if present in p1/p5
      const all = p1 + p2 + p3 + p4 + p5;
      const maxWidthMatch = all.match(/max-width:\s*\d+px;?/);
      const extra = [];
      if (maxWidthMatch) extra.push(maxWidthMatch[0]);
      extra.push('overflow-wrap:break-word');
      extra.push('word-wrap:break-word');
      if (parts.length) {
        return `style="${parts.join(';')};${extra.join(';')}"`;
      }
      return `style="${extra.join(';')}"`;
    },
  },
  // Simpler variant without max-width
  {
    regex: /style="([^"]*?)overflow:\s*hidden;?([^"]*?)text-overflow:\s*ellipsis;?([^"]*?)white-space:\s*nowrap;?([^"]*)"/gi,
    replFn: (m, p1, p2, p3, p4) => {
      let parts = [];
      if (p1 && p1.trim()) parts.push(p1.trim());
      if (p4 && p4.trim()) parts.push(p4.trim());
      const extra = ['overflow-wrap:break-word', 'word-wrap:break-word'];
      if (parts.length) {
        return `style="${parts.join(';')};${extra.join(';')}"`;
      }
      return `style="${extra.join(';')}"`;
    },
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
    for (const { regex, repl } of STYLE_REPLACEMENTS) {
      const before = newInner;
      newInner = newInner.replace(regex, repl);
      if (newInner !== before) changed = true;
    }
    // Cleanup
    newInner = newInner.replace(/\{\s*\}/g, '{}');
    newInner = newInner.replace(/;\s*;/g, ';');
    newInner = newInner.replace(/\{\s*;/g, '{');
    newInner = newInner.replace(/;\s*\}/g, '}');
    if (newInner !== block.inner) {
      const newBlock = block.full.replace(block.inner, newInner);
      content = content.slice(0, block.start) + newBlock + content.slice(block.end);
    }
  }

  // Process inline styles
  for (const { regex, replFn } of INLINE_REPLACEMENTS) {
    const before = content;
    content = content.replace(regex, replFn);
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
