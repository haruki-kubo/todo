# IssueBoard - 技術仕様書

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2026-03-27 | 1.0 | 初版作成 |
| 2026-03-28 | 1.1 | `getPriorityKey`/`getStatusKey` が未設定時 `null` を返すよう修正。デフォルトソート方向を修正（created 比較式を `a - b` に統一）。ガントチャート `totalDays` に `+1` して両端を含む日数に修正。`selectedIssue` を `loadData` 時に最新データから同期。TaskCard に `isSelected`・`excludeLabels` props 追加。BoardView / GanttChart に `onSelectIssue`・`selectedIssueId` props 追加（詳細パネル表示対応）。ProjectHeader の件数を 0 件含め常時表示に修正。画面遷移図にボード・ガントからの詳細表示を追加 |
| 2026-03-28 | 1.2 | GanttChart: スケール切替（日/週/月/四半期）、グルーピング（担当者/優先度/カテゴリ）、ステータスバッジ・担当者アバターを左列に追加。Props に `categoryLabels`・`statusLabels` を追加。左列幅を 240px → 320px に拡張 |
| 2026-03-28 | 1.3 | IssueTable・BoardView に `filterAssignee` 状態と `assignees` 算出値を追加。フィルター処理順序に担当者フィルターを追加。BoardView に `filteredIssues` 算出値を追加 |
| 2026-03-28 | 1.4 | `classifyLabels` に `parseOrder` を追加し、`priority:N` / `status:N` 形式で順序指定可能に。LabelDef に `order` フィールドを追加。BoardView の未設定列を先頭に配置するよう変更 |
| 2026-03-28 | 1.5 | BoardView に列ヘッダー D&D による並び替え機能を追加。`statusOrder` / `priorityOrder` 状態と `localStorage` 永続化を追加。`orderedLabels` 算出値を追加 |
| 2026-03-28 | 1.6 | `classifyLabels` のソートを安定ソートに修正。LabelDef に `_idx` フィールドを追加。`order` 未指定時に GitHub API の返却順を維持するよう改善 |
| 2026-03-28 | 1.7 | アプリ名を Tasgy → IssueBoard に変更。package.json name/description、Sidebar タイトル、index.html title、vite base path、localStorage キーを更新 |
| 2026-03-28 | 1.8 | `hierarchy.js` を新規追加。`updateIssueBody` API を追加。App.jsx に `hierarchy` 状態を追加。IssueTable にツリー表示（展開/折りたたみ）を実装。IssueDetailPanel に親課題リンク・サブタスク一覧・進捗バーを追加。NewTaskModal に親課題選択 + 親本文自動追記を追加。TaskCard にサブタスク進捗バーを追加。GanttChart に「親課題」グルーピングを追加 |
| 2026-03-28 | 1.9 | IssueTable: フィルター・検索適用時にツリーをフラット表示にフォールバック。NewTaskModal: 親本文更新失敗時に子 Issue 作成済みとして一覧再取得 + 紐付け失敗のみ通知 |
| 2026-03-28 | 2.0 | `fetchAllIssues` API を追加。App.jsx に `allIssues` 状態を追加し、`hierarchy` を全 Issue ベースで構築。IssueDetailPanel / GanttChart / NewTaskModal で親参照を `allIssues` から取得するよう変更 |
| 2026-03-28 | 2.1 | GanttChart: グルーピング「なし」時にツリー表示（親→子インデント、展開折りたたみ、親サマリーバー）を実装。`collapsedParents` 状態を追加。`getParentBarRange` で子の日付範囲を算出。グルーピング戻り値を `items` → `treeItems` に統一 |
| 2026-03-28 | 2.2 | GanttChart の `renderRow` に `getDeadlineInfo` を追加。期限超過（🔥）と 3 日以内（⚠️）のアイコンを左列に表示。親行は対象外 |
| 2026-03-28 | 2.3 | GanttChart ツリー: Closed 親の Open 子を root として表示するよう修正。IssueDetailPanel: Closed 親も `allIssues` から `onSelectIssue` で詳細表示可能に修正。props から不要な `issues` を削除 |
| 2026-03-28 | 2.4 | IssueTable に `filterParentOnly` 状態を追加。フィルター処理順序に親タスクのみフィルターを追加。`isFiltering` 判定に `filterParentOnly` を含める |
| 2026-03-28 | 2.5 | `fetchMilestones`・`fetchMilestoneIssues` API を追加。`BurndownChart` コンポーネントを新規作成。Sidebar に `burndown` メニューを追加。App.jsx に `burndown` ビューを統合 |
| 2026-03-28 | 2.6 | BurndownChart の開始日を Milestone description の `開始日: YYYY-MM-DD` / `YYYY/MM/DD` で上書き可能に変更。未指定時は最古の Issue 作成日にフォールバック |
| 2026-03-29 | 2.7 | ラベル CRUD API（`createLabel` / `updateLabel` / `deleteLabel`）とマイルストーン CRUD API（`createMilestone` / `updateMilestone` / `deleteMilestone`）を追加。`SettingsView` コンポーネントを新規作成。Sidebar に `settings` メニューを追加 |
| 2026-03-29 | 3.0 | `setMilestone` / `setAssignees` / `fetchCollaborators` / `fetchIssueEvents` API を追加。`Dashboard` / `CalendarView` / `ActivityFeed` コンポーネントを新規作成。IssueDetailPanel にマイルストーン設定・担当者変更・関連課題リンクを追加。NewTaskModal にマイルストーン選択を追加。`parseRelatedNumbers` ユーティリティを追加。デフォルトビューをダッシュボードに変更 |
| 2026-03-29 | 3.1 | IssueDetailPanel: Closed Milestone が候補外の場合に補完表示するよう修正。BurndownChart: `totalDays === 0` のガード除去、`effectiveTotalDays = Math.max(totalDays, 1)` でゼロ除算を防止 |
| 2026-03-29 | 3.2 | App.jsx: ダッシュボードビューに `detailPanel` を統合。課題クリックで右側に詳細パネル表示 |
| 2026-03-29 | 3.3 | ドキュメント整備: サイドバーのナビゲーション一覧を 8 メニューに更新。`activeView` の型定義・デフォルト値を `'dashboard'` に修正。コンポーネントツリーに全 8 ビューを反映 |
| 2026-03-29 | 3.4 | `verifyToken` を 2 段階検証（ユーザー認証 + リポジトリアクセス）に強化。`selectedIssue` の同期を `allIssues` からも探すよう修正。ActivityFeed に表示範囲の説明を追加 |

