# データモデル

`data/` に置くファイルの項目表です。**スキーマの実体は [`src/content.config.ts`](../src/content.config.ts)**、
この文書はその人間向けの説明です。片方だけ変えないでください。

凡例: **必須** / 任意 / _自動補完（省略時のデフォルトあり）_

---

## events — 開催回

`data/events/<YYYY-MM-DD>/event.json`

ディレクトリ名がそのまま開催回のIDです。`id` と `date` も同じ値にします（CIがチェックします）。

| 項目                                       | 型                                                          | 必須 | 説明                                        |
| :----------------------------------------- | :---------------------------------------------------------- | :--: | :------------------------------------------ |
| `id`                                       | `YYYY-MM-DD`                                                |  ●   | ディレクトリ名と一致すること                |
| `title`                                    | string                                                      |  ●   | `Hacker's salon @ PIANOMA vol.7` など       |
| `status`                                   | `draft` / `upcoming` / `ongoing` / `archived` / `cancelled` |  ●   | `draft` はサイトに出ない                    |
| `date`                                     | `YYYY-MM-DD`                                                |  ●   | `id` と一致すること                         |
| `doorsOpenAt` / `startAt` / `endAt`        | `HH:MM`                                                     |  ●   | 24時間表記。深夜は `25:00` ではなく `01:00` |
| `venue.name`                               | string                                                      |  ●   | 会場名                                      |
| `venue.nearestStation`                     | string                                                      |      | 最寄駅                                      |
| `venue.mapUrl`                             | URL                                                         |      | 地図リンク                                  |
| `capacity`                                 | number                                                      |  ●   | 定員。オンライン登録の受付上限になる        |
| `fee.amount` / `fee.currency` / `fee.note` | number / string                                             |      | 参加費                                      |
| `summary`                                  | string                                                      | _空_ | 1〜2文。トップと一覧に出る                  |
| `registrationUrl`                          | string                                                      |      | 参加登録の入口（通常はIssueテンプレのURL）  |
| `programs[]`                               | array                                                       | _空_ | タイムテーブル。下記                        |
| `tags[]`                                   | string[]                                                    | _空_ | `早押しバトル` など                         |
| `links[]`                                  | `{label, url}[]`                                            | _空_ | 告知ページなど                              |

### programs[]

| 項目                | 型      | 必須 | 説明                                             |
| :------------------ | :------ | :--: | :----------------------------------------------- |
| `id`                | string  |  ●   | 同一イベント内で一意                             |
| `name`              | string  |  ●   | サイネージの「NOW」に大きく出る                  |
| `startAt` / `endAt` | `HH:MM` |  ●   | サイネージはこの範囲で現在のプログラムを判定する |
| `owner`             | string  | _空_ | 担当者のハンドル                                 |
| `description`       | string  | _空_ | サイネージに小さく出る                           |

---

## participants — 参加者

`data/events/<YYYY-MM-DD>/participants.json`

> **本名・メールアドレス・電話番号を書かないこと。** → [個人情報の取り扱い方針](policy/privacy.md)

| 項目                         | 型                                                    |     必須     | 説明                                              |
| :--------------------------- | :---------------------------------------------------- | :----------: | :------------------------------------------------ |
| `eventId`                    | `YYYY-MM-DD`                                          |      ●       | ディレクトリ名と一致                              |
| `participants[].id`          | string                                                |      ●       | `p-<eventId>-<連番3桁>`。**一度付けたら変えない** |
| `participants[].displayName` | string(40)                                            |      ●       | ハンドル・ニックネーム                            |
| `participants[].github`      | string                                                |     _空_     | `@` なしのアカウント名                            |
| `participants[].role`        | `guest` / `staff` / `mentor` / `speaker`              |   _guest_    |                                                   |
| `participants[].joinedVia`   | `online` / `walk-in` / `invited`                      |   _online_   |                                                   |
| `participants[].status`      | `registered` / `checked-in` / `cancelled` / `no-show` | _registered_ |                                                   |
| `participants[].interests[]` | string[]                                              |     _空_     | 席決め・メンター割り当ての参考                    |
| `participants[].wantsLT`     | boolean                                               |   _false_    |                                                   |
| `participants[].note`        | string(200)                                           |              | 取り込み元のIssue番号など                         |

