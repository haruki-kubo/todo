# IssueBoard - GitHub 設定ガイド

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2026-03-28 | 1.0 | 初版作成 |
| 2026-03-28 | 1.1 | 親子課題（サブタスク）の運用方法を追加 |
| 2026-03-28 | 1.2 | E2E テスト実行に必要な環境変数と実行手順を追加 |
| 2026-03-28 | 1.3 | マイルストーンの設定（バーンダウンチャート用）セクションを追加 |
| 2026-03-28 | 1.4 | バーンダウンチャート用に Milestone description で開始日を指定する手順を追加 |

---

## 1. 概要

IssueBoard は GitHub Issues をデータソースとして動作します。
本ドキュメントでは、アプリを利用する前に必要な GitHub 側の設定を説明します。

### 設定が必要な項目

1. **リポジトリ** — Issue を管理する対象のリポジトリ
2. **ラベル** — 優先度・ステータス・カテゴリの分類用ラベル
3. **アクセストークン** — アプリから GitHub API にアクセスするための認証情報
4. **環境変数** — アプリにリポジトリ情報を設定

---

## 2. リポジトリの準備

IssueBoard は 1 つの GitHub リポジトリの Issues を管理対象とします。
既存のリポジトリを使用するか、新規にリポジトリを作成してください。

- パブリック / プライベートどちらでも利用可能
- 組織リポジトリの場合、アクセストークンにリポジトリへの権限が必要

---

## 3. ラベルの設定

### 3.1 分類ルール

IssueBoard はラベルの **Description（説明）フィールド** を読み取り、自動的に分類します。

| Description に含める文字列 | 分類 | 用途 |
|--------------------------|------|------|
| `priority` または `priority:N` | 優先度 | 課題の緊急度を表す |
| `status` または `status:N` | ステータス | 課題の進捗状態を表す |
| `category` | カテゴリ | 課題の分野・部門を表す |

- `N` は表示順序を指定する数値（1 が先頭、小さいほど左に表示）
- `N` を省略した場合は GitHub API の返却順で表示
- 上記いずれにも該当しないラベルは分類対象外（ボードのカードにバッジとして表示される）

### 3.2 ラベルの設定手順

1. GitHub リポジトリの **Settings** → **Labels** を開く
2. 各ラベルの **Description** に分類キーワードを設定する
3. 新しいラベルを作成する場合は **New label** から作成

### 3.3 推奨ラベル構成

#### 優先度ラベル

| ラベル名 | Description | 色 | 説明 |
|---------|-------------|-----|------|
| 🔴 緊急 | `priority:1` | `#d73a4a` | 最も緊急度が高い |
| 🟡 今週 | `priority:2` | `#fbca04` | 今週中に対応が必要 |
| 🔵 次週以降 | `priority:3` | `#0075ca` | 次週以降に対応 |
| 👀 確認待ち | `priority:4` | `#f9d0c4` | 確認や承認待ちの状態 |

#### ステータスラベル

| ラベル名 | Description | 色 | 説明 |
|---------|-------------|-----|------|
| 未対応 | `status:1` | `#9ca3af` | まだ着手していない |
| 処理中 | `status:2` | `#6366f1` | 対応中 |
| 処理済み | `status:3` | `#22c55e` | 対応完了（クローズ前のレビュー待ちなど） |

#### カテゴリラベル

| ラベル名 | Description | 色 | 説明 |
|---------|-------------|-----|------|
| 🏢 経理総務 | `category` | `#0e8a16` | 経理・総務関連 |
| 👥 採用労務 | `category` | `#d876e3` | 採用・労務関連 |
| 🔒 情シス | `category` | `#006b75` | 情報システム関連 |

> カテゴリラベルは業務内容に応じて自由に追加・変更してください。

### 3.4 ラベル設定の注意事項

- Description を設定しないラベルは IssueBoard の分類対象外になります
- 1 つの Issue に対して、各分類（優先度・ステータス・カテゴリ）から最大 1 つずつ付与してください
- ラベル名は自由に変更できます（Description の内容で分類されるため）
- ラベルの色はアプリ内でそのまま表示に使用されます