---

## 1. システム概要

### 1.1 目的

GitHub Issues をデータソースとして、Backlog 風のプロジェクト管理 UI を提供する。
課題一覧・ボード・ガントチャートの 3 つのビューで Issue を閲覧・操作できる。

### 1.2 技術スタック

| 項目 | バージョン | 用途 |
|------|-----------|------|
| React | 19.2.4 | UI フレームワーク |
| Vite | 8.0.1 | ビルドツール |
| Tailwind CSS | 4.2.2 | スタイリング |
| @tailwindcss/typography | 0.5.19 | Markdown 用タイポグラフィ |
| react-markdown | 10.1.0 | Markdown レンダリング |
| remark-gfm | 4.0.1 | GitHub Flavored Markdown プラグイン |

### 1.3 ビルド構成

```javascript
// vite.config.js
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/issueboard/',
})
```

| コマンド | 動作 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド（`dist/` に出力） |
| `npm run preview` | ビルド済みファイルのプレビュー |
| `npm run lint` | ESLint 実行 |

### 1.4 環境変数

| 変数名 | 必須 | 説明 | 使用箇所 |
|--------|------|------|---------|
| `VITE_REPO_OWNER` | ○ | GitHub リポジトリオーナー名 | `api/github.js`, `ProjectHeader.jsx`, `IssueDetailPanel.jsx` |
| `VITE_REPO_NAME` | ○ | GitHub リポジトリ名 | 同上 |

---

## 2. アーキテクチャ

### 2.1 ファイル構成

```
src/
├── main.jsx                  # エントリーポイント（StrictMode でレンダー）
├── App.jsx                   # ルートコンポーネント（全状態管理）
├── index.css                 # Tailwind CSS 設定 + テーマ変数
├── api/
│   └── github.js             # GitHub REST API ラッパー（全 API 関数）
├── utils/
│   ├── labels.js             # ラベル分類・判定ユーティリティ
│   ├── deadline.js           # 期限パース・表示ユーティリティ
│   └── hierarchy.js          # 親子課題パース・ツリー構築ユーティリティ
└── components/
    ├── TokenInput.jsx        # ログイン画面
    ├── Sidebar.jsx           # 左サイドバー
    ├── ProjectHeader.jsx     # 上部ヘッダー
    ├── IssueTable.jsx        # 課題一覧テーブル
    ├── IssueDetailPanel.jsx  # 課題詳細パネル
    ├── BoardView.jsx         # ボードビュー（カンバン + D&D）
    ├── GanttChart.jsx        # ガントチャートビュー
    ├── BurndownChart.jsx     # バーンダウンチャートビュー
    ├── Dashboard.jsx         # ダッシュボード
    ├── CalendarView.jsx      # カレンダービュー
    ├── ActivityFeed.jsx      # 更新履歴フィード
    ├── SettingsView.jsx      # 設定画面（ラベル・マイルストーン管理）
    ├── TaskCard.jsx          # ボード用カード
    ├── NewTaskModal.jsx      # 新規課題作成モーダル
    └── CommentForm.jsx       # コメント入力フォーム
```

### 2.2 コンポーネントツリー

```
App
├── TokenInput                     # token === null の場合のみ表示
│
├── Sidebar                        # 常時表示（8 メニュー）
├── ProjectHeader                  # 常時表示
│
├── [activeView === 'dashboard']   # デフォルトビュー
│   ├── Dashboard
│   └── IssueDetailPanel           # 課題クリック時
│
├── [activeView === 'issues']
│   ├── IssueTable                 # ツリー表示対応
│   └── IssueDetailPanel           # selectedIssue !== null の場合
│       ├── CommentForm
│       └── (Markdown rendering)
│
├── [activeView === 'board']
│   └── BoardView
│       └── TaskCard × N           # draggable
│
├── [activeView === 'gantt']
│   ├── GanttChart                 # ツリー表示・親サマリーバー対応
│   └── IssueDetailPanel
│
├── [activeView === 'calendar']
│   ├── CalendarView               # 月表示
│   └── IssueDetailPanel
│
├── [activeView === 'burndown']
│   └── BurndownChart              # Milestone ベース
│
├── [activeView === 'activity']
│   ├── ActivityFeed               # イベントタイムライン
│   └── IssueDetailPanel
│
├── [activeView === 'settings']
│   └── SettingsView               # ラベル・マイルストーン CRUD
│
└── NewTaskModal                   # showNewTask === true の場合
```