---

## tables — 卓

`data/events/<YYYY-MM-DD>/tables.json`

出入り自由の常設卓（`free`）と、トーナメント用の卓（`tournament`）を定義します。

| 項目                   | 型                    |  必須  | 説明                                                    |
| :--------------------- | :-------------------- | :----: | :------------------------------------------------------ |
| `eventId`              | `YYYY-MM-DD`          |   ●    |                                                         |
| `tables[].id`          | string                |   ●    | `tournament.json` の `entries[].tableId` から参照される |
| `tables[].name`        | string                |   ●    | サイネージに出る                                        |
| `tables[].kind`        | `free` / `tournament` | _free_ |                                                         |
| `tables[].seats`       | number                |   ●    | 席数。トーナメントの着席チェックに使う                  |
| `tables[].hosts[]`     | string[]              |  _空_  | 卓を見る人のハンドル                                    |
| `tables[].description` | string                |  _空_  | 「困ったらまずここへ」など                              |

---

## tournaments — トーナメント進行

`data/events/<YYYY-MM-DD>/tournament.json`

タイマー（`/signage/timer`）がこのファイルを読んで進行します。

| 項目                                  | 型                                                            |      必須      | 説明                                            |
| :------------------------------------ | :------------------------------------------------------------ | :------------: | :---------------------------------------------- |
| `eventId`                             | `YYYY-MM-DD`                                                  |       ●        |                                                 |
| `name`                                | string                                                        |       ●        | `早押しAIコード生成バトル vol.2` など           |
| `format`                              | `speed-coding` / `hack-battle` / `quiz` / `other`             | _speed-coding_ |                                                 |
| `status`                              | `scheduled` / `running` / `paused` / `finished` / `cancelled` |  _scheduled_   | 記録用。実際の進行はブラウザ側の状態            |
| `defaultRoundSec` / `defaultBreakSec` | number                                                        |  _300 / 120_   | 新しいラウンドを足すときの目安                  |
| `rounds[].no`                         | number                                                        |       ●        | 1から。重複不可                                 |
| `rounds[].name`                       | string                                                        |       ●        | 大画面に出る                                    |
| `rounds[].durationSec`                | number                                                        |       ●        | このラウンドの持ち時間                          |
| `rounds[].breakAfterSec`              | number                                                        |      _0_       | 0以外ならラウンド後に休憩フェーズに入る         |
| `rounds[].challengeId`                | string                                                        |      _空_      | `data/challenges/` のID。空なら「当日発表」表示 |
| `entries[].participantId`             | string                                                        |       ●        | `participants.json` に存在すること              |
| `entries[].tableId`                   | string                                                        |       ●        | `tables.json` に存在すること                    |
| `entries[].seat`                      | number                                                        |       ●        | 卓の席数以内。同じ卓で重複不可                  |

---

## results — 受賞結果

`data/events/<YYYY-MM-DD>/results.json`

| 項目                      | 型           | 必須 | 説明                                        |
| :------------------------ | :----------- | :--: | :------------------------------------------ |
| `eventId`                 | `YYYY-MM-DD` |  ●   |                                             |
| `results[].awardId`       | string       |  ●   | `data/awards/awards.json` に存在すること    |
| `results[].participantId` | string       |  ●   | 同じ回の `participants.json` に存在すること |
| `results[].rank`          | number       | _1_  | 同じ賞に複数人いる場合の順位                |
| `results[].note`          | string(200)  | _空_ | 「決勝を3分12秒で通過」など                 |

