#!/usr/bin/env node

/**
 * Scans specs/active/ for spec files, extracts frontmatter,
 * and generates specs/index.json with active/dev-complete entries.
 *
 * Idempotent. On failure, preserves existing index.json.
 * No third-party dependencies — Node.js >= 18.
 */

const fs = require('fs');
const path = require('path');

const SPECS_DIR = path.resolve(process.cwd(), 'specs', 'active');
const INDEX_PATH = path.resolve(process.cwd(), 'specs', 'index.json');
const INCLUDED_STATUSES = new Set(['active', 'dev-complete']);

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const fm = {};
  const lines = match[1].split('\n');
  let currentKey = null;
  let currentArray = null;

  for (const line of lines) {
    // YAML multiline array item: "  - value"
    if (currentKey && currentArray !== null && /^\s+-\s+/.test(line)) {
      currentArray.push(line.replace(/^\s+-\s+/, '').trim().replace(/^["']|["']$/g, ''));
      continue;
    }

    if (currentKey && currentArray !== null) {
      fm[currentKey] = currentArray;
      currentKey = null;
      currentArray = null;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();

    // Inline array: [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      fm[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else if (value === '' || value === '[]') {
      // Could be start of multiline array, or empty value
      currentKey = key;
      currentArray = [];
    } else if (value === 'true') {
      fm[key] = true;
    } else if (value === 'false') {
      fm[key] = false;
    } else if (/^\d+$/.test(value)) {
      fm[key] = parseInt(value, 10);
    } else {
      fm[key] = value.replace(/^["']|["']$/g, '');
    }
  }

  if (currentKey && currentArray !== null) {
    fm[currentKey] = currentArray;
  }

  return fm;
}

function collectSpecFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSpecFiles(fullPath));
    } else if (entry.name.endsWith('.md') && entry.name !== '_template.md') {
      results.push(fullPath);
    }
  }
  return results;
}

function main() {
  try {
    const specFiles = collectSpecFiles(SPECS_DIR);
    const index = [];

    for (const filePath of specFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fm = parseFrontmatter(content);
      if (!fm || !fm.id || !INCLUDED_STATUSES.has(fm.status)) continue;

      index.push({
        id: fm.id,
        title: fm.title || '',
        summary: fm.summary || '',
        keywords: Array.isArray(fm.keywords) ? fm.keywords : [],
        path: path.relative(process.cwd(), filePath),
        status: fm.status,
        progress: typeof fm.progress === 'number' ? fm.progress : 0,
      });
    }

    const specsDir = path.dirname(INDEX_PATH);
    if (!fs.existsSync(specsDir)) {
      fs.mkdirSync(specsDir, { recursive: true });
    }

    fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + '\n', 'utf-8');
    console.log(`index.json updated: ${index.length} spec(s)`);
  } catch (err) {
    console.error(`[spec-index] Failed to generate index: ${err.message}`);
    process.exitCode = 1;
  }
}

main();