### 2.3 データフロー

```
┌────────────────────────────────────────────────────┐
│ App.jsx（状態管理）                                   │
│                                                    │
│  loadData()                                        │
│  ├── fetchIssues() ──→ issues                      │
│  ├── selectedIssue を最新 issues から同期           │
│  └── fetchLabels() ──→ classifyLabels()            │
│       ├── priorityLabels                           │
│       ├── categoryLabels                           │
│       └── statusLabels                             │
│                                                    │
│  ┌─────────┐  ┌────────────┐  ┌──────────────┐    │
│  │ Sidebar │  │ IssueTable │  │ BoardView    │    │
│  │         │  │            │  │              │    │
│  │ view    │  │ issues     │  │ issues       │    │
│  │ change  │  │ labels     │  │ labels       │    │
│  │ ──→     │  │ ──→ select │  │ ──→ D&D      │    │
│  │activeView│  │   issue   │  │   setLabels  │    │
│  └─────────┘  └────────────┘  └──────────────┘    │
│                     │                   │          │
│                     ▼                   ▼          │
│            IssueDetailPanel         onUpdate()     │
│            ├── setLabels()          ──→ loadData() │
│            ├── closeIssue()                        │
│            └── addComment()                        │
└────────────────────────────────────────────────────┘
```

---

## 3. 状態管理

### 3.1 App.jsx - ルート状態

| 状態変数 | 型 | 初期値 | 説明 |
|---------|-----|--------|------|
| `token` | `string \| null` | `localStorage.getItem('github_token')` | GitHub PAT |
| `issues` | `Issue[]` | `[]` | 全 Open Issue のリスト |
| `priorityLabels` | `LabelDef[]` | `[]` | description に "priority" を含むラベル |
| `categoryLabels` | `LabelDef[]` | `[]` | description に "category" を含むラベル |
| `statusLabels` | `LabelDef[]` | `[]` | description に "status" を含むラベル |
| `loading` | `boolean` | `false` | データ取得中フラグ |
| `error` | `string \| null` | `null` | エラーメッセージ |
| `activeView` | `'dashboard' \| 'issues' \| 'board' \| 'gantt' \| 'calendar' \| 'burndown' \| 'activity' \| 'settings'` | `'dashboard'` | 現在のビュー |
| `selectedIssue` | `Issue \| null` | `null` | 選択中の Issue |
| `showNewTask` | `boolean` | `false` | モーダル表示フラグ |

### 3.2 IssueTable - ローカル状態

| 状態変数 | 型 | 初期値 | 説明 |
|---------|-----|--------|------|
| `sortKey` | `string` | `'created'` | ソートキー |
| `sortAsc` | `boolean` | `false` | ソート方向（true: 昇順） |
| `filterPriority` | `string` | `'all'` | 優先度フィルター |
| `filterCategory` | `string` | `'all'` | カテゴリフィルター |
| `filterStatus` | `string` | `'all'` | ステータスフィルター |
| `filterAssignee` | `string` | `'all'` | 担当者フィルター（`'all'` / `'__unassigned__'` / login 名） |
| `filterParentOnly` | `boolean` | `false` | 親タスクのみフィルター。`hierarchy.childrenMap.has(number)` で判定 |
| `searchQuery` | `string` | `''` | 検索キーワード |

**算出値**:
- `assignees`: Issue から重複なしで担当者一覧を抽出（`useMemo`）

### 3.3 BoardView - ローカル状態

| 状態変数 | 型 | 初期値 | 説明 |
|---------|-----|--------|------|
| `groupBy` | `'status' \| 'priority'` | `'status'` | グルーピング基準 |
| `filterAssignee` | `string` | `'all'` | 担当者フィルター |
| `draggingIssue` | `Issue \| null` | `null` | カード D&D: ドラッグ中の Issue |
| `dragOverColumn` | `string \| null` | `null` | カード D&D: ドロップ先の列キー |
| `updating` | `boolean` | `false` | API 更新中フラグ |
| `draggingColumnKey` | `string \| null` | `null` | 列ヘッダー D&D: ドラッグ中の列キー |
| `dragOverHeaderKey` | `string \| null` | `null` | 列ヘッダー D&D: ドロップ先の列キー |
| `statusOrder` | `string[] \| null` | `localStorage` | ステータス列の並び順（キー配列） |
| `priorityOrder` | `string[] \| null` | `localStorage` | 優先度列の並び順（キー配列） |

**算出値**:
- `assignees`: Issue から重複なしで担当者一覧を抽出（`useMemo`）
- `filteredIssues`: `filterAssignee` を適用した Issue 配列（`useMemo`）
- `orderedLabels`: カスタム順序を適用したラベル配列（`useMemo`）。`applyCustomOrder()` で保存済み順序を反映

**列並び替えの永続化**:
- `localStorage` キー: `issueboard_status_order`（ステータス）/ `issueboard_priority_order`（優先度）
- 値: ラベルキーの JSON 配列（例: `["未対応","処理中","処理済み"]`）
- ドロップ成功時に `saveLabelOrder()` で保存、初回読み込み時に `loadSavedOrder()` で復元

