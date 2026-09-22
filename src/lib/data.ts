import { getCollection } from 'astro:content';

/**
 * コレクションの読み出しはこのファイルに集約する。
 * ページ側で getCollection() を直接呼ぶと、draft の除外漏れや並び順の不統一が起きるため。
 *
 * 「無いのが正常」なファイル（未開催回の report.md など）を取りに行くので、
 * getEntry() ではなく getCollection().find() を使う。getEntry() は見つからないと
 * ビルドログに警告を出すため、正常系のノイズになる。
 */

async function findById<
  C extends
    'events' | 'participants' | 'tables' | 'tournaments' | 'results' | 'reports' | 'challenges',
>(collection: C, id: string) {
  const all = await getCollection(collection);
  return all.find((entry) => entry.id === id) ?? null;
}

/** 公開対象のイベント（draft を除く）を開催日の新しい順に返す。 */
export async function getPublishedEvents() {
  const events = await getCollection('events', ({ data }) => data.status !== 'draft');
  return events.sort((a, b) => b.data.date.localeCompare(a.data.date));
}

/** 次回開催（upcoming / ongoing のうち最も近い日）。無ければ null。 */
export async function getNextEvent() {
  const events = await getPublishedEvents();
  const upcoming = events
    .filter((e) => e.data.status === 'upcoming' || e.data.status === 'ongoing')
    .sort((a, b) => a.data.date.localeCompare(b.data.date));
  return upcoming[0] ?? null;
}

/** 開催済みイベントを新しい順に。 */
export async function getPastEvents() {
  const events = await getPublishedEvents();
  return events.filter((e) => e.data.status === 'archived');
}

/** イベント1回分の関連データをまとめて取得する。ファイルが無い項目は空配列 / null。 */
export async function getEventBundle(eventId: string) {
  const [event, participants, tables, tournament, results, report] = await Promise.all([
    findById('events', eventId),
    findById('participants', eventId),
    findById('tables', eventId),
    findById('tournaments', eventId),
    findById('results', eventId),
    findById('reports', eventId),
  ]);

  return {
    event,
    participants: participants?.data.participants ?? [],
    tables: tables?.data.tables ?? [],
    tournament: tournament?.data ?? null,
    results: results?.data.results ?? [],
    report,
  };
}

/** 公開対象の課題（draft を除く）を新しい順に。 */
export async function getPublishedChallenges() {
  const challenges = await getCollection('challenges', ({ data }) => !data.draft);
  return challenges.sort((a, b) => b.data.id.localeCompare(a.data.id));
}

/** 課題IDから課題を引くための Map。存在しないIDは単に含まれない。 */
export async function getChallengeIndex() {
  const challenges = await getCollection('challenges');
  return new Map(challenges.map((c) => [c.id, c] as const));
}

export type HallOfFameRow = {
  displayName: string;
  github: string;
  awards: { awardId: string; eventId: string; note: string; rank: number }[];
};

/**
 * 全イベントの results.json を集計して受賞歴の殿堂を作る。
 * 受賞者名は各イベントの participants.json から引くので、参加者が見つからない受賞行は落とす
 * （その不整合は `npm run validate:data` が検出してCIを落とす）。
 */
export async function getHallOfFame(): Promise<HallOfFameRow[]> {
  const events = await getPublishedEvents();
  const [allResults, allParticipants] = await Promise.all([
    getCollection('results'),
    getCollection('participants'),
  ]);
  const resultsById = new Map(allResults.map((r) => [r.id, r] as const));
  const participantsById = new Map(allParticipants.map((p) => [p.id, p] as const));
  const byPerson = new Map<string, HallOfFameRow>();

  for (const event of events) {
    const resultEntry = resultsById.get(event.id);
    if (!resultEntry) continue;

    const people = new Map(
      (participantsById.get(event.id)?.data.participants ?? []).map((p) => [p.id, p] as const),
    );

    for (const result of resultEntry.data.results) {
      const person = people.get(result.participantId);
      if (!person) continue;

      const key = person.github || person.displayName;
      const row = byPerson.get(key) ?? {
        displayName: person.displayName,
        github: person.github,
        awards: [],
      };
      row.awards.push({
        awardId: result.awardId,
        eventId: event.id,
        note: result.note,
        rank: result.rank,
      });
      byPerson.set(key, row);
    }
  }

  return [...byPerson.values()].sort((a, b) => b.awards.length - a.awards.length);
}
