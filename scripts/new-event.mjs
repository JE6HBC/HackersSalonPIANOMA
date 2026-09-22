#!/usr/bin/env node
/**
 * 新しい開催回のディレクトリを data/events/_template/ から作る。
 *
 *   npm run new:event -- 2026-11-22
 *
 * 作られるのは雛形だけなので、title / summary / programs は手で埋めてから PR にすること。
 */
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const date = process.argv[2];

if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('使い方: npm run new:event -- YYYY-MM-DD');
  process.exit(1);
}

const template = join(ROOT, 'data/events/_template');
const target = join(ROOT, 'data/events', date);

if (existsSync(target)) {
  console.error(`すでに存在します: data/events/${date}`);
  process.exit(1);
}

cpSync(template, target, { recursive: true });

function replaceInTree(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      replaceInTree(path);
      continue;
    }
    writeFileSync(path, readFileSync(path, 'utf8').replaceAll('YYYY-MM-DD', date));
  }
}
replaceInTree(target);

// 通し番号（vol.N）は既存のディレクトリ数から推測しておく。合っていなければ手で直す。
const volume = readdirSync(join(ROOT, 'data/events')).filter((n) =>
  /^\d{4}-\d{2}-\d{2}$/.test(n),
).length;
const eventPath = join(target, 'event.json');
writeFileSync(eventPath, readFileSync(eventPath, 'utf8').replace('vol.N', `vol.${volume}`));

console.log(`✅ data/events/${date}/ を作成しました。`);
console.log('   次にやること:');
console.log(`     1. data/events/${date}/event.json の title / summary / programs を埋める`);
console.log('     2. npm run verify で検証');
console.log(`     3. ブランチ event/${date} を切って PR`);