### 3.4 IssueDetailPanel - ローカル状態

| 状態変数 | 型 | 初期値 | 説明 |
|---------|-----|--------|------|
| `comments` | `Comment[] \| null` | `null` | コメント一覧（null = 未取得） |
| `operating` | `boolean` | `false` | API 操作中フラグ |
| `fetchedRef` | `Ref<number>` | `null` | 最後に取得した Issue 番号 |

---

## 4. データ型定義

### 4.1 GitHub API レスポンス

```typescript
// Issue（GitHub API から取得）
interface Issue {
  id: number
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed'
  created_at: string            // ISO 8601
  assignee: {
    login: string
    avatar_url: string
  } | null
  labels: {
    id: number
    name: string
    color: string               // "d73a4a"（# なし）
    description: string | null
  }[]
  pull_request?: object         // 存在する場合は PR → フィルタで除外
}

// Comment（GitHub API から取得）
interface Comment {
  id: number
  body: string
  created_at: string            // ISO 8601
  user: {
    login: string
    avatar_url: string
  }
}

// Label（GitHub API から取得）
interface GitHubLabel {
  id: number
  name: string
  color: string                 // "d73a4a"（# なし）
  description: string | null
}
```

### 4.2 アプリ内データ型

```typescript
// 分類済みラベル（優先度・ステータス用）
interface LabelDef {
  name: string
  color: string                 // "#d73a4a"（# あり）
  key: string                   // name と同値
  order: number                 // description の "keyword:N" から抽出（省略時は Infinity）
  _idx: number                  // 配列内の出現順インデックス（安定ソート用）
}

// 分類済みラベル（カテゴリ用）
interface CategoryLabelDef {
  name: string
  color: string                 // "#d73a4a"（# あり）
}

// 期限情報
interface DeadlineInfo {
  label: string                 // "M/D"
  status: 'overdue' | 'soon' | 'normal'
  text: string                  // "🔥 M/D（X日超過）" 等
}
```

---

## 5. API 層

### 5.1 共通仕様

| 項目 | 値 |
|------|-----|
| ベース URL | `https://api.github.com` |
| 認証ヘッダー | `Authorization: token {PAT}` |
| Accept ヘッダー | `application/vnd.github.v3+json` |
| Content-Type | `application/json` |
| エラー処理 | `GitHub API エラー ({status}): {body}` 形式で throw |
| 204 レスポンス | `null` を返す |

### 5.2 API 関数一覧

#### `fetchIssues(): Promise<Issue[]>`

```
GET /repos/{owner}/{repo}/issues?state=open&per_page=100&page={n}
```

- ページネーション: 100 件/ページ、全件取得するまでループ
- Pull Request を除外（`pull_request` フィールドがないもののみ返す）

#### `fetchAllIssues(): Promise<Issue[]>`

```
GET /repos/{owner}/{repo}/issues?state=all&per_page=100&page={n}
```

- Open + Closed の全 Issue を取得（親子関係構築用）
- ページネーション・PR 除外は `fetchIssues` と同様

#### `fetchLabels(): Promise<GitHubLabel[]>`

```
GET /repos/{owner}/{repo}/labels?per_page=100&page={n}
```

- ページネーション: 100 件/ページ、全件取得するまでループ

#### `fetchComments(issueNumber): Promise<Comment[]>`

```
GET /repos/{owner}/{repo}/issues/{number}/comments?per_page=100
```

#### `addComment(issueNumber, body): Promise<Comment>`

```
POST /repos/{owner}/{repo}/issues/{number}/comments
Body: { body: string }
```

#### `closeIssue(issueNumber): Promise<Issue>`

```
PATCH /repos/{owner}/{repo}/issues/{number}
Body: { state: "closed" }
```

#### `setLabels(issueNumber, labelNames): Promise<Label[]>`

```
PUT /repos/{owner}/{repo}/issues/{number}/labels
Body: { labels: string[] }
```

- **注意**: 既存ラベルを全置換する。呼び出し前に保持したいラベルも含めて渡す必要がある。

#### `createIssue(title, body, labels): Promise<Issue>`

```
POST /repos/{owner}/{repo}/issues
Body: { title: string, body: string, labels: string[] }
```

#### `updateIssueBody(issueNumber, body): Promise<Issue>`

```
PATCH /repos/{owner}/{repo}/issues/{number}
Body: { body: string }
```

- 親課題の本文にサブタスク行を追記する際に使用

#### `fetchMilestones(): Promise<Milestone[]>`

```
GET /repos/{owner}/{repo}/milestones?state=all&per_page=100&page={n}
```

- Open + Closed の全 Milestone を取得

#### `fetchMilestoneIssues(milestoneNumber): Promise<Issue[]>`

```
GET /repos/{owner}/{repo}/issues?milestone={number}&state=all&per_page=100&page={n}
```

- 指定 Milestone に属する全 Issue（Open + Closed）を取得
- PR 除外

#### `verifyToken(token): Promise<boolean>`

```
GET /user
Authorization: token {token}
```

- `res.ok` を返す（true/false）
- 他の API 関数と異なり、`request()` ラッパーを使わない

---

## 6. ユーティリティ

### 6.1 ラベル分類（labels.js）

#### `classifyLabels(githubLabels)`

