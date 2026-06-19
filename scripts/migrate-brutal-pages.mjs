import fs from 'fs';
import path from 'path';

const pagesDir = path.join(process.cwd(), 'pages');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

function depthFromRoot(filePath) {
  const rel = path.relative(pagesDir, filePath);
  return rel.split(path.sep).length - 1;
}

function ensureUiImport(content, filePath, needs) {
  const uiPath = depthFromRoot(filePath) >= 2 ? '../../components/ui' : '../components/ui';
  const importRe = new RegExp(`import \\{([^}]+)\\} from ['"]@?/?\\.\\.?/?components/ui['"];`);
  const match = content.match(importRe);
  if (match) {
    const existing = match[1].split(',').map((s) => s.trim());
    const merged = [...new Set([...existing, ...needs])];
    return content.replace(match[0], `import { ${merged.join(', ')} } from '${uiPath}';`);
  }
  const firstImport = content.match(/^import .+\n/m);
  const line = `import { ${needs.join(', ')} } from '${uiPath}';\n`;
  if (firstImport) {
    return content.replace(firstImport[0], firstImport[0] + line);
  }
  return line + content;
}

for (const file of walk(pagesDir)) {
  if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
  if (file.endsWith('.test.tsx')) continue;

  let content = fs.readFileSync(file, 'utf8');
  if (!/BrutalCard|BrutalButton/.test(content)) continue;

  const original = content;
  content = content.replace(/import \{ BrutalCard \} from ['"][^'"]+['"];\n?/g, '');
  content = content.replace(/import \{ BrutalButton \} from ['"][^'"]+['"];\n?/g, '');
  content = content.replace(/import \{ BrutalCard, BrutalButton \} from ['"][^'"]+['"];\n?/g, '');
  content = content.replace(/import \{ BrutalButton, BrutalCard \} from ['"][^'"]+['"];\n?/g, '');

  content = content.replace(/<BrutalCard accent>/g, '<Card variant="elevated">');
  content = content.replace(/<BrutalCard accent=\{true\}>/g, '<Card variant="elevated">');
  content = content.replace(/<BrutalCard\b/g, '<Card');
  content = content.replace(/<\/BrutalCard>/g, '</Card>');
  content = content.replace(/<BrutalButton\b/g, '<Button');
  content = content.replace(/<\/BrutalButton>/g, '</Button>');
  content = content.replace(/<Card accent>/g, '<Card variant="elevated">');
  content = content.replace(/<Card accent=\{true\}>/g, '<Card variant="elevated">');

  const needs = [];
  if (/<Card\b/.test(content)) needs.push('Card');
  if (/<Button\b/.test(content)) needs.push('Button');
  if (needs.length) content = ensureUiImport(content, file, needs);

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated:', path.relative(process.cwd(), file));
  }
}