殿堂ページ（`/awards`）は、全回の `results.json` をこの構造のまま集計して作られます。

---

## awards — 賞の定義

`data/awards/awards.json`

| 項目                   | 型                                           |    必須     | 説明                                        |
| :--------------------- | :------------------------------------------- | :---------: | :------------------------------------------ |
| `awards[].id`          | string                                       |      ●      | `results.json` から参照される。**変えない** |
| `awards[].name`        | string                                       |      ●      |                                             |
| `awards[].emoji`       | string                                       |    _🏅_     | サイネージと殿堂に出る                      |
| `awards[].description` | string                                       |    _空_     | どういう時に贈られるか                      |
| `awards[].category`    | `tournament` / `talk` / `hack` / `community` | _community_ |                                             |

---

## reports — 開催レポート

`data/events/<YYYY-MM-DD>/report.md`

front matter:

| 項目          | 型           | 必須 |
| :------------ | :----------- | :--: |
| `eventId`     | `YYYY-MM-DD` |  ●   |
| `title`       | string       |  ●   |
| `author`      | string       |      |
| `publishedAt` | `YYYY-MM-DD` |  ●   |

本文は自由。イベント詳細ページの末尾に出ます。
開催済み（`archived`）なのに `report.md` が無いと、CIが警告を出します（エラーではありません）。

---

## challenges — AI課題

`data/challenges/<年>/<id>.md`

**ファイル名（拡張子を除く）と front matter の `id` は一致させること。** CIがチェックします。

| 項目           | 型                                                                                             |    必須     | 説明                                                    |
| :------------- | :--------------------------------------------------------------------------------------------- | :---------: | :------------------------------------------------------ |
| `id`           | `YYYY-NNN-slug`                                                                                |      ●      | 例: `2026-001-csv-to-markdown`                          |
| `title`        | string(60)                                                                                     |      ●      | 20字以内推奨（サイネージに出るため）                    |
| `level`        | `beginner` / `intermediate` / `advanced`                                                       |      ●      |                                                         |
| `category`     | `prompt-engineering` / `coding` / `debugging` / `refactoring` / `security` / `data` / `design` |      ●      |                                                         |
| `timeLimitSec` | number                                                                                         |      ●      | 早押しバトルでの持ち時間                                |
| `tags[]`       | string[]                                                                                       |    _空_     |                                                         |
| `author`       | string                                                                                         |    _空_     | 作問者のハンドル                                        |
| `createdAt`    | `YYYY-MM-DD`                                                                                   |      ●      |                                                         |
| `usedIn[]`     | `YYYY-MM-DD`[]                                                                                 |    _空_     | 出題した回。存在するイベントであること                  |
| `license`      | string                                                                                         | _CC-BY-4.0_ |                                                         |
| `draft`        | boolean                                                                                        |   _false_   | `true` の間はサイトに出ない。当日まで伏せたい課題に使う |

本文の構成（`data/challenges/_template.md` に雛形があります）:

```
## 問題        何を作る/直すのか
## 制約        言語・ライブラリの縛り
## 入力例      / ## 期待される出力
## 評価基準    配点表（正しさ・速さ・プロンプト）
## ヒント
## 模範回答    ← ここ以降はサイト上で折りたたまれる
## 解説        なぜそうなるか、どんなプロンプトで辿り着けるか
```

`## 模範回答` の見出しは、サイトが折りたたみ位置を決めるために使っています。
文言を変える場合は `src/pages/challenges/[id].astro` も合わせて直してください。

---

## 項目を追加するときの手順

1. `src/content.config.ts` の Zod スキーマを更新する（新項目は `.optional()` か `.default()` を付ける）
2. `data/events/_template/` など雛形に同じ項目を足す
3. この文書の表を更新する
4. 既存データを揃える
5. `npm run verify` が通ることを確認してPR

必須項目を増やすのは破壊的変更です。PRに移行手順を書いてください。
