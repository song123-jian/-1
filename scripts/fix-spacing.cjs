const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../src');

const SPACING_PROPS = [
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'gap', 'row-gap', 'column-gap',
];

// Standard spacing px -> CSS variable mapping
const PX_MAP = {
  '4px': 'var(--space-1)',
  '8px': 'var(--space-2)',
  '12px': 'var(--space-3)',
  '16px': 'var(--space-4)',
  '20px': 'var(--space-5)',
  '24px': 'var(--space-6)',
  '32px': 'var(--space-8)',
};

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

function fixSpacingInBlock(blockContent) {
  let fixed = blockContent;
  let changed = false;

  for (const prop of SPACING_PROPS) {
    // Match prop: value; or prop: value !important; or prop: value}
    const regex = new RegExp(`\\b(${prop}\\s*:\\s*)([^;!}]+)([;!}])`, 'gi');
    fixed = fixed.replace(regex, (match, prefix, value, suffix) => {
      let newValue = value;
      // Replace standard px values in this specific declaration
      for (const [px, varVal] of Object.entries(PX_MAP)) {
        // Use regex to match whole px values, avoid partial matches like 4px in 14px
        const pxRegex = new RegExp(`\\b${px}\\b`, 'g');
        if (pxRegex.test(newValue)) {
          newValue = newValue.replace(pxRegex, varVal);
        }
      }
      if (newValue !== value) {
        changed = true;
        return prefix + newValue + suffix;
      }
      return match;
    });
  }

  return { content: fixed, changed };
}

function fixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const blocks = extractStyleBlocks(content);
  if (blocks.length === 0) return false;

  let newContent = content;
  let totalChanged = false;

  // Process blocks in reverse order to preserve indices
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    const result = fixSpacingInBlock(block.inner);
    if (result.changed) {
      const newBlock = block.full.replace(block.inner, result.content);
      newContent = newContent.slice(0, block.start) + newBlock + newContent.slice(block.end);
      totalChanged = true;
    }
  }

  if (totalChanged) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
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
