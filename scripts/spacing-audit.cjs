const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../src');

// Spacing-related CSS properties to audit
const SPACING_PROPS = [
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'gap', 'row-gap', 'column-gap',
];

// Build regex for each spacing property: match prop: <value>;
// Capture the entire declaration to check for px
function getSpacingPropRegex(prop) {
  // Match property name followed by colon, then any chars until semicolon or closing brace or !important
  return new RegExp(`\\b${prop}\\s*:\\s*([^;!}]+)([;!}])`, 'gi');
}

const VAR_REGEX = /var\(--space-/;

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
    styles.push(match[1]);
  }
  return styles;
}

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const styleBlocks = extractStyleBlocks(content);
  if (styleBlocks.length === 0) {
    return null;
  }

  const issues = [];
  let hasVarSpacing = false;

  for (const style of styleBlocks) {
    const lines = style.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) continue;

      for (const prop of SPACING_PROPS) {
        const regex = getSpacingPropRegex(prop);
        let match;
        while ((match = regex.exec(line)) !== null) {
          const declValue = match[1].trim();
          // Check if already using CSS variable (including fallback values)
          if (/var\(/.test(declValue)) {
            hasVarSpacing = true;
            continue;
          }
          // Check for px in this specific declaration only
          if (/\dpx\b/.test(declValue)) {
            issues.push({
              line: i + 1,
              prop,
              text: `${prop}: ${declValue}`,
              value: declValue,
            });
          }
        }
      }
    }
  }

  return {
    file: path.relative(path.resolve(__dirname, '..'), filePath).replace(/\\/g, '/'),
    issues,
    hasVarSpacing,
    styleBlockCount: styleBlocks.length,
  };
}

function main() {
  const vueFiles = findVueFiles(SRC_DIR);
  const results = [];
  let totalIssues = 0;
  let filesWithIssues = 0;
  let filesWithVarSpacing = 0;

  for (const file of vueFiles) {
    const result = auditFile(file);
    if (result) {
      results.push(result);
      if (result.issues.length > 0) {
        totalIssues += result.issues.length;
        filesWithIssues++;
      }
      if (result.hasVarSpacing) {
        filesWithVarSpacing++;
      }
    }
  }

  results.sort((a, b) => b.issues.length - a.issues.length);

  console.log('='.repeat(80));
  console.log('           间距标准化评估报告 (Spacing Audit Report)');
  console.log('='.repeat(80));
  console.log(`评估时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`评估范围: ${vueFiles.length} 个 Vue 文件`);
  console.log(`包含样式的文件: ${results.length} 个`);
  console.log(`使用 CSS 变量(--space-*)的文件: ${filesWithVarSpacing} 个`);
  console.log(`存在硬编码像素值的文件: ${filesWithIssues} 个`);
  console.log(`硬编码像素值总处数: ${totalIssues} 处`);
  console.log('='.repeat(80));

  console.log('\n【文件摘要】');
  console.log('-'.repeat(80));
  console.log(`${'文件路径'.padEnd(50)} ${'问题数'.padStart(6)} ${'使用变量'.padStart(8)}`);
  console.log('-'.repeat(80));
  for (const r of results) {
    const status = r.issues.length === 0 ? '通过' : '待修复';
    const shortPath = r.file.length > 50 ? '...' + r.file.slice(-47) : r.file;
    console.log(`${shortPath.padEnd(50)} ${String(r.issues.length).padStart(6)} ${(r.hasVarSpacing ? '是' : '否').padStart(8)}  [${status}]`);
  }
  console.log('-'.repeat(80));

  console.log('\n【详细问题列表 (Top 50)】');
  let issueCounter = 0;
  for (const r of results) {
    if (r.issues.length === 0) continue;
    console.log(`\n📄 ${r.file} (${r.issues.length} 处)`);
    for (const issue of r.issues.slice(0, 10)) {
      console.log(`   行 ${String(issue.line).padStart(4)}: ${issue.text}`);
      issueCounter++;
    }
    if (r.issues.length > 10) {
      console.log(`   ... 还有 ${r.issues.length - 10} 处未显示`);
    }
    if (issueCounter >= 50) break;
  }

  console.log('\n' + '='.repeat(80));
  console.log('【评估结论】');
  if (filesWithIssues === 0) {
    console.log('✅ 全部达标！所有功能页面的间距均已使用 CSS 变量标准化。');
  } else {
    console.log(`⚠️ 未全部达标。还有 ${filesWithIssues} 个文件存在 ${totalIssues} 处硬编码像素值。`);
    console.log('   建议将上述硬编码的 px 值替换为对应的 var(--space-*) 变量。');
    console.log('   对照表: 4px→--space-1, 8px→--space-2, 12px→--space-3, 16px→--space-4,');
    console.log('           20px→--space-5, 24px→--space-6, 32px→--space-8');
  }
  console.log('='.repeat(80));
}

main();
