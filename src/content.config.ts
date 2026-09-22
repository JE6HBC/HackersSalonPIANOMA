import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';

/**
 * ============================================================================
 *  データスキーマ = このリポジトリの唯一の正（single source of truth）
 * ============================================================================
 *  data/ 配下のファイルはすべてここで検証される。スキーマに合わないデータがあると
 *  `npm run build` が失敗するので、壊れたデータが本番に出ることはない。
 *
 *  項目を増やす/変えるときの手順:
 *    1. このファイルの Zod スキーマを更新する
 *    2. data/events/_template/ など雛形にも同じ項目を追加する
 *    3. docs/data-model.md の人間向け説明を更新する
 *    4. 既存データを全部そろえてから PR にする（`npm run verify` が通ること）
 *
 *  後方互換のために、新しい項目はできるだけ `.optional()` か `.default()` を付ける。
 *  必須項目の追加は破壊的変更なので、PR に移行手順を書くこと。
 * ============================================================================
 */

/** 'YYYY-MM-DD' */
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 形式で書いてください');
/** 'HH:MM'（24時間表記。深夜は 25:00 ではなく 01:00 と書く） */
const timeString = z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM 形式で書いてください');

/** 公開リポジトリなので、人物を指すのは「表示名」と「GitHubハンドル」だけに限定する。 */
const handle = z.string().max(40);

const eventStatus = z.enum(['draft', 'upcoming', 'ongoing', 'archived', 'cancelled']);

const events = defineCollection({
  loader: glob({
    pattern: ['*/event.json', '!_*/**'],
    base: './data/events',
    generateId: ({ entry }) => entry.split('/')[0]!,
  }),
  schema: z.object({
    id: dateString,
    title: z.string().min(1),
    status: eventStatus,
    date: dateString,
    doorsOpenAt: timeString,
    startAt: timeString,
    endAt: timeString,
    venue: z.object({
      name: z.string(),
      nearestStation: z.string().optional(),
      mapUrl: z.string().url().optional(),
    }),
    capacity: z.number().int().positive(),
    fee: z
      .object({
        amount: z.number().int().nonnegative(),
        currency: z.string().default('JPY'),
        note: z.string().optional(),
      })
      .optional(),
    summary: z.string().default(''),
    registrationUrl: z.string().optional(),
    programs: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          startAt: timeString,
          endAt: timeString,
          owner: handle.optional().default(''),
          description: z.string().optional().default(''),
        }),
      )
      .default([]),
    tags: z.array(z.string()).default([]),
    links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
  }),
});

const participants = defineCollection({
  loader: glob({
    pattern: ['*/participants.json', '!_*/**'],
    base: './data/events',
    generateId: ({ entry }) => entry.split('/')[0]!,
  }),
  schema: z.object({
    eventId: dateString,
    participants: z
      .array(
        z.object({
          id: z.string().min(1),
          /** ハンドル/ニックネーム。本名は書かない（docs/policy/privacy.md） */
          displayName: z.string().min(1).max(40),
          github: handle.optional().default(''),
          role: z.enum(['guest', 'staff', 'mentor', 'speaker']).default('guest'),
          joinedVia: z.enum(['online', 'walk-in', 'invited']).default('online'),
          status: z
            .enum(['registered', 'checked-in', 'cancelled', 'no-show'])
            .default('registered'),
          interests: z.array(z.string()).default([]),
          wantsLT: z.boolean().default(false),
          note: z.string().max(200).optional(),
        }),
      )
      .default([]),
  }),
});

const tables = defineCollection({
  loader: glob({
    pattern: ['*/tables.json', '!_*/**'],
    base: './data/events',
    generateId: ({ entry }) => entry.split('/')[0]!,
  }),
  schema: z.object({
    eventId: dateString,
    tables: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          /** free = 出入り自由の常設卓 / tournament = トーナメント用の卓 */
          kind: z.enum(['free', 'tournament']).default('free'),
          seats: z.number().int().positive(),
          hosts: z.array(handle).default([]),
          description: z.string().default(''),
        }),
      )
      .default([]),
  }),
});

const tournaments = defineCollection({
  loader: glob({
    pattern: ['*/tournament.json', '!_*/**'],
    base: './data/events',
    generateId: ({ entry }) => entry.split('/')[0]!,
  }),
  schema: z.object({
    eventId: dateString,
    name: z.string().min(1),
    format: z.enum(['speed-coding', 'hack-battle', 'quiz', 'other']).default('speed-coding'),
    status: z
      .enum(['scheduled', 'running', 'paused', 'finished', 'cancelled'])
      .default('scheduled'),
    defaultRoundSec: z.number().int().positive().default(300),
    defaultBreakSec: z.number().int().nonnegative().default(120),
    rounds: z
      .array(
        z.object({
          no: z.number().int().positive(),
          name: z.string().min(1),
          durationSec: z.number().int().positive(),
          breakAfterSec: z.number().int().nonnegative().default(0),
          /** data/challenges/ の課題ID。空なら当日その場でお題を決める。 */
          challengeId: z.string().default(''),
        }),
      )
      .default([]),
    entries: z
      .array(
        z.object({
          participantId: z.string().min(1),
          tableId: z.string().min(1),
          seat: z.number().int().positive(),
        }),
      )
      .default([]),
  }),
});

const results = defineCollection({
  loader: glob({
    pattern: ['*/results.json', '!_*/**'],
    base: './data/events',
    generateId: ({ entry }) => entry.split('/')[0]!,
  }),
  schema: z.object({
    eventId: dateString,
    results: z
      .array(
        z.object({
          awardId: z.string().min(1),
          participantId: z.string().min(1),
          rank: z.number().int().positive().default(1),
          note: z.string().max(200).default(''),
        }),
      )
      .default([]),
  }),
});

const reports = defineCollection({
  loader: glob({
    pattern: ['*/report.md', '!_*/**'],
    base: './data/events',
    generateId: ({ entry }) => entry.split('/')[0]!,
  }),
  schema: z.object({
    eventId: dateString,
    title: z.string().min(1),
    author: handle.optional().default(''),
    publishedAt: dateString,
  }),
});

const awards = defineCollection({
  loader: file('data/awards/awards.json', {
    parser: (text) => JSON.parse(text).awards,
  }),
  schema: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    emoji: z.string().default('🏅'),
    description: z.string().default(''),
    category: z.enum(['tournament', 'talk', 'hack', 'community']).default('community'),
  }),
});

const challenges = defineCollection({
  loader: glob({
    pattern: ['**/*.md', '!**/_*.md', '!_*.md'],
    base: './data/challenges',
    generateId: ({ entry }) => entry.replace(/^.*\//, '').replace(/\.md$/, ''),
  }),
  schema: z.object({
    id: z
      .string()
      .regex(/^\d{4}-\d{3}-[a-z0-9-]+$/, 'YYYY-NNN-slug 形式（例: 2026-001-csv-to-markdown）'),
    title: z.string().min(1).max(60),
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    category: z.enum([
      'prompt-engineering',
      'coding',
      'debugging',
      'refactoring',
      'security',
      'data',
      'design',
    ]),
    timeLimitSec: z.number().int().positive(),
    tags: z.array(z.string()).default([]),
    author: handle.optional().default(''),
    createdAt: dateString,
    /** この課題を使った開催回のID（`data/events/<id>/`） */
    usedIn: z.array(dateString).default([]),
    license: z.string().default('CC-BY-4.0'),
    /** true の間はサイトに公開されない。お題を伏せておきたい期間はこれを使う。 */
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  events,
  participants,
  tables,
  tournaments,
  results,
  reports,
  awards,
  challenges,
};