---

## 4. アクセストークンの発行

### 4.1 Classic Token（推奨）

組織リポジトリで Fine-grained Token の承認が必要な場合は Classic Token が簡単です。

1. GitHub にログイン
2. **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. **Generate new token (classic)** をクリック
4. 以下を設定:
   - **Note**: 任意の名前（例: `IssueBoard`）
   - **Expiration**: 任意の期限
   - **Scopes**: `repo` にチェック
5. **Generate token** でトークンを生成
6. 表示されたトークン（`ghp_` で始まる文字列）をコピーして安全に保管

### 4.2 Fine-grained Token

より細かい権限制御が必要な場合はこちらを使用します。

1. GitHub にログイン
2. **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**
3. **Generate new token** をクリック
4. 以下を設定:
   - **Token name**: 任意の名前
   - **Expiration**: 任意の期限
   - **Resource owner**: リポジトリの所有者（個人 or 組織）
   - **Repository access**: 「Only select repositories」→ 対象リポジトリを選択
   - **Permissions** → **Repository permissions**:
     - **Issues**: Read and write
5. **Generate token** でトークンを生成

> **注意**: 組織リポジトリの場合、Fine-grained Token は組織管理者の承認が必要です（ステータスが Pending になります）。承認されるまでトークンは使用できません。

### 4.3 トークンに必要な権限

| 操作 | 必要な権限 |
|------|-----------|
| Issue の閲覧 | Issues: Read |
| Issue の作成・クローズ | Issues: Write |
| ラベルの変更 | Issues: Write |
| コメントの追加 | Issues: Write |
| ラベル一覧の取得 | Issues: Read（または Metadata: Read） |

---

## 5. 環境変数の設定

アプリのルートディレクトリにある `.env` ファイルを編集します。

```env
VITE_REPO_OWNER=リポジトリの所有者名
VITE_REPO_NAME=リポジトリ名
```

**設定例**:

```env
VITE_REPO_OWNER=haruki-kubo
VITE_REPO_NAME=todo
```

> URL が `https://github.com/haruki-kubo/todo` の場合、`VITE_REPO_OWNER=haruki-kubo`、`VITE_REPO_NAME=todo` となります。

### 5.1 E2E テスト用の環境変数

Playwright による E2E テストを実行する場合は、通常の `.env` とは別に実行時環境変数 `E2E_GITHUB_TOKEN` が必要です。

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `E2E_GITHUB_TOKEN` | ○ | E2E テスト用の GitHub Personal Access Token |
| `E2E_REPO_OWNER` | 任意 | テスト対象のリポジトリオーナー名。省略時は `haruki-kubo` |
| `E2E_REPO_NAME` | 任意 | テスト対象のリポジトリ名。省略時は `todo` |

- `E2E_GITHUB_TOKEN` には Issue の読み書きができる権限が必要です
- 推奨権限は通常利用時と同じです
  - Classic Token: `repo`
  - Fine-grained Token: 対象リポジトリに対する `Issues: Read and write`
- `E2E_GITHUB_TOKEN` 未設定時、`npm run test:e2e` のシナリオは skip されます

**実行例**:

```bash
E2E_GITHUB_TOKEN=ghp_xxx \
E2E_REPO_OWNER=haruki-kubo \
E2E_REPO_NAME=todo \
npm run test:e2e
```

> シェルに毎回入力したくない場合は、`.zshrc` などに export するか、実行時だけ一時的に環境変数を付与してください。`.env` に E2E 用トークンを保存する運用は推奨しません。

---

## 6. マイルストーンの設定（バーンダウンチャート用）

バーンダウンチャート機能を使用するには、GitHub Milestone の設定が必要です。

### 6.1 マイルストーンの作成

1. GitHub リポジトリの **Issues** → **Milestones** を開く
2. **New milestone** をクリック
3. 以下を設定:
   - **Title**: スプリント名やリリース名（例: `Sprint 1`、`v1.0`）
   - **Due date**: 期限日（バーンダウンチャートの終了日になる）
   - **Description**: 任意
     - 開始日を明示したい場合は `開始日: YYYY-MM-DD` または `開始日: YYYY/MM/DD` を記載
