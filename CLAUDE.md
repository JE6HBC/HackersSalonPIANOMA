# CLAUDE.md

このリポジトリでAIエージェント（Claude Code など）に作業させるときの前提です。
人間のコントリビューターは [CONTRIBUTING.md](CONTRIBUTING.md) を読んでください。

## このリポジトリは何か

御成門PIANOMAで開く技術・AI交流イベント「Hacker's salon」の運営リポジトリ。
イベントの**コンテンツ**（開催予定・レポート・AI課題・受賞歴）と、当日使う**システム**
（会場サイネージ・トーナメントタイマー・運営コンソール）が同居している。

**外部サービスを一切使わず、GitHubの機能だけで動く静的サイト**である（[ADR-0001](docs/adr/0001-github-only-stack.md)）。
サーバもデータベースもない。この制約を外す提案をする前に [docs/architecture.md](docs/architecture.md) の
「できないこと」を読むこと。

## コマンド

```bash
npm run dev             # 開発サーバ http://localhost:4321/HackersSalonPIANOMA/
npm run verify          # 整形・データ整合性・型・ビルドを全部通す（変更後はこれ）
npm run validate:data   # data/ のファイル間参照と個人情報混入をチェック
npm run format          # Prettier
```

**変更を終えたら必ず `npm run verify` を通すこと。** CIと同じチェックが走る。

## 絶対に守ること

1. **`data/` に個人情報を書かない。** このリポジトリは公開されている。
   人を指してよいのは「表示名」と「GitHubアカウント名」だけ。本名・メールアドレス・電話番号・
   勤務先は、サンプルデータであっても書かない（[ADR-0003](docs/adr/0003-no-personal-data.md)）。
2. **既存のIDを変えない。** `event.id` / `participant.id` / `award.id` / `challenge.id` は
   他のファイルから参照されている。
3. **`main` に直接コミットしない。** ブランチを切ってPull Requestにする。
4. **依存パッケージを勝手に増やさない。** 現状は Astro と Prettier だけ。
   追加が必要と判断したら、まず理由を人間に確認する。
5. **ユーザーに指示されていない範囲まで広げない。** 特にスキーマ変更とデプロイ設定は影響が広い。

## 設計上の決まり

- **スキーマの唯一の正は `src/content.config.ts`（Zod）。** 項目を足すときは
  雛形（`data/events/_template/`）と [docs/data-model.md](docs/data-model.md) も同時に更新する。
  新項目には `.optional()` か `.default()` を付ける（既存データを壊さないため）。
- **内部リンクは `href()`（`src/lib/url.ts`）を通す。** GitHub Pages が
  `/HackersSalonPIANOMA/` 配下に配信するため、`href="/events"` は本番で404になる。
- **ページから `getCollection()` を直接呼ばない。** `src/lib/data.ts` の関数を使う。
  存在しないファイルを取りに行く場面があるので、`getEntry()` ではなく `getCollection().find()` を使う
  （`getEntry()` は見つからないとビルドログに警告を出す）。
- **色・余白・文字サイズは `src/styles/tokens.css` から。** 生の `#rrggbb` を書かない。
- **`localStorage` の読み書きは try/catch で囲む。** プライベートモードで例外が飛ぶ。
- **タイマーの残り時間は終了時刻(epoch ms)との差で計算する。** 経過秒の加算にしない
  （タブが非アクティブだと `setInterval` が間引かれてズレる）。
- **サイネージは3〜8m離れた暗い部屋から読めること。** 迷ったら文字を大きく、情報を減らす。

## ディレクトリ

```
data/          イベントのデータベース（唯一の正）。PRでのみ更新
docs/          設計・運用・方針。adr/ に「なぜそうしたか」
scripts/       Node製ツール。依存パッケージなしで動くこと
src/
  content.config.ts   データスキーマ
  lib/                データ取得の共通処理
  pages/signage/      会場スクリーン（大画面前提）
  pages/admin/        運営コンソール（当日用・localStorage）
.github/workflows/    ci / deploy-pages / registration-sync
```

## 外部入力の扱い

`.github/workflows/registration-sync.yml` は**誰でも立てられるIssueの本文**を読む。
`scripts/issue-to-participant.mjs` を触るときは:

- Issue本文をシェルコマンドに展開しない（必ず環境変数経由）
- 取り込む値は文字種と長さを必ず制限する
- 反映は必ずPR経由にする（人のレビューを挟む）

## コミットとPR

- Conventional Commits: `feat(timer): 残り30秒で画面を赤くする`
- ブランチ: `feat/` `fix/` `event/` `challenge/` `docs/` `chore/`
- 1つのPRで1つのこと。ついでの整形を混ぜない
- PRテンプレートのチェックリストを埋める

## 迷ったとき

- 設計判断 → [docs/adr/](docs/adr/)
- データの形 → [docs/data-model.md](docs/data-model.md)
- 当日の運用 → [docs/operations-runbook.md](docs/operations-runbook.md)
- それでも決まらない → **推測で進めず、人間に聞く**
