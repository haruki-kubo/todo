[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# tasgy

GitHub Issues をバックエンドにしたタスク管理 Web アプリです。

課題一覧、ボード、ガントチャートを切り替えながら、GitHub Issue の確認、ラベル更新、コメント追加、完了処理、新規作成を一つの画面で扱えます。

## スクリーンショット

```
┌──────────────────────────┐
│ 📋 マイタスク      [＋]  │
├──────────────────────────┤
│ 🔴緊急│🟡今週│🔵次週│👀待ち│
├──────────────────────────┤
│ カテゴリ: [全て ▼]       │
│ ソート:  [作成日順 ▼]    │
├──────────────────────────┤
│ ┌────────────────────┐   │
│ │ #38 タスクタイトル   │   │
│ │ 🏢 カテゴリ 📅 4/30  │   │
│ │ [🟡今週へ] [✅完了]  │   │
│ └────────────────────┘   │
└──────────────────────────┘
```

## 機能

- 課題一覧: 検索、フィルター、ソート、詳細パネル表示
- ボード: ステータス別または優先度別の列表示とドラッグ移動
- ガントチャート: 作成日から期限日までの期間を可視化
- 詳細パネル: Markdown 本文、コメント、状態変更、優先度変更、完了処理
- 新規作成: 件名、詳細、状態、優先度、カテゴリ、期限を指定して Issue を作成
- 期限表示: 3日以内は `⚠️`、超過は `🔥` で強調

## 技術スタック

- **React 19** + **Vite**
- **Tailwind CSS v4**
- **GitHub REST API** — Issue をデータストアとして利用
- **GitHub Pages** — 静的サイトとしてホスティング

## ラベル設定

tasgy は GitHub Labels の `description` に含まれる分類文字列で表示グループを判定します。

- `priority` を含むラベル: 優先度
- `status` を含むラベル: ステータス
- `category` を含むラベル: カテゴリ

E2E と動作確認で使っている代表例:

| 種別 | ラベル名 | 色 | description |
|------|----------|----|-------------|
| priority | `🔴 緊急` | `d73a4a` | `priority` |
| priority | `🟡 今週` | `fbca04` | `priority` |
| priority | `🔵 次週以降` | `0075ca` | `priority` |
| priority | `👀 確認待ち` | `f9d0c4` | `priority` |
| status | `未対応` | `9ca3af` | `status` |
| status | `処理中` | `6366f1` | `status` |
| status | `処理済み` | `22c55e` | `status` |
| category | `🏢 経理総務` | `0e8a16` | `category` |
| category | `👥 採用労務` | `d876e3` | `category` |
| category | `🔒 情シス` | `006b75` | `category` |

GitHub CLI でまとめて作る例:

```bash
REPO="<your-username>/<your-repo>"

gh label create "🔴 緊急" --color "d73a4a" --description "priority" --repo "$REPO"
gh label create "🟡 今週" --color "fbca04" --description "priority" --repo "$REPO"
gh label create "🔵 次週以降" --color "0075ca" --description "priority" --repo "$REPO"
gh label create "👀 確認待ち" --color "f9d0c4" --description "priority" --repo "$REPO"
gh label create "未対応" --color "9ca3af" --description "status" --repo "$REPO"
gh label create "処理中" --color "6366f1" --description "status" --repo "$REPO"
gh label create "処理済み" --color "22c55e" --description "status" --repo "$REPO"
gh label create "🏢 経理総務" --color "0e8a16" --description "category" --repo "$REPO"
gh label create "👥 採用労務" --color "d876e3" --description "category" --repo "$REPO"
gh label create "🔒 情シス" --color "006b75" --description "category" --repo "$REPO"
```

## セットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/<your-username>/tasgy.git
cd tasgy
npm install
```

### 2. 環境変数を設定

`.env` ファイルをプロジェクトルートに作成:

```
VITE_REPO_OWNER=<GitHubユーザー名>
VITE_REPO_NAME=<Issueを管理するリポジトリ名>
```

### 3. GitHub Personal Access Token を作成

1. [GitHub Settings > Tokens](https://github.com/settings/tokens?type=beta) にアクセス
2. Fine-grained token を作成（`Issues: Read and write` 権限）
3. アプリ初回アクセス時にトークンを入力

### 4. 開発サーバーを起動

```bash
npm run dev
```

## テスト

### 単体・コンポーネントテスト

```bash
npm test
```

Vitest と Testing Library で、ユーティリティ、API ラッパー、主要コンポーネント、`App` の基本導線を確認します。

### E2E テスト

```bash
E2E_GITHUB_TOKEN=<github-token> npm run test:e2e
```

前提:

- `.env` に `VITE_REPO_OWNER` と `VITE_REPO_NAME` が設定されている
- 対象リポジトリにラベルと seed Issue が存在する
- `E2E_GITHUB_TOKEN` は対象リポジトリの Issue を更新できる

現在の E2E カバー:

- 一覧から詳細パネルを開く
- ボード/ガント表示
- 新規 Issue 作成
- コメント追加
- ステータス変更
- 優先度変更
- ボードのドラッグ移動
- 完了処理

seed データの想定は [`docs/TEST_CASES.md`](/Users/haruki_kubo/work/cra/tasgy-app/docs/TEST_CASES.md) にまとめています。

## デプロイ（GitHub Pages）

1. リポジトリの Settings > Pages で **Source: GitHub Actions** を選択
2. リポジトリの Settings > Secrets and variables > Actions > Variables に環境変数を追加:
   - `VITE_REPO_OWNER`
   - `VITE_REPO_NAME`
3. `main` ブランチにプッシュすると自動デプロイ

## CI

GitHub Actions 用のワークフローを追加済みです。

- `ci.yml`: `lint`、`build`、`test`
- E2E は GitHub 書き込み権限が必要なため、ローカル実行を基本にしています

## ライセンス

MIT