GitHub API から取得したラベル配列を受け取り、description フィールドの内容で 3 種類に分類する。

```
入力: GitHubLabel[]
出力: {
  priorityLabels: LabelDef[]    // description に "priority" を含む（order 昇順でソート済み）
  categoryLabels: CategoryLabelDef[]  // description に "category" を含む
  statusLabels: LabelDef[]      // description に "status" を含む（order 昇順でソート済み）
}
```

- description の判定は小文字化（`.toLowerCase()`）後に `.includes()` で行う
- color は `'#' + label.color` で変換（GitHub API は `#` なしで返す）
- `parseOrder(desc, keyword)`: description から `keyword:N` の `N` を抽出。なければ `Infinity`
- 各ラベルに `_idx`（配列内の出現順インデックス）を付与
- priorityLabels と statusLabels は安定ソート（`order` 昇順、同一 `order` の場合は `_idx` 昇順）でソートされる。これにより `status:N` 未指定時も GitHub API の返却順が維持される
- `priority` と `category` と `status` の判定は `if/else if` のため、同時に複数に該当した場合は最初にマッチした分類のみに属する（判定順: priority → category → status）

#### `getPriorityKey(issue, priorityLabels)`

Issue のラベルから優先度キーを返す。マッチしない場合は `null` を返す。未設定の Issue はボードでは「未設定」列に分類され、フィルターやソートでは末尾に配置される。

#### `getStatusKey(issue, statusLabels)`

同上（ステータス版）。マッチしない場合は `null` を返す。

#### `getPriorityLabel(issue, priorityLabels)` / `getStatusLabel(issue, statusLabels)` / `getCategoryLabel(issue, categoryLabels)`

Issue のラベルからマッチするラベル定義オブジェクトを返す。マッチしない場合は `null`。

### 6.2 期限処理（deadline.js）

#### `parseDeadline(body)`

```
入力: string | null（Issue 本文）
出力: Date | null
正規表現: /📅\s*期限[:：]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/
```

- `/` を `-` に変換後、`YYYY-MM-DDT00:00:00` でパース
- `isNaN` チェック後、無効な場合は `null`

#### `getDeadlineInfo(deadline)`

```
入力: Date | null
出力: DeadlineInfo | null
```

| 判定 | status | text |
|------|--------|------|
| `diffDays < 0` | `'overdue'` | `🔥 M/D（X日超過）` |
| `diffDays <= 3` | `'soon'` | `⚠️ M/D（あとX日）` |
| `diffDays > 3` | `'normal'` | `📅 M/D` |

- `diffDays` は当日 00:00:00 基準で `Math.ceil()` で算出

#### `insertDeadlineToBody(body, dateStr)`

```
入力: body (string), dateStr (string "YYYY-MM-DD")
出力: string（期限行 + 改行2つ + body）
```

- `dateStr` が空の場合、body をそのまま返す
- body が空の場合、期限行のみ返す

---

### 6.3 親子課題処理（hierarchy.js）

#### `parseChildNumbers(body)`

```
入力: string | null（Issue 本文）
出力: number[]（子 Issue 番号の配列）
正規表現: /^-\s*\[[ x]\]\s*#(\d+)/gm
```

#### `buildHierarchy(issues)`

```
入力: Issue[]（全 Issue）
出力: {
  parentMap: Map<number, number>     // 子番号 → 親番号
  childrenMap: Map<number, number[]> // 親番号 → 子番号配列
}
```

- 全 Issue の本文を走査して `- [ ] #N` / `- [x] #N` を抽出
- App.jsx で `useMemo(() => buildHierarchy(allIssues), [allIssues])` として構築（Closed な親も含む全 Issue ベース）

#### `flattenTree(issues, hierarchy)`

```
入力: Issue[], { parentMap, childrenMap }
出力: { issue, depth, isParent, childCount?, parentNumber? }[]
```

- 親→子の順にフラット化（子は `depth: 1`）
- 他の Issue の子でない Issue が `depth: 0`（ルート）
- **注意**: フィルター・検索適用時は IssueTable 側で `flattenTree` を使わず、全 Issue を `depth: 0` のフラット配列にフォールバックする（親がフィルターで除外されると子も消える問題を回避）

#### `getSubtaskProgress(body)`

```
入力: string | null
出力: { done: number, total: number } | null
```

- `- [x] #N` の数を done、`- [ ] #N` + `- [x] #N` の数を total
- タスクリストが本文にない場合は `null`

#### `appendChildToBody(body, childNumber)`

```
入力: body (string), childNumber (number)
出力: string（タスクリスト行が追記された本文）
```

- 既にタスクリストがあれば最後の行の後に `- [ ] #N` を追記
- なければ `### サブタスク\n- [ ] #N` を末尾に追加

---

## 7. コンポーネント仕様

### 7.1 TokenInput

| Props | 型 | 説明 |
|-------|-----|------|
| `onTokenSet` | `(token: string) => void` | 検証成功時のコールバック |

**処理フロー**:
1. ユーザーがトークンを入力
2. 送信時に `verifyToken()` を呼び出し
3. 有効なら `onTokenSet()` を呼び出し
4. 無効なら「トークンが無効です」エラー表示
5. 通信失敗なら「接続エラーが発生しました」エラー表示

### 7.2 Sidebar

