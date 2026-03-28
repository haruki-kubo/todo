# IssueBoard - デプロイ手順書

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2026-03-28 | 1.0 | 初版作成 |

---

## 1. 概要

IssueBoard を GitHub Pages にデプロイする手順を説明します。

| 項目 | 値 |
|------|-----|
| デプロイ先 | GitHub Pages |
| デプロイ URL | `https://haruki-kubo.github.io/todo/` |
| リポジトリ | `haruki-kubo/todo` |
| トリガーブランチ | `issueboard` |
| デプロイ方式 | GitHub Actions（`deploy.yml`） |

---

## 2. 前提条件

- `haruki-kubo/todo` リポジトリへの push 権限があること
- Node.js 20 以上がローカルにインストール済み
- Git が設定済み

---

## 3. 初回セットアップ（済み）

以下は初回のみ必要な設定です。既に完了しています。

### 3.1 GitHub Pages のソース設定

1. `https://github.com/haruki-kubo/todo/settings/pages` を開く
2. **Build and deployment** の **Source** を **GitHub Actions** に変更
3. 保存

### 3.2 Environment のブランチ制限

1. `https://github.com/haruki-kubo/todo/settings/environments` を開く
2. **github-pages** をクリック
3. **Deployment branches and tags** で `issueboard` ブランチを許可（または「All branches」）
4. 保存

### 3.3 リモート設定

ローカルリポジトリに `deploy` リモートを追加（初回のみ）:

```bash
git remote add deploy https://github.com/haruki-kubo/todo.git
```

---

## 4. デプロイ手順

### 4.1 通常のデプロイ（コード変更あり）

```bash
# 1. issueboard ブランチに切り替え
git checkout issueboard

# 2. 変更をコミット
git add -A
git commit -m "変更内容の説明"

# 3. push（自動でデプロイが走る）
git push deploy issueboard
```

### 4.2 再デプロイ（コード変更なし）

```bash
git checkout issueboard
git commit --allow-empty -m "trigger deploy"
git push deploy issueboard
```

### 4.3 デプロイ状況の確認

```bash
# 最新のワークフロー実行状況を確認
gh api repos/haruki-kubo/todo/actions/runs \
  --jq '.workflow_runs[:3] | .[] | "\(.name) | \(.status) | \(.conclusion // "running")"'
```

または GitHub 上で確認:
- `https://github.com/haruki-kubo/todo/actions`

---

## 5. ビルド設定

### 5.1 vite.config.js

```javascript
base: '/todo/'   // リポジトリ名に合わせる
```

### 5.2 環境変数

ビルド時の環境変数は `deploy.yml` 内で直接指定:

```yaml
env:
  VITE_REPO_OWNER: haruki-kubo
  VITE_REPO_NAME: todo
```

- GitHub PAT（トークン）はビルドに含まれない
- ユーザーがブラウザ上でトークンを入力する仕組み

### 5.3 ワークフロー（`.github/workflows/deploy.yml`）

| 項目 | 値 |
|------|-----|
| トリガー | `issueboard` ブランチへの push / 手動実行 |
| Node.js | 20 |
| ビルドコマンド | `npm run build` |
| 出力先 | `dist/` |
| デプロイ | `actions/deploy-pages@v4` |

---

## 6. トラブルシューティング

| 症状 | 原因 | 対処法 |
|------|------|--------|
| deploy ジョブが即失敗（steps なし） | Environment のブランチ制限 | Settings → Environments → github-pages で `issueboard` を許可 |
| ビルド失敗 | 依存関係エラー | `npm ci` が通るか確認。`package-lock.json` を最新化 |
| 404 エラー（デプロイ後） | base path の不一致 | `vite.config.js` の `base` がリポジトリ名（`/todo/`）と一致しているか確認 |
| 画面が白い | 環境変数未設定 | `deploy.yml` の `env` に `VITE_REPO_OWNER` / `VITE_REPO_NAME` が設定されているか確認 |
| Pages が有効にならない | Source 設定 | Settings → Pages → Source が「GitHub Actions」になっているか確認 |
| push が rejected | リモート設定 | `git remote -v` で `deploy` が `haruki-kubo/todo` を指しているか確認 |
