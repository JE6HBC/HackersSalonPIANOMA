# リポジトリ設定チェックリスト

**最初に1回だけ**やる、GitHub側の設定です。ここが済んでいないと自動デプロイと
参加登録の取り込みが動きません。すべて GitHub Pro の範囲内でできます。

---

## 1. GitHub Pages を有効にする

`Settings` → `Pages`

- **Source:** `GitHub Actions` を選ぶ（`Deploy from a branch` ではない）

これで `main` へのpushのたびに `.github/workflows/deploy-pages.yml` が走ります。
公開URL: `https://je6hbc.github.io/HackersSalonPIANOMA/`

> 独自ドメインを当てる場合は、`astro.config.mjs` の `site` を変えて `base` を `'/'` にし、
> `public/CNAME` を追加してください。[ADR-0001](adr/0001-github-only-stack.md) も更新すること。

## 2. Actions にPR作成を許可する

`Settings` → `Actions` → `General` → `Workflow permissions`

- [x] **Allow GitHub Actions to create and approve pull requests**

参加登録Issueから自動PRを作る `registration-sync.yml` に必要です。
（`Read and write permissions` に切り替える必要はありません。各ワークフローが個別に宣言しています）

## 3. main ブランチを保護する

`Settings` → `Rules` → `Rulesets` → `New branch ruleset`

対象: `main`

- [x] Require a pull request before merging
  - Required approvals: **1**（運営が1人の間は 0 でも可。その場合も直pushは禁止のまま）
  - [x] Require review from Code Owners
- [x] Require status checks to pass
  - 必須にするチェック: `検証（整形・データ整合性・型・ビルド）`
- [x] Block force pushes

> 運営が自分1人の場合、approvals を1にすると自分のPRをマージできなくなります。
> その場合は approvals を 0 にし、「CIが通ること」だけを必須にしてください。

## 4. マージ方法を絞る

`Settings` → `General` → `Pull Requests`

- [x] Allow squash merging ← これだけ残す
- [ ] Allow merge commits
- [ ] Allow rebase merging
- [x] Automatically delete head branches

## 5. ラベルを作る

Issueテンプレートが使うラベルです。無くても動きますが、あると整理が楽になります。

| ラベル                     | 色の目安 | 用途                                               |
| :------------------------- | :------- | :------------------------------------------------- |
| `participant-registration` | 緑       | **必須。** これが付いたIssueだけ自動取り込みが走る |
| `lt-entry`                 | 青       | LT登壇エントリー                                   |
| `challenge`                | 紫       | AI課題の投稿                                       |
| `bug`                      | 赤       | 不具合                                             |
| `proposal`                 | 黄       | 企画・機能提案                                     |
| `good first issue`         | 水色     | 初めての人向け                                     |

```bash
gh label create participant-registration --color 0E8A16 --description "参加登録Issue（自動取り込み対象）"
gh label create lt-entry --color 1D76DB --description "LT登壇エントリー"
gh label create challenge --color 5319E7 --description "AI課題の投稿"
gh label create proposal --color FBCA04 --description "企画・機能の提案"
```

## 6. Discussions（任意）

`Settings` → `General` → `Features` → `Discussions`

有効にすると、Issueにするほどでもない相談の受け皿になります。
`.github/ISSUE_TEMPLATE/config.yml` からリンクしています。

## 7. Actions の実行時間

GitHub Pro のプライベートリポジトリは月3,000分まで。
**このリポジトリは公開なので、Actionsの実行時間は無料・無制限**です。

---

## 動作確認

設定が済んだら:

1. 適当なブランチでPRを立てる → CIが走り、`検証` が通ることを確認
2. `main` にマージ → `Deploy to GitHub Pages` が走り、サイトが更新されることを確認
3. 参加登録Issueを自分で1件立てる → `registration-sync` が走り、PRが自動で作られることを確認
   （確認後、そのPRとIssueは閉じてよい）