| Props | 型 | 説明 |
|-------|-----|------|
| `activeView` | `string` | 現在のビューキー |
| `onViewChange` | `(view: string) => void` | ビュー変更コールバック |
| `onAdd` | `() => void` | 課題追加ボタンのコールバック |

**ナビゲーション項目**:

| キー | 名前 | アイコン |
|------|------|---------|
| `issues` | 課題 | 📋 |
| `board` | ボード | 📊 |
| `gantt` | ガントチャート | 📅 |

### 7.3 ProjectHeader

| Props | 型 | 説明 |
|-------|-----|------|
| `activeView` | `string` | ビュー名表示用 |
| `issueCount` | `number` | Issue 件数（0 件を含め常時表示） |
| `onLogout` | `() => void` | ログアウト処理 |
| `onRefresh` | `() => void` | データ再取得 |
| `loading` | `boolean` | 読み込み中フラグ |

**ビュー名マッピング**:

| キー | 表示名 |
|------|--------|
| `issues` | 課題 |
| `board` | ボード |
| `gantt` | ガントチャート |

### 7.4 IssueTable

| Props | 型 | 説明 |
|-------|-----|------|
| `issues` | `Issue[]` | 全 Issue |
| `priorityLabels` | `LabelDef[]` | 優先度ラベル定義 |
| `categoryLabels` | `CategoryLabelDef[]` | カテゴリラベル定義 |
| `statusLabels` | `LabelDef[]` | ステータスラベル定義 |
| `onSelectIssue` | `(issue: Issue) => void` | 行クリック時 |
| `selectedIssueId` | `number \| undefined` | 選択中の Issue ID |

**ソートキーと比較ロジック**:

| キー | 比較方法 |
|------|---------|
| `number` | `a.number - b.number` |
| `title` | `localeCompare('ja')` |
| `priority` | 優先度配列のインデックス順 |
| `status` | ステータス配列のインデックス順 |
| `category` | カテゴリ名の `localeCompare('ja')` |
| `assignee` | `login` の `localeCompare()` |
| `deadline` | `Date.getTime()` 比較（期限なしは `Infinity`） |
| `created` | `Date` の昇順比較（`a - b`）、初期状態 `sortAsc=false` で降順表示 |

**フィルター処理順序**:
1. 優先度フィルター
2. ステータスフィルター
3. 担当者フィルター
4. 親タスクのみフィルター
5. カテゴリフィルター
6. キーワード検索
7. ソート

**条件付き列表示**:
- 「状態」列: `statusLabels.length > 0` の場合のみ表示
- `colSpan` も動的に調整

### 7.5 IssueDetailPanel

| Props | 型 | 説明 |
|-------|-----|------|
| `issue` | `Issue` | 表示対象の Issue |
| `priorityLabels` | `LabelDef[]` | 優先度ラベル定義 |
| `categoryLabels` | `CategoryLabelDef[]` | カテゴリラベル定義 |
| `statusLabels` | `LabelDef[]` | ステータスラベル定義 |
| `onClose` | `() => void` | パネルを閉じる |
| `onUpdate` | `() => void` | データ再取得 |

**コメント取得**:
- `useEffect` で `issue.number` が変わった時に自動取得
- `fetchedRef` で重複取得を防止
- 取得中は `null`、取得後は `Comment[]`

**ラベル変更処理**（`handleLabelChange`）:
1. 現在の Issue のラベル一覧を取得
2. 変更対象グループのラベルを除去
3. 新しいラベルを追加
4. `setLabels()` API で更新
5. `onUpdate()` で親に再取得を通知

**Issue クローズ処理**:
1. `confirm()` で確認
2. `closeIssue()` API 呼び出し
3. `onUpdate()` + `onClose()` で詳細パネルを閉じる

### 7.6 BoardView

| Props | 型 | 説明 |
|-------|-----|------|
| `issues` | `Issue[]` | 全 Issue |
| `priorityLabels` | `LabelDef[]` | 優先度ラベル定義 |
| `statusLabels` | `LabelDef[]` | ステータスラベル定義 |
| `onUpdate` | `() => void` | データ再取得 |
| `onSelectIssue` | `(issue: Issue) => void` | カードクリック時 |
| `selectedIssueId` | `number \| undefined` | 選択中の Issue ID |

**グルーピング切替**:
- `statusLabels.length === 0` の場合は優先度別固定
- それ以外はステータス別（デフォルト）/ 優先度別を切替可能

**列の表示順序**: 未設定列（先頭固定） → ラベル列（カスタム順序 or デフォルト `order` 昇順）

**列ヘッダー D&D**:
- 列ヘッダーをドラッグ&ドロップで並び替え可能
- 未設定列は並び替え対象外（常に先頭）
- ドロップ時に `applyCustomOrder()` の結果を即座に反映し、`saveLabelOrder()` で永続化

**未設定列**:
- 優先度/ステータスラベルが付いていない Issue は「未設定」列（グレー `#9ca3af`）に分類
- 未設定列は**先頭**に配置される
- 未設定列の Issue はドラッグ不可（`draggable={false}`）
- 未設定列へのドロップも不可（ラベルを外す操作は未サポート）
- 未設定 Issue が 0 件の場合、未設定列は表示しない

**ドラッグ & ドロップ処理フロー**:

