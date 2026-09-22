#!/usr/bin/env node
/**
 * 参加登録Issue（Issue Form）の本文を participants.json に取り込む。
 * .github/workflows/registration-sync.yml から呼ばれる。
 *
 * 入力は環境変数で受け取る（コマンドラインに埋め込むとシェルインジェクションの入口になるため）:
 *   ISSUE_BODY   … Issue本文
 *   ISSUE_AUTHOR … Issueを立てた人のGitHubログイン名
 *   ISSUE_NUMBER … Issue番号
 *
 * 出力: GITHUB_OUTPUT に event_id / display_name / status を書く。
 *
 * 【重要】Issue本文は誰でも書ける外部入力。ここで通すのは
 *   - 表示名: 制御文字を除いた40文字まで
 *   - GitHubハンドル: [A-Za-z0-9-] のみ
 *   - 興味: カンマ区切りを最大5個、各20文字まで
 * だけ。それ以外のフィールドは無視する。メールアドレス等が書かれていても保存しない。
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

const body = process.env.ISSUE_BODY ?? '';
const author = (process.env.ISSUE_AUTHOR ?? '').trim();
const issueNumber = process.env.ISSUE_NUMBER ?? '';

/**
 * Issue Form の本文を "### 見出し" ごとのセクションに割る。
 * 見出し文言は後から変わりうるので、参照側は前方一致で引く。
 */
function parseSections(text) {
  const sections = new Map();
  let heading = null;
  let buffer = [];

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^###\s+(.*?)\s*$/);
    if (match) {
      if (heading !== null) sections.set(heading, buffer.join('\n').trim());
      heading = match[1];
      buffer = [];
    } else if (heading !== null) {
      buffer.push(line);
    }
  }
  if (heading !== null) sections.set(heading, buffer.join('\n').trim());
  return sections;
}

const sections = parseSections(body);

/** 見出しの前方一致でセクション本文を取り出す。未入力なら空文字。 */
function field(label) {
  for (const [heading, value] of sections) {
    if (heading.startsWith(label)) return value === '_No response_' ? '' : value;
  }
  return '';
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function checked(label, option) {
  return new RegExp(`- \\[[xX]\\] ${escapeRegExp(option)}`).test(field(label));
}

/** 制御文字・改行・前後空白を落として長さを切る。 */
function clean(text, maxLength) {
  return [...text.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()].slice(0, maxLength).join('');
}

function output(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${String(value).replace(/\n/g, ' ')}\n`);
  }
}

function abort(reason) {
  console.error(`取り込みを中止しました: ${reason}`);
  output('status', 'skipped');
  output('reason', reason);
  process.exit(0); // ワークフロー自体は失敗させない（Issueにコメントして終わる）
}

/* ---- 入力の取り出しと検証 ------------------------------------------------ */

const eventId = clean(field('参加する回'), 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(eventId)) {
  abort('「参加する回」が YYYY-MM-DD 形式ではありません。');
}

const eventDir = join(ROOT, 'data/events', eventId);
if (!existsSync(join(eventDir, 'event.json'))) {
  abort(`data/events/${eventId}/ が見つかりません。開催回のIDを確認してください。`);
}

const event = JSON.parse(readFileSync(join(eventDir, 'event.json'), 'utf8'));
if (event.status !== 'upcoming' && event.status !== 'ongoing') {
  abort(`${eventId} は現在「${event.status}」なので登録を受け付けていません。`);
}

if (!checked('確認', '表示名がこの公開リポジトリに記録されることに同意します')) {
  abort('公開への同意にチェックが入っていません。');
}

const displayName = clean(field('表示名'), 40);
if (!displayName) abort('「表示名」が空です。');

const githubHandle = /^[A-Za-z0-9-]{1,39}$/.test(author) ? author : '';

const interests = field('興味のある分野')
  .split(/[,、]/)
  .map((s) => clean(s, 20))
  .filter(Boolean)
  .slice(0, 5);

const wantsLT = checked('ライトニングトーク', 'LTで話したい');

/* ---- participants.json への追記 ------------------------------------------ */

const participantsPath = join(eventDir, 'participants.json');
const file = existsSync(participantsPath)
  ? JSON.parse(readFileSync(participantsPath, 'utf8'))
  : { eventId, participants: [] };

if (githubHandle && file.participants.some((p) => p.github === githubHandle)) {
  abort(`@${githubHandle} はすでに ${eventId} に登録済みです。`);
}

if (file.participants.length >= (event.capacity ?? Infinity)) {
  abort(`${eventId} は定員 ${event.capacity} 名に達しています。`);
}

const nextIndex = file.participants.length + 1;
file.participants.push({
  id: `p-${eventId}-${String(nextIndex).padStart(3, '0')}`,
  displayName,
  github: githubHandle,
  role: 'guest',
  joinedVia: 'online',
  status: 'registered',
  interests,
  wantsLT,
  note: issueNumber ? `#${issueNumber}` : undefined,
});

writeFileSync(participantsPath, `${JSON.stringify(file, null, 2)}\n`);

console.log(
  `✅ ${eventId} に「${displayName}」を追加しました（計 ${file.participants.length}名）。`,
);
output('status', 'added');
output('event_id', eventId);
output('display_name', displayName);
output('count', String(file.participants.length));
