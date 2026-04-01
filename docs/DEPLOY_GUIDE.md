# IssueBoard - デプロイ手順書

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2026-03-28 | 1.0 | 初版作成 |
| 2026-04-01 | 2.0 | 組織 Pages ドメイン対応。`VITE_BASE_PATH` による base path 上書きを追加。OAuth 認証関連の環境変数を追加。デプロイ先をリポジトリ非依存の汎用記述に変更 |

---

## 1. 概要

IssueBoard を GitHub Pages にデプロイする手順を説明します。

| 項目 | 値 |
|------|-----|
| デプロイ先 | GitHub Pages |
| トリガーブランチ | `issueboard`（`deploy.yml` で変更可能） |
| デプロイ方式 | GitHub Actions（`deploy.yml`） |

### Pages ドメインの種類

GitHub Pages の URL はアカウント種別により異なります。

| アカウント | デプロイ URL | base path |
|-----------|------------|-----------|
| 個人アカウント | `https://<user>.github.io/<repo>/` | `/<repo>/` |
| 組織（デフォルト） | `https://<user>.github.io/<repo>/` | `/<repo>/` |
| 組織（カスタムドメイン割当済み） | `https://<org-hash>.pages.github.io/` | `/` |

組織で Pages にカスタムドメインが割り当てられている場合、リポジトリ名のサブパスが付かずルートにデプロイされます。この場合は `VITE_BASE_PATH=/` を `deploy.yml` に設定してください。

---

## 2. 前提条件

- 対象リポジトリへの push 権限があること
- Node.js 20 以上がローカルにインストール済み
- Git が設定済み

---

## 3. 初回セットアップ

### 3.1 GitHub Pages のソース設定

1. リポジトリの **Settings** → **Pages** を開く
2. **Build and deployment** の **Source** を **GitHub Actions** に変更
3. 保存

### 3.2 Environment のブランチ制限

1. リポジトリの **Settings** → **Environments** を開く
2. **github-pages** をクリック
3. **Deployment branches and tags** でデプロイ元ブランチ（例: `issueboard`）を許可（または「No restriction」）
4. 保存

### 3.3 リモート設定

ローカルリポジトリにデプロイ先リモートを追加（初回のみ）:

```bash
git remote add deploy https://github.com/<owner>/<repo>.git
```

---

## 4. デプロイ手順

### 4.1 通常のデプロイ（コード変更あり）

```bash
# 1. デプロイ元ブランチに切り替え
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

GitHub 上で確認:
- リポジトリの **Actions** タブ

---

## 5. ビルド設定

### 5.1 base path の決定

`vite.config.js` は以下の優先順で base path を決定します:

```
1. process.env.VITE_BASE_PATH  （CI 環境変数 — 最優先）
2. .env の VITE_BASE_PATH       （ローカル .env）
3. /<VITE_REPO_NAME>/           （リポジトリ名から自動生成）
4. /                            （フォールバック）
```

- **個人アカウント / 通常の組織**: `VITE_BASE_PATH` 未設定でOK（リポジトリ名から自動生成）
- **組織カスタムドメイン割当済み**: `deploy.yml` で `VITE_BASE_PATH: /` を設定

### 5.2 環境変数

ビルド時の環境変数は `deploy.yml` 内で指定します:

```yaml
env:
  VITE_REPO_OWNER: <リポジトリオーナー>
  VITE_REPO_NAME: <リポジトリ名>
  VITE_AUTH_MODE: pat              # pat | oauth | both
  VITE_BASE_PATH: /                # 組織 Pages の場合のみ必要
  # OAuth 利用時のみ:
  # VITE_GITHUB_CLIENT_ID: Iv23lixxxxxxxxxx
  # VITE_OAUTH_PROXY_URL: https://proxy.workers.dev
```

- GitHub PAT（トークン）はビルドに含まれない（ユーザーがブラウザ上で入力）

### 5.3 ワークフロー（`.github/workflows/deploy.yml`）

| 項目 | 値 |
|------|-----|
| トリガー | デプロイ元ブランチへの push / 手動実行 |
| Node.js | 20 |
| ビルドコマンド | `npm run build` |
| 出力先 | `dist/` |
| デプロイ | `actions/deploy-pages@v4` |

---

## 6. トラブルシューティング

| 症状 | 原因 | 対処法 |
|------|------|--------|
| deploy ジョブが即失敗 | Environment のブランチ制限 | Settings → Environments → github-pages でブランチを許可 |
| ビルド失敗 | 依存関係エラー | `npm ci` が通るか確認。`package-lock.json` を最新化 |
| 404 エラー（デプロイ後） | base path の不一致 | 組織 Pages の場合は `VITE_BASE_PATH: /` を設定。個人の場合は `VITE_REPO_NAME` が正しいか確認 |
| 画面が白い | 環境変数未設定 | `deploy.yml` の `env` に `VITE_REPO_OWNER` / `VITE_REPO_NAME` が設定されているか確認 |
| Pages が有効にならない | Source 設定 | Settings → Pages → Source が「GitHub Actions」になっているか確認 |
| 別ドメインにリダイレクト | 組織の Pages ドメイン | `<org-hash>.pages.github.io` がデフォルトドメイン。Custom domain 欄が空であることを確認 |
| CSS/JS が 404 | base path 不一致 | 開発者ツールで読み込みパスを確認。`VITE_BASE_PATH` の設定を見直す |