```
1. handleDragStart(e, issue)
   └── draggingIssue に issue をセット

2. handleDragEnter(e, columnKey)
   └── dragCounterRef をインクリメント
   └── dragOverColumn をセット

3. handleDragOver(e)
   └── e.preventDefault()（ドロップを許可）

4. handleDragLeave(e, columnKey)
   └── dragCounterRef をデクリメント
   └── 0 以下になったら dragOverColumn をクリア

5. handleDrop(e, targetColumn)
   ├── 未設定列の場合 → 何もしない
   ├── 同じ列の場合 → 何もしない
   ├── updating 中 → 何もしない
   └── ラベル変更処理:
       ├── 対象グループのラベルを除去
       ├── 新ラベルを追加
       ├── setLabels() API 呼び出し
       └── onUpdate() で再取得

6. handleDragEnd()
   └── 全ドラッグ状態をリセット
```

**dragCounterRef の目的**:
- HTML5 D&D では子要素の出入りで `dragenter`/`dragleave` が発火する
- カウンターで列全体からの leave を正確に判定

### 7.7 GanttChart

| Props | 型 | 説明 |
|-------|-----|------|
| `issues` | `Issue[]` | 全 Issue |
| `priorityLabels` | `LabelDef[]` | 優先度ラベル定義 |
| `categoryLabels` | `CategoryLabelDef[]` | カテゴリラベル定義 |
| `statusLabels` | `LabelDef[]` | ステータスラベル定義 |
| `onSelectIssue` | `(issue: Issue) => void` | 行クリック時 |
| `selectedIssueId` | `number \| undefined` | 選択中の Issue ID |

**ローカル状態**:

| 状態変数 | 型 | 初期値 | 説明 |
|---------|-----|--------|------|
| `scaleKey` | `'day' \| 'week' \| 'month' \| 'quarter'` | `'day'` | スケール |
| `groupByKey` | `'none' \| 'assignee' \| 'priority' \| 'category'` | `'none'` | グルーピング |

**スケール定義**:

| キー | 名前 | カラム幅 | 下段ヘッダー | 上段ヘッダー |
|------|------|---------|------------|------------|
| `day` | 日 | 40px | 日にちの数字 | `YYYY/M` |
| `week` | 週 | 50px | `M/D`（月曜始まり） | `YYYY/M` |
| `month` | 月 | 60px | `M月` | `YYYY` |
| `quarter` | 四半期 | 80px | `YYYY QN` | なし |

**レイアウト定数**:

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `rowHeight` | 40px | 1 行の高さ |
| `groupRowHeight` | 32px | グループ見出し行の高さ |
| `labelWidth` | 320px | 左列幅 |

**タイムライン範囲計算**（`useMemo`）:
1. 全 Issue の `created_at` と `deadline` から最小・最大日付を算出
2. 今日の日付も含める
3. 最小日付 - 3 日 〜 最大日付 + 7 日を表示範囲とする
4. `totalDays = Math.ceil((maxDate - minDate) / 86400000) + 1`（両端を含む）
5. Issue が 0 件の場合: 今日 - 7 日 〜 今日 + 30 日（38 日間）

**グルーピング**（`useMemo`）:
- `groupByKey` に応じて Issue をグループ化
- `assignee`: `issue.assignee.login`（未設定は「未設定」）
- `priority`: 優先度ラベル名（未設定は「未設定」）
- `category`: カテゴリラベル名（未設定は「未設定」）
- `none`: グルーピングなし（`groupName: null`）
- グループ見出し行にグループ名 + 件数を表示

**ヘッダー生成**（`useMemo`）:
- スケールに応じてカラムと上段ヘッダーを動的生成
- 日スケール: 上段に月、下段に日
- 週スケール: 上段に月、下段に週（月曜始まり）
- 月スケール: 上段に年、下段に月
- 四半期スケール: 下段のみ（`YYYY QN`）

**バー位置計算**（`dateToPx`）:
- 日スケール: `dayOffset × colWidth`
- 他のスケール: `(dayOffset / totalDays) × chartWidth` で比例配置

**左列の内容**:
- 優先度ドット + `#番号` + タイトル + ステータスバッジ + 担当者アバター

### 7.8 TaskCard

| Props | 型 | 説明 |
|-------|-----|------|
| `issue` | `Issue` | 表示対象の Issue |
| `isDragging` | `boolean` | ドラッグ中フラグ |
| `isSelected` | `boolean` | 選択中フラグ |
| `excludeLabels` | `LabelDef[] \| undefined` | バッジ表示から除外するラベル群 |

**選択状態の表示**:
- `isSelected === true` の場合、カードに青ボーダー + 青背景 + リングを適用
- ドラッグ中のスタイルが優先される

**ラベルバッジ表示**:
- `issue.labels` から `color !== 'ededed'` かつ `excludeLabels` に含まれないラベルを抽出
- 色付き丸バッジとして表示
- BoardView から呼ばれる場合、列のグルーピングに使用しているラベル群が `excludeLabels` として渡される（列見出しとカード内バッジの二重表示を防止）

### 7.9 NewTaskModal

| Props | 型 | 説明 |
|-------|-----|------|
| `priorityLabels` | `LabelDef[]` | 優先度ラベル定義 |
| `categoryLabels` | `CategoryLabelDef[]` | カテゴリラベル定義 |
| `statusLabels` | `LabelDef[]` | ステータスラベル定義 |
| `onClose` | `() => void` | モーダルを閉じる |
| `onCreated` | `() => void` | 作成完了時 |

