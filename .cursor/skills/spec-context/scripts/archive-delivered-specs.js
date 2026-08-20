#!/usr/bin/env node

/**
 * Archives accepted (>14 days) and cancelled (>7 days) specs.
 * Transaction-safe: copy → generate summary → confirm → delete original.
 *
 * No third-party dependencies — Node.js >= 18.
 */

const fs = require('fs');
const path = require('path');

const ACTIVE_DIR = path.resolve(process.cwd(), 'specs', 'active');
const ARCHIVE_DIR = path.resolve(process.cwd(), 'specs', 'archive');
const SUMMARIES_DIR = path.resolve(process.cwd(), 'specs', 'summaries');

const ACCEPTED_THRESHOLD_DAYS = 14;
const CANCELLED_THRESHOLD_DAYS = 7;

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const fm = {};
  const lines = match[1].split('\n');
  let currentKey = null;
  let currentArray = null;

  for (const line of lines) {
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
    if (value.startsWith('[') && value.endsWith(']')) {
      fm[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else if (value === '' || value === '[]') {
      currentKey = key;
      currentArray = [];
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

function daysSince(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return Infinity;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
}

function extractSection(content, heading) {
  const regex = new RegExp(`^## ${heading}[\\s\\S]*?(?=\\n## |$)`, 'm');
  const match = content.match(regex);
  return match ? match[0].trim() : '';
}

function generateSummary(fm, content) {
  const today = new Date().toISOString().slice(0, 10);
  const statusField = fm.status === 'cancelled'
    ? `cancelled_date: ${fm.updated || today}`
    : `accepted_date: ${fm.updated || today}`;

  const acceptanceCriteria = extractSection(content, '验收标准');
  const coreRequirements = extractSection(content, '核心需求点');
  const coreOneLine = coreRequirements
    .split('\n')
    .filter(l => l.startsWith('- '))
    .map(l => l.replace(/^- \[.\] /, '').trim())
    .join('、');

  return `---
id: ${fm.id}
title: ${fm.title || ''}
summary: ${fm.summary || ''}
keywords: ${JSON.stringify(Array.isArray(fm.keywords) ? fm.keywords : [])}
related_files: ${JSON.stringify(Array.isArray(fm.related_files) ? fm.related_files : [])}
status: archived
${statusField}
archived_date: ${today}
---

${acceptanceCriteria || '## 验收标准\n\n（无）'}

## 核心需求点（缩减为一行列表）

- ${coreOneLine || '（无）'}
`;
}

function main() {
  const specFiles = collectSpecFiles(ACTIVE_DIR);
  let archived = 0;
  let failed = 0;

  for (const filePath of specFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fm = parseFrontmatter(content);
    if (!fm || !fm.id) continue;

    const shouldArchive =
      (fm.status === 'accepted' && daysSince(fm.updated) > ACCEPTED_THRESHOLD_DAYS) ||
      (fm.status === 'cancelled' && daysSince(fm.updated) > CANCELLED_THRESHOLD_DAYS);

    if (!shouldArchive) continue;

    const today = new Date().toISOString().slice(0, 10);
    const yearMonth = today.slice(0, 7);
    const archiveSubdir = path.join(ARCHIVE_DIR, yearMonth);
    const archivePath = path.join(archiveSubdir, path.basename(filePath));
    const summaryPath = path.join(SUMMARIES_DIR, `${fm.id}.summary.md`);

    try {
      fs.mkdirSync(archiveSubdir, { recursive: true });
      fs.mkdirSync(SUMMARIES_DIR, { recursive: true });

      fs.copyFileSync(filePath, archivePath);

      if (!fs.existsSync(archivePath) || fs.readFileSync(archivePath, 'utf-8') !== content) {
        throw new Error('Archive copy verification failed');
      }

      const summary = generateSummary(fm, content);
      fs.writeFileSync(summaryPath, summary, 'utf-8');

      fs.unlinkSync(filePath);
      archived++;
      console.log(`Archived: ${fm.id} (${fm.status})`);
    } catch (err) {
      console.error(`[archive] Failed to archive ${fm.id}: ${err.message}`);
      if (fs.existsSync(archivePath) && fs.existsSync(filePath)) {
        try { fs.unlinkSync(archivePath); } catch {}
      }
      if (fs.existsSync(summaryPath)) {
        try { fs.unlinkSync(summaryPath); } catch {}
      }
      failed++;
    }
  }

  cleanOldArchives();

  console.log(`Archive complete: ${archived} archived, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

const RETENTION_MONTHS = 6;

function cleanOldArchives() {
  if (!fs.existsSync(ARCHIVE_DIR)) return;

  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - RETENTION_MONTHS, 1);
  const cutoffYM = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}`;

  const dirs = fs.readdirSync(ARCHIVE_DIR, { withFileTypes: true });
  for (const dir of dirs) {
    if (!dir.isDirectory() || !/^\d{4}-\d{2}$/.test(dir.name)) continue;
    if (dir.name >= cutoffYM) continue;

    const dirPath = path.join(ARCHIVE_DIR, dir.name);
    const files = fs.readdirSync(dirPath);
    let deleted = 0;
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(dirPath, file));
        deleted++;
      } catch {}
    }
    try {
      fs.rmdirSync(dirPath);
    } catch {}
    if (deleted > 0) {
      console.log(`Cleaned archive/${dir.name}: ${deleted} file(s) removed (summaries retained)`);
    }
  }
}

main();
