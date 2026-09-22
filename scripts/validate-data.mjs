#!/usr/bin/env node
/**
 * data/ の整合性チェック（依存パッケージなし・Nodeだけで動く）。
 *
 * 役割分担:
 *   - 「1ファイル内の形が正しいか」は src/content.config.ts の Zod スキーマが `npm run build` で見る
 *   - 「ファイルをまたいだ参照が壊れていないか」と「個人情報が混ざっていないか」はこのスクリプトが見る
 *
 * CI（.github/workflows/ci.yml）から実行される。ローカルでは `npm run validate:data`。
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DATA = join(ROOT, 'data');

const errors = [];
const warnings = [];

const fail = (file, message) => errors.push({ file, message });
const warn = (file, message) => warnings.push({ file, message });

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(rel(path), `JSONとして読めません: ${error.message}`);
    return null;
  }
}

const rel = (path) => path.replace(ROOT, '').replace(/^\/+/, '');

function listDirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => !name.startsWith('_') && !name.startsWith('.'))
    .filter((name) => statSync(join(dir, name)).isDirectory());
}

function listFiles(dir, ext) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('_') || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full, ext));
    else if (name.endsWith(ext)) out.push(full);
  }
  return out;
}

/** 最低限のfront matter読み取り。想定しているのは文字列・真偽値・フラットな配列だけ。 */
function parseFrontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { data: null, raw: '' };

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    const value = rawValue.trim();
    if (value === 'true' || value === 'false') data[key] = value === 'true';
    else if (value.startsWith('[')) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    } else data[key] = value.replace(/^['"]|['"]$/g, '');
  }
  return { data, raw: match[1] };
}

/* -------------------------------------------------------------------------- */
/* 1. 個人情報の混入チェック                                                   */
/* -------------------------------------------------------------------------- */
/*
 * 公開リポジトリなので、連絡先が入った時点で事故。
 * Markdown本文は課題文に例としてメールアドレスが出ることがあるため、front matter だけ見る。
 */
const PII_PATTERNS = [
  { name: 'メールアドレス', re: /[\w.+-]+@[\w-]+\.[A-Za-z]{2,}/ },
  { name: '電話番号', re: /0\d{1,3}[-(\s]?\d{2,4}[-)\s]?\d{4}\b/ },
];

function checkPii(path, text) {
  for (const { name, re } of PII_PATTERNS) {
    const hit = text.match(re);
    if (hit) {
      fail(
        rel(path),
        `${name}らしき文字列 "${hit[0]}" が含まれています。data/ に連絡先を置かないでください（docs/policy/privacy.md）。`,
      );
    }
  }
}

/* -------------------------------------------------------------------------- */
/* 2. 収集                                                                     */
/* -------------------------------------------------------------------------- */

const eventsDir = join(DATA, 'events');
const eventIds = listDirs(eventsDir).sort();

const awardsPath = join(DATA, 'awards', 'awards.json');
const awardsFile = existsSync(awardsPath) ? readJson(awardsPath) : null;
const awardIds = new Set((awardsFile?.awards ?? []).map((a) => a.id));
if (awardsFile) checkPii(awardsPath, readFileSync(awardsPath, 'utf8'));