**作成処理**:
1. 選択されたラベル名を配列に集約
2. `insertDeadlineToBody()` で期限を本文に挿入
3. `createIssue(title, body, labels)` API 呼び出し
4. 成功時: `onCreated()` で親に通知
5. 失敗時: `alert()` でエラー表示

**条件付きフィールド表示**:
- ステータスボタン: `statusLabels.length > 0` の場合のみ
- 優先度ボタン: `priorityLabels.length > 0` の場合のみ
- カテゴリドロップダウン: `categoryLabels.length > 0` の場合のみ

### 7.10 CommentForm

| Props | 型 | 説明 |
|-------|-----|------|
| `issueNumber` | `number` | 対象 Issue 番号 |
| `onCommentAdded` | `(comment: Comment) => void` | 追加成功時 |

---

## 8. 画面遷移

```
[トークン未設定]
    │
    ▼
TokenInput ──(検証成功)──→ App（メイン画面）
                            │
                            ├── Sidebar クリック
                            │   ├── 課題 ──→ IssueTable + IssueDetailPanel
                            │   ├── ボード ──→ BoardView
                            │   └── ガント ──→ GanttChart
                            │
                            ├── 「+ 課題を追加」──→ NewTaskModal
                            │   ├── 作成 ──→ モーダル閉じ + データ再取得
                            │   └── キャンセル ──→ モーダル閉じ
                            │
                            ├── IssueTable 行クリック ──→ IssueDetailPanel 表示
                            │   ├── ✕ ──→ パネル閉じ
                            │   ├── 完了 ──→ Issue Close + パネル閉じ + 再取得
                            │   ├── ラベル変更 ──→ API 更新 + 再取得
                            │   └── GitHubで開く ──→ 新タブで GitHub Issue ページ
                            │
                            ├── BoardView カードクリック ──→ IssueDetailPanel 表示
                            ├── BoardView D&D ──→ ラベル変更 API + 再取得
                            │
                            ├── GanttChart 行クリック ──→ IssueDetailPanel 表示
                            │
                            ├── 更新ボタン ──→ データ再取得
                            │
                            └── ログアウト ──→ TokenInput
```

---

## 9. スタイル設計

### 9.1 CSS 設定

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

### 9.2 テーマカラー変数

| 変数名 | 値 | 用途 |
|--------|-----|------|
| `--color-urgent` | #d73a4a | 緊急 |
| `--color-this-week` | #fbca04 | 今週 |
| `--color-next-week` | #0075ca | 次週以降 |
| `--color-waiting` | #f9d0c4 | 確認待ち |
| `--color-on-hold` | #e4e669 | 保留 |
| `--color-accounting` | #0e8a16 | 経理総務 |
| `--color-hr` | #d876e3 | 採用労務 |
| `--color-it` | #006b75 | 情シス |
| `--color-hr-system` | #5319e7 | 人事制度 |
| `--color-corporate` | #c5def5 | コーポレート |

**注意**: これらのテーマ変数は現在 CSS 内で定義されているが、コンポーネントでは GitHub API から取得したラベル色を直接使用しているため、実質的には未使用。

### 9.3 フォント設定

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
  "Hiragino Sans", "Noto Sans JP", sans-serif;
```

### 9.4 主要レイアウトサイズ

| 要素 | サイズ |
|------|--------|
| サイドバー | 幅 224px（`w-56`） |
| ヘッダー | 高さ 56px（`h-14`） |
| 詳細パネル | 幅 420px |
| ボード列 | 幅 320px（`w-80`） |
| モーダル | 最大幅 512px（`max-w-lg`） |
| ガントの左列 | 幅 240px |
| ガントの 1 日 | 幅 40px |
| ガントの行 | 高さ 40px |

---

## 10. エラーハンドリング

| 箇所 | エラー処理 |
|------|-----------|
| API 共通（`request()`） | `GitHub API エラー ({status}): {body}` を throw |
| トークン未設定 | `トークンが設定されていません` を throw |
| トークン検証失敗 | 画面にエラーメッセージ表示 |
| データ取得失敗 | `error` 状態に格納 → 画面に表示 + 再試行ボタン |
| ラベル変更失敗 | `alert()` でエラー表示 |
| Issue クローズ失敗 | `alert()` でエラー表示 |
| コメント送信失敗 | `alert()` でエラー表示 |
| 課題作成失敗 | `alert()` でエラー表示 |
| コメント取得失敗 | 空配列（`[]`）にフォールバック |

---

## 11. GitHub 側の設定手順

### 11.1 ラベル設定

リポジトリの **Settings → Labels** で各ラベルの Description を設定する。

| 分類 | Description に含める文字列 | 例 |
|------|--------------------------|-----|
| 優先度 | `priority` | 🔴 緊急（Description: `priority`） |
| カテゴリ | `category` | 🏢 経理総務（Description: `category`） |
| ステータス | `status` | 処理中（Description: `status`） |

### 11.2 アクセストークン設定

1. GitHub → Settings → Developer settings → Personal access tokens
2. Classic token を生成（`repo` スコープにチェック）
3. アプリのログイン画面でトークンを入力

### 11.3 期限の設定

Issue 本文の任意の位置に以下の形式で記載する:

```
📅 期限: 2026-04-15
```

新規課題作成モーダルの「期限」フィールドから設定した場合は本文の先頭に自動挿入される。
