# data/ — このリポジトリの「データベース」

サーバも外部DBも使わず、**Gitリポジトリ内のファイルを唯一の正（single source of truth）** として扱います。
更新は必ず Pull Request 経由で行い、レビューされた変更だけが本番サイトに反映されます。

```
data/
├── events/               イベント1回 = 1ディレクトリ（ID は開催日 YYYY-MM-DD）
│   ├── _template/        新規イベントの雛形（npm run new:event でコピーされる）
│   └── 2026-10-22/
│       ├── event.json         開催情報・タイムテーブル・会場
│       ├── participants.json  参加者（表示名とハンドルのみ／個人情報は禁止）
│       ├── tables.json        フリーテーブル（常設卓）の定義と状態
│       ├── tournament.json    トーナメント進行（ラウンド・持ち時間）
│       ├── results.json       結果・受賞
│       └── report.md          開催レポート（イベント後に追記）
├── awards/
│   └── awards.json       賞の定義（殿堂/Hall of Fame は results.json から自動集計）
└── challenges/           AI例題（課題）と模範回答
    └── 2026/
        └── <slug>.md     front matter + 問題文 + 評価基準 + 模範回答
```

## 3つの鉄則

1. **個人情報を書かない。** このリポジトリは公開されています。本名・メールアドレス・電話番号・
   勤務先・SNSのDMリンクなどを `data/` に入れてはいけません。許可されるのは
   「表示名（ハンドル）」「GitHubアカウント名」「本人が公開を希望した所属」のみです。
   詳細は [docs/policy/privacy.md](../docs/policy/privacy.md)。
   CI（`npm run validate:data`）がメールアドレス・電話番号らしき文字列を検出して落とします。

2. **スキーマは `src/content.config.ts` が正。** JSONの項目を増やすときは、まず Zod スキーマを
   更新してください。スキーマに無い項目は `npm run build` で失敗します。
   人間向けの説明は [docs/data-model.md](../docs/data-model.md) にあります。

3. **IDは書き換えない。** `event.id` / `participant.id` / `award.id` / `challenge.id` は
   他ファイルから参照されます。一度マージされたIDの変更は破壊的変更として扱います。

## よくある更新の入口

| やりたいこと         | 方法                                                                          |
| :------------------- | :---------------------------------------------------------------------------- |
| 次回イベントを立てる | `npm run new:event -- 2026-11-22` → PR                                        |
| AI課題を投稿する     | `npm run new:challenge -- my-challenge` または Issue テンプレ「AI課題の投稿」 |
| 参加登録する         | Issue テンプレ「参加登録」／当日は会場の登録画面                              |
| 開催レポートを書く   | `data/events/<日付>/report.md` を編集 → PR                                    |
| 受賞結果を記録する   | `data/events/<日付>/results.json` を編集 → PR                                 |