const challengeIds = new Set();
for (const path of listFiles(join(DATA, 'challenges'), '.md')) {
  const text = readFileSync(path, 'utf8');
  const { data, raw } = parseFrontMatter(text);
  if (!data) {
    fail(rel(path), 'front matter（--- で囲まれたメタ情報）がありません。');
    continue;
  }
  checkPii(path, raw);

  const stem = basename(path, '.md');
  if (data.id !== stem) {
    fail(rel(path), `front matter の id ("${data.id}") とファイル名 ("${stem}") が一致しません。`);
  }
  if (challengeIds.has(data.id)) fail(rel(path), `課題ID "${data.id}" が重複しています。`);
  challengeIds.add(data.id);

  if (!/^##\s*模範回答/m.test(text) && data.draft !== true) {
    warn(rel(path), '「## 模範回答」の節がありません。公開する課題には模範回答を付けてください。');
  }
  for (const usedIn of data.usedIn ?? []) {
    if (!eventIds.includes(usedIn)) {
      fail(rel(path), `usedIn の "${usedIn}" に対応するイベントが data/events/ にありません。`);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* 3. イベントごとの整合性                                                     */
/* -------------------------------------------------------------------------- */

for (const eventId of eventIds) {
  const dir = join(eventsDir, eventId);
  const read = (name) => {
    const path = join(dir, name);
    if (!existsSync(path)) return null;
    checkPii(path, readFileSync(path, 'utf8'));
    return readJson(path);
  };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventId)) {
    fail(`data/events/${eventId}`, 'イベントのディレクトリ名は YYYY-MM-DD にしてください。');
    continue;
  }

  const event = read('event.json');
  if (!event) {
    fail(`data/events/${eventId}`, 'event.json がありません。');
    continue;
  }
  if (event.id !== eventId) {
    fail(`data/events/${eventId}/event.json`, `id ("${event.id}") がディレクトリ名と違います。`);
  }
  if (event.date !== eventId) {
    fail(
      `data/events/${eventId}/event.json`,
      `date ("${event.date}") がディレクトリ名と違います。`,
    );
  }

  const programIds = new Set();
  for (const program of event.programs ?? []) {
    if (programIds.has(program.id)) {
      fail(
        `data/events/${eventId}/event.json`,
        `programs の id "${program.id}" が重複しています。`,
      );
    }
    programIds.add(program.id);
    if (program.endAt < program.startAt) {
      fail(
        `data/events/${eventId}/event.json`,
        `プログラム "${program.name}" の終了時刻が開始時刻より前です（日をまたぐ場合も 24:00 を超えない表記にしてください）。`,
      );
    }
  }

  const participantsFile = read('participants.json');
  const participants = participantsFile?.participants ?? [];
  const participantIds = new Set();
  for (const person of participants) {
    if (participantIds.has(person.id)) {
      fail(
        `data/events/${eventId}/participants.json`,
        `参加者ID "${person.id}" が重複しています。`,
      );
    }
    participantIds.add(person.id);
  }
  if (participantsFile && participantsFile.eventId !== eventId) {
    fail(`data/events/${eventId}/participants.json`, 'eventId がディレクトリ名と違います。');
  }
  if (event.capacity && participants.length > event.capacity) {
    warn(
      `data/events/${eventId}/participants.json`,
      `登録者数 ${participants.length} が定員 ${event.capacity} を超えています。`,
    );
  }

  const tablesFile = read('tables.json');
  const tableIds = new Set((tablesFile?.tables ?? []).map((t) => t.id));
  const tableSeats = new Map((tablesFile?.tables ?? []).map((t) => [t.id, t.seats]));

  const tournament = read('tournament.json');
  if (tournament) {
    if (tournament.eventId !== eventId) {
      fail(`data/events/${eventId}/tournament.json`, 'eventId がディレクトリ名と違います。');
    }
    const seen = new Set();
    for (const round of tournament.rounds ?? []) {
      if (seen.has(round.no)) {
        fail(
          `data/events/${eventId}/tournament.json`,
          `ラウンド番号 ${round.no} が重複しています。`,
        );
      }
      seen.add(round.no);
      if (round.challengeId && !challengeIds.has(round.challengeId)) {
        fail(
          `data/events/${eventId}/tournament.json`,
          `challengeId "${round.challengeId}" が data/challenges/ にありません。`,
        );
      }
    }

    const occupied = new Set();
    for (const entry of tournament.entries ?? []) {
      if (!participantIds.has(entry.participantId)) {
        fail(
          `data/events/${eventId}/tournament.json`,
          `entries の participantId "${entry.participantId}" が participants.json にありません。`,
        );
      }
      if (!tableIds.has(entry.tableId)) {
        fail(
          `data/events/${eventId}/tournament.json`,
          `entries の tableId "${entry.tableId}" が tables.json にありません。`,
        );
      }
      const seats = tableSeats.get(entry.tableId);
      if (seats && entry.seat > seats) {
        fail(
          `data/events/${eventId}/tournament.json`,
          `卓 "${entry.tableId}" は ${seats} 席ですが、${entry.seat} 番席が指定されています。`,
        );
      }
      const key = `${entry.tableId}#${entry.seat}`;
      if (occupied.has(key)) {
        fail(`data/events/${eventId}/tournament.json`, `席 ${key} が重複しています。`);
      }
      occupied.add(key);
    }
  }

  const resultsFile = read('results.json');
  if (resultsFile) {
    if (resultsFile.eventId !== eventId) {
      fail(`data/events/${eventId}/results.json`, 'eventId がディレクトリ名と違います。');
    }
    for (const result of resultsFile.results ?? []) {
      if (!awardIds.has(result.awardId)) {
        fail(
          `data/events/${eventId}/results.json`,
          `awardId "${result.awardId}" が data/awards/awards.json にありません。`,
        );
      }
      if (!participantIds.has(result.participantId)) {
        fail(
          `data/events/${eventId}/results.json`,
          `participantId "${result.participantId}" が participants.json にありません。受賞者は参加者として登録されている必要があります。`,
        );
      }
    }
  }

  const reportPath = join(dir, 'report.md');
  if (existsSync(reportPath)) {
    const { data, raw } = parseFrontMatter(readFileSync(reportPath, 'utf8'));
    checkPii(reportPath, raw);
    if (data && data.eventId !== eventId) {
      fail(
        `data/events/${eventId}/report.md`,
        'front matter の eventId がディレクトリ名と違います。',
      );
    }
  } else if (event.status === 'archived') {
    warn(`data/events/${eventId}`, '開催済みですが report.md がありません。');
  }
}

/* -------------------------------------------------------------------------- */
/* 4. 出力                                                                     */
/* -------------------------------------------------------------------------- */

for (const { file, message } of warnings) {
  console.warn(`⚠️  ${file}\n    ${message}`);
}
for (const { file, message } of errors) {
  console.error(`❌ ${file}\n    ${message}`);
}

const summary = `イベント ${eventIds.length}件 / 課題 ${challengeIds.size}件 / 賞 ${awardIds.size}件`;
if (errors.length > 0) {
  console.error(`\n${errors.length}件のエラーがあります（${summary}）。`);
  process.exit(1);
}
console.log(`✅ data/ の整合性チェックを通過しました（${summary}, 警告 ${warnings.length}件）。`);
