#!/usr/bin/env node
/**
 * AI課題の雛形を data/challenges/_template.md から作る。
 *
 *   npm run new:challenge -- csv-to-markdown
 *
 * IDは YYYY-NNN-slug の形で自動採番される（NNN はその年の連番）。
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const slug = process.argv[2];

if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('使い方: npm run new:challenge -- my-challenge-slug');
  console.error('  slug は英小文字・数字・ハイフンのみ。');
  process.exit(1);
}

const now = new Date();
const year = String(now.getFullYear());
const today = now.toISOString().slice(0, 10);
const dir = join(ROOT, 'data/challenges', year);
mkdirSync(dir, { recursive: true });

const used = readdirSync(dir)
  .filter((name) => name.endsWith('.md'))
  .map((name) => Number(name.split('-')[1]))
  .filter((n) => Number.isFinite(n));
const nextNumber = String(Math.max(0, ...used) + 1).padStart(3, '0');

const id = `${year}-${nextNumber}-${slug}`;
const target = join(dir, `${id}.md`);

if (existsSync(target)) {
  console.error(`すでに存在します: ${target}`);
  process.exit(1);
}

const body = readFileSync(join(ROOT, 'data/challenges/_template.md'), 'utf8')
  .replace("id: 'YYYY-NNN-short-slug'", `id: '${id}'`)
  .replace("createdAt: 'YYYY-MM-DD'", `createdAt: '${today}'`);

writeFileSync(target, body);

console.log(`✅ data/challenges/${year}/${id}.md を作成しました。`);
console.log('   次にやること:');
console.log('     1. 問題文・入力例・期待される出力・模範回答を埋める');
console.log('     2. 公開してよくなったら front matter の draft を false にする');
console.log('     3. npm run verify で検証してから PR');
