const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../src');

function findJsFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.includes('node_modules')) {
      findJsFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function addLogsToFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const storeName = path.basename(filePath, '.js');

  if (!content.includes('function initSeedData()')) {
    return false;
  }

  // Extract INIT_KEY value
  const initKeyMatch = content.match(/const INIT_KEY = ['"]([^'"]+)['"]/);
  const initKey = initKeyMatch ? initKeyMatch[1] : 'unknown';

  // Check if already has log to avoid duplication
  if (content.includes(`[${storeName}] initSeedData`)) {
    console.log(`  跳过(已有日志): ${path.relative(SRC_DIR, filePath).replace(/\\/g, '/')}`);
    return false;
  }

  // Pattern 1: function initSeedData() {\n  if (...) return
  const pattern1 = /function initSeedData\(\) \{(\s*)(if\s*\([^)]+\)\s*return)/;
  if (pattern1.test(content)) {
    content = content.replace(
      pattern1,
      `function initSeedData() {$1console.log('[${storeName}] initSeedData 开始, INIT_KEY=${initKey}')$1$2`
    );
  }

  // Add log before setting INIT_KEY
  // Match: localStorage.setItem(INIT_KEY, ...) or safeSetItem(INIT_KEY, ...)
  // that comes after initSeedData logic
  const setItemPattern = /(console\.log\('\[${storeName}\] initSeedData 开始[^']*'\)[\s\S]*?)(\s+)(safeSetItem|localStorage\.setItem)\(INIT_KEY/g;
  const hasStartLog = content.includes(`[${storeName}] initSeedData 开始`);

  if (hasStartLog) {
    // Add completion log before the setItem line
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('setItem(INIT_KEY') || line.includes('setItem(INIT_KEY')) {
        const indent = line.match(/^(\s*)/)[1];
        // Insert before this line
        lines.splice(i, 0, `${indent}console.log('[${storeName}] initSeedData 注入种子数据完成, 设置标志 ${initKey}')`);
        break;
      }
    }
    content = lines.join('\n');
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  return true;
}

function main() {
  const jsFiles = findJsFiles(SRC_DIR);
  let modifiedCount = 0;

  for (const file of jsFiles) {
    try {
      if (addLogsToFile(file)) {
        modifiedCount++;
        console.log(`已修改: ${path.relative(SRC_DIR, file).replace(/\\/g, '/')}`);
      }
    } catch (err) {
      console.error('Error processing', file, err.message);
    }
  }

  console.log(`\n共修改 ${modifiedCount} 个文件`);
}

main();
