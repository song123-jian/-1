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

// Remove nowrap/ellipsis/overflow:hidden from any rule whose selector contains 'td'
function fixStyleBlock(blockContent) {
  let fixed = blockContent;
  let changed = false;

  // Pattern 1: simple .something td { ... }
  const simpleTdRegex = /([^{};]*\btd\b[^{};]*)\{([^{}]*)\}/gi;
  fixed = fixed.replace(simpleTdRegex, (match, selector, declarations) => {
    // Skip if selector only contains 'th' and no 'td' (should not happen due to regex)
    if (!/\btd\b/.test(selector)) return match;

    let newDecl = declarations;
    // Remove white-space: nowrap
    if (/white-space\s*:\s*nowrap/.test(newDecl)) {
      newDecl = newDecl.replace(/\s*white-space\s*:\s*nowrap\s*;?/gi, ';');
      changed = true;
    }
    // Remove overflow: hidden
    if (/overflow\s*:\s*hidden/.test(newDecl)) {
      newDecl = newDecl.replace(/\s*overflow\s*:\s*hidden\s*;?/gi, ';');
      changed = true;
    }
    // Remove text-overflow: ellipsis
    if (/text-overflow\s*:\s*ellipsis/.test(newDecl)) {
      newDecl = newDecl.replace(/\s*text-overflow\s*:\s*ellipsis\s*;?/gi, ';');
      changed = true;
    }
    // Add overflow-wrap if not present
    if (!/overflow-wrap\s*:\s*break-word/.test(newDecl)) {
      newDecl = newDecl.trim();
      if (newDecl && !newDecl.endsWith(';')) newDecl += ';';
      newDecl += ' overflow-wrap: break-word; word-wrap: break-word;';
      changed = true;
    }

    // Cleanup
    newDecl = newDecl.replace(/;\s*;/g, ';').replace(/^;+|;+$/g, '').trim();
    return `${selector}{${newDecl}}`;
  });

  // Pattern 2: combined th,td rule like .matrix-table th, .matrix-table td { ... }
  // Split into separate rules for th and td
  const combinedRegex = /([^{};]*\bth\b[^{};]*),\s*([^{};]*\btd\b[^{};]*)\{([^{}]*)\}/gi;
  fixed = fixed.replace(combinedRegex, (match, thSelector, tdSelector, declarations) => {
    let thDecl = declarations;
    let tdDecl = declarations;

    // For td: remove nowrap/ellipsis/hidden, add break-word
    tdDecl = tdDecl.replace(/\s*white-space\s*:\s*nowrap\s*;?/gi, ';');
    tdDecl = tdDecl.replace(/\s*overflow\s*:\s*hidden\s*;?/gi, ';');
    tdDecl = tdDecl.replace(/\s*text-overflow\s*:\s*ellipsis\s*;?/gi, ';');
    if (!/overflow-wrap\s*:\s*break-word/.test(tdDecl)) {
      tdDecl = tdDecl.trim();
      if (tdDecl && !tdDecl.endsWith(';')) tdDecl += ';';
      tdDecl += ' overflow-wrap: break-word; word-wrap: break-word;';
    }
    tdDecl = tdDecl.replace(/;\s*;/g, ';').replace(/^;+|;+$/g, '').trim();

    // For th: keep as-is but cleanup
    thDecl = thDecl.replace(/;\s*;/g, ';').replace(/^;+|;+$/g, '').trim();

    changed = true;
    return `${thSelector}{${thDecl}}\n${tdSelector}{${tdDecl}}`;
  });

  // Also handle reverse order: td, th
  const combinedReverseRegex = /([^{};]*\btd\b[^{};]*),\s*([^{};]*\bth\b[^{};]*)\{([^{}]*)\}/gi;
  fixed = fixed.replace(combinedReverseRegex, (match, tdSelector, thSelector, declarations) => {
    let thDecl = declarations;
    let tdDecl = declarations;

    tdDecl = tdDecl.replace(/\s*white-space\s*:\s*nowrap\s*;?/gi, ';');
    tdDecl = tdDecl.replace(/\s*overflow\s*:\s*hidden\s*;?/gi, ';');
    tdDecl = tdDecl.replace(/\s*text-overflow\s*:\s*ellipsis\s*;?/gi, ';');
    if (!/overflow-wrap\s*:\s*break-word/.test(tdDecl)) {
      tdDecl = tdDecl.trim();
      if (tdDecl && !tdDecl.endsWith(';')) tdDecl += ';';
      tdDecl += ' overflow-wrap: break-word; word-wrap: break-word;';
    }
    tdDecl = tdDecl.replace(/;\s*;/g, ';').replace(/^;+|;+$/g, '').trim();
    thDecl = thDecl.replace(/;\s*;/g, ';').replace(/^;+|;+$/g, '').trim();

    changed = true;
    return `${tdSelector}{${tdDecl}}\n${thSelector}{${thDecl}}`;
  });

  return { content: fixed, changed };
}

// Inline td styles
const INLINE_TD_REGEX = /<td\s+style="([^"]*)"([^>]*)>/gi;

function fixInlineTd(content) {
  return content.replace(INLINE_TD_REGEX, (match, styleAttr, rest) => {
    let newStyle = styleAttr;
    let changed = false;

    if (/white-space\s*:\s*nowrap/.test(newStyle)) {
      newStyle = newStyle.replace(/\s*white-space\s*:\s*nowrap\s*;?/gi, ';');
      changed = true;
    }
    if (/overflow\s*:\s*hidden/.test(newStyle)) {
      newStyle = newStyle.replace(/\s*overflow\s*:\s*hidden\s*;?/gi, ';');
      changed = true;
    }
    if (/text-overflow\s*:\s*ellipsis/.test(newStyle)) {
      newStyle = newStyle.replace(/\s*text-overflow\s*:\s*ellipsis\s*;?/gi, ';');
      changed = true;
    }
    if (!/overflow-wrap\s*:\s*break-word/.test(newStyle)) {
      newStyle = newStyle.trim();
      if (newStyle && !newStyle.endsWith(';')) newStyle += ';';
      newStyle += 'overflow-wrap:break-word;word-wrap:break-word';
      changed = true;
    }

    if (!changed) return match;

    newStyle = newStyle.replace(/;\s*;/g, ';').replace(/^;+|;+$/g, '').trim();
    return `<td style="${newStyle}"${rest}>`;
  });
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let totalChanged = false;

  // Process style blocks
  const blocks = extractStyleBlocks(content);
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    const result = fixStyleBlock(block.inner);
    if (result.changed) {
      const newBlock = block.full.replace(block.inner, result.content);
      content = content.slice(0, block.start) + newBlock + content.slice(block.end);
      totalChanged = true;
    }
  }

  // Process inline td styles (apply to entire content, not just style blocks)
  const beforeInline = content;
  content = fixInlineTd(content);
  if (content !== beforeInline) totalChanged = true;

  if (totalChanged) {
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
