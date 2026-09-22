const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

/** '2026-10-22' → '2026年10月22日(木)' */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}年${m}月${d}日(${weekday})`;
}

/** '2026-10-22' → '10/22' */
export function formatDateShort(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}`;
}

/** 300 → '5:00' */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

/** 300 → '5分' / 420 → '7分' */
export function formatMinutes(totalSeconds: number): string {
  return `${Math.round(totalSeconds / 60)}分`;
}

export const LEVEL_LABELS: Record<string, string> = {
  beginner: '初級',
  intermediate: '中級',
  advanced: '上級',
};

export const CATEGORY_LABELS: Record<string, string> = {
  'prompt-engineering': 'プロンプト',
  coding: 'コーディング',
  debugging: 'デバッグ',
  refactoring: 'リファクタリング',
  security: 'セキュリティ',
  data: 'データ',
  design: 'デザイン',
};

export const STATUS_LABELS: Record<string, string> = {
  draft: '準備中',
  upcoming: '開催予定',
  ongoing: '開催中',
  archived: '開催済み',
  cancelled: '中止',
};