4. **Create milestone** で作成

**Description 記載例**:

```text
2026年度 Q1 スプリント
開始日: 2026-03-21
```

- `開始日` がある場合、バーンダウンチャートの開始日はその日付を優先します
- `開始日` がない場合、Milestone に紐づく最古の Issue 作成日が開始日になります

### 6.2 Issue をマイルストーンに紐づけ

- Issue の作成時または編集時に **Milestone** を選択
- 複数の Issue を同じ Milestone に紐づけることで、バーンダウンチャートに反映される

### 6.3 バーンダウンチャートの見方

- **理想線**（グレー破線）: 期間内に均等に消化した場合のライン
- **実績線**（青実線）: 実際の残課題数の推移
- 実績線が理想線の下にあれば順調、上にあれば遅延

---

## 7. Issue の作成ルール

### 6.1 期限の設定

Issue の本文に以下の形式で記載すると、アプリ上で期限として認識されます。

```
📅 期限: 2026-04-15
```

- `YYYY-MM-DD` または `YYYY/MM/DD` 形式に対応
- アプリの新規作成モーダルから期限を設定した場合、本文の先頭に自動挿入されます

### 6.2 担当者の設定

GitHub Issues の **Assignees** で担当者を設定すると、アプリ上で担当者が表示されます。

- 課題一覧: 担当者列にアバターとユーザー名
- ボード: カード内にアバター
- ガントチャート: 左列にアバター
- フィルター: 担当者で絞り込み可能

### 6.3 親子課題（サブタスク）

課題に親子関係を持たせることができます。

**方法 1: アプリから作成（推奨）**

新規課題作成モーダルで「親課題」を選択するだけで、自動的に親子関係が構築されます。

**方法 2: GitHub 上で手動設定**

親 Issue の本文にタスクリスト形式で子 Issue の番号を記載します。

```markdown
### サブタスク
- [ ] #2
- [ ] #3
- [ ] #4
```

- 子 Issue を Close すると、GitHub が自動的に `- [x] #N` に更新します
- 子 Issue 側には特別な記法は不要です
- アプリは全 Issue の本文を走査して親子関係を自動認識します

**アプリ上での表示**:

| 画面 | 表示内容 |
|------|---------|
| 課題一覧 | 親 Issue の下に子 Issue をインデント表示。展開/折りたたみ可能 |
| 詳細パネル | 親課題リンク、サブタスク一覧、進捗バー |
| ボード | 親 Issue のカードにサブタスク進捗バー |
| ガントチャート | 「親課題」でグルーピング可能 |

---

## 8. 動作確認チェックリスト

設定完了後、以下を確認してください。

- [ ] `.env` にリポジトリ情報が正しく設定されている
- [ ] `npm run dev` でアプリが起動する
- [ ] トークン入力画面でトークンを入力し「接続する」でログインできる
- [ ] 課題一覧に GitHub Issues が表示される
- [ ] 優先度・ステータス・カテゴリのフィルターに設定したラベルが表示される
- [ ] ボードビューでステータス別の列が正しい順序で表示される（未設定 → 未対応 → 処理中 → 処理済み）
- [ ] `E2E_GITHUB_TOKEN` を設定した状態で `npm run test:e2e` が実行できる

---

## 9. トラブルシューティング

| 症状 | 原因 | 対処法 |
|------|------|--------|
| 404 エラー | リポジトリにアクセスできない | `.env` のオーナー名・リポジトリ名を確認。トークンの権限・有効期限を確認 |
| ラベルがフィルターに表示されない | Description が未設定 | GitHub のラベル設定で Description に `priority` / `status` / `category` を含めているか確認 |
| ステータスの列順が意図と異なる | `status:N` が未設定 | ラベルの Description を `status:1`、`status:2` のように順序付きに変更 |
| Fine-grained Token が使えない | 組織の承認待ち | 組織管理者に承認を依頼するか、Classic Token を使用 |
| Issue が表示されない | PR が混在 / Issue が Closed | IssueBoard は Open な Issue のみ表示。Pull Request は自動除外 |
