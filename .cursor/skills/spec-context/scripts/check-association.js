#!/usr/bin/env node

/**
 * CI script: checks if PR changed files are associated with any spec.
 * Matches via related_files (glob) and keywords (PR title/commit messages).
 *
 * Usage: node check-association.js [--pr-title "title"] [--commit-messages "msg1" "msg2"]
 * Changed files are read from stdin (one per line) or from git diff.
 *
 * Exit codes: 0 always (info/warning only, never blocks PR).
 * No third-party dependencies — Node.js >= 18.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const INDEX_PATH = path.resolve(process.cwd(), 'specs', 'index.json');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { prTitle: '', commitMessages: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--pr-title' && args[i + 1]) {
      result.prTitle = args[++i];
    } else if (args[i] === '--commit-messages') {
      while (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        result.commitMessages.push(args[++i]);
      }
    }
  }
  return result;
}

function getChangedFiles() {
  try {
    const base = execSync('git merge-base HEAD origin/main', { encoding: 'utf-8' }).trim();
    return execSync(`git diff --name-only ${base}..HEAD`, { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    console.warn('[check-association] Could not determine changed files from git');
    return [];
  }
}

function globToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}`);
}

function matchesFiles(relatedFiles, changedFiles) {
  if (!Array.isArray(relatedFiles)) return false;
  return relatedFiles.some(pattern => {
    const regex = globToRegex(pattern);
    return changedFiles.some(f => regex.test(f));
  });
}

function matchesKeywords(keywords, texts) {
  if (!Array.isArray(keywords)) return false;
  const combined = texts.join(' ').toLowerCase();
  return keywords.some(kw => combined.includes(kw.toLowerCase()));
}

function main() {
  if (!fs.existsSync(INDEX_PATH)) {
    console.log('[check-association] No specs/index.json found. Skipping.');
    return;
  }

  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
  if (!Array.isArray(index) || index.length === 0) {
    console.log('[check-association] No active specs. Skipping.');
    return;
  }

  const { prTitle, commitMessages } = parseArgs();
  const changedFiles = getChangedFiles();
  if (changedFiles.length === 0) {
    console.log('[check-association] No changed files detected.');
    return;
  }

  const specsDir = path.resolve(process.cwd(), 'specs', 'active');
  const matches = [];

  for (const spec of index) {
    let specFm = spec;
    if (spec.path) {
      try {
        const content = fs.readFileSync(path.resolve(process.cwd(), spec.path), 'utf-8');
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (fmMatch) {
          const lines = fmMatch[1].split('\n');
          for (const line of lines) {
            const ci = line.indexOf(':');
            if (ci === -1) continue;
            const key = line.slice(0, ci).trim();
            let val = line.slice(ci + 1).trim();
            if (val.startsWith('[') && val.endsWith(']')) {
              val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
            }
            specFm[key] = val;
          }
        }
      } catch {}
    }

    const fileMatch = matchesFiles(specFm.related_files, changedFiles);
    const kwMatch = matchesKeywords(specFm.keywords, [prTitle, ...commitMessages]);

    if (fileMatch || kwMatch) {
      matches.push({
        id: spec.id,
        title: spec.title,
        status: spec.status,
        matchType: [fileMatch && 'files', kwMatch && 'keywords'].filter(Boolean).join(', '),
      });
    }
  }

  if (matches.length === 0) {
    console.log('[info] 未找到关联 spec。');
    return;
  }

  for (const m of matches) {
    const level = m.status === 'active' ? 'warning' : 'info';
    const statusMsg = m.status === 'active'
      ? '仍在开发中，请确认是否需要更新'
      : '已完成开发，等待验收';
    console.log(`[${level}] 关联 spec ${m.id}（${m.title}）${statusMsg}。匹配：${m.matchType}`);
  }
}

main();
