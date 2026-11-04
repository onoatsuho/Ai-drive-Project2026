# TODOアプリ V1 要件定義書

既存の Express＋TypeScript＋EJS サイトに TODO 機能を追加するための要件を定める。
設計書(02_design.md)、実装手順書(03_implementation_plan.md)、テスト結果(04_test_results.md)は、この文書の REQ-01〜REQ-04 を参照する。

## 1 目的と対象範囲

### 1.1 目的

ブラウザから TODO の一覧表示・登録・完了切替・削除ができるようにする。データは Neon PostgreSQL に保存し、画面の操作は Fetch API で REST API へ送る。
完成時には、既存のトップページ `/` と DB 接続確認 `/api/db-check` を残したまま、画面 `/todo` と API `/api/v1/todos` が動く。

### 1.2 対象者

授業の受講者(自分)と、公開 URL を開いた人。認証がないため、公開 URL を知っていれば誰でも閲覧・変更・削除できる。

### 1.3 実装環境

| 項目 | 内容 |
| --- | --- |
| サーバー | Node.js＋Express 5＋TypeScript |
| 画面 | EJS テンプレート、ブラウザ側 JavaScript(Fetch API) |
| DB | 自分の Neon PostgreSQL。既存の `db.ts` の接続(`pool`)と環境変数 `DATABASE_URL` を使う |
| 公開先 | Vercel(Preview と Production) |
| リポジトリ | https://github.com/onoatsuho/Ai-drive-Project2026 |
| 作業ブランチ | `feature/todo-app` |

Preview と Production は同じ Neon DB を参照する。Preview で登録・削除したデータは Production からも見える。

### 1.4 V1 で作るもの

- TODO の一覧・登録・完了切替・削除(REQ-01〜REQ-04)
- 画面 `/todo`
- REST API `/api/v1/todos`(GET・POST・PATCH・DELETE)
- テーブル `todo_tasks` と、その作成 SQL(`sql/todo/020_create_todo_tasks.sql`)
- Local・Preview・Production のテスト記録

### 1.5 V1 で作らないもの

- 認証(ログイン)
- 優先度
- 絞り込み
- タイトルの更新

### 1.6 守ること

- 架空の授業用データだけを登録する。個人情報や重要な情報は登録しない。
- 接続文字列・パスワード・`.env` は Git に追加せず、AI にも渡さない。
- 既存の `/` と `/api/db-check` の動作を変えない。

## 2 機能要件

API の成功 JSON・エラー JSON の形式は第3章、ステータスとエラーコードは第4章による。

### 2.1 REQ-01 一覧取得

| 項目 | 内容 |
| --- | --- |
| 操作 | `/todo` を開く、または操作後に一覧を再取得する |
| API | `GET /api/v1/todos` |
| 入力 | なし |
| 結果 | 200。登録済みの TODO を id の昇順で `data` に配列として返す |
| エラー | DB 利用不可は 503、その他の内部エラーは 500 |

受け入れ条件:

- 1件以上あるとき、id の昇順で画面に表示される。
- 0件のとき、200 で `{"status":"success","data":[]}` が返り、`/todo` に「TODOがありません」と表示される。

確認方法: ブラウザで `/todo` を開く。`curl.exe -i` または開発者ツールの Network で `GET /api/v1/todos` のステータスと JSON を確認する。0件の確認は、初回の空 DB か講師が指定した隔離環境で行う。

完了と言える状態: データ0件なら GET の `data` が空配列になり、画面に「TODOがありません」と表示されること。

### 2.2 REQ-02 登録

| 項目 | 内容 |
| --- | --- |
| 操作 | タイトルを入力して追加ボタンを押す |
| API | `POST /api/v1/todos` |
| 入力 | JSON。例 `{"title":"課題を提出する"}` |
| 処理 | `title` の前後の空白を除き、1〜100文字であることを確認してから保存する。`isCompleted` は false で開始する |
| 結果 | 201。採番済みの TODO を `data` に返す |
| エラー | 400(JSON の構文エラー、`title` の欠落、`title` が文字列でない)、422(空白除去後の `title` が0文字、または101文字以上)、503/500 |

受け入れ条件:

- 前後に空白を付けて登録しても、保存値と応答の `title` は空白除去後の値になる。
- 登録後に一覧を再取得すると1件増えている。
- `title` の欠落・型違い・JSON の構文エラーは 400、空白だけ・101文字以上は 422 を返す。

確認方法: 画面から登録する。Console または `curl.exe -i` で、正常・`title` 欠落・空白だけ・101文字の4通りを送り、ステータスと JSON を確認する。

完了と言える状態: 正しい `title` を送ると 201 で ID 付きの TODO が返り、一覧に表示されること。

### 2.3 REQ-03 完了状態の部分更新

| 項目 | 内容 |
| --- | --- |
| 操作 | TODO の完了チェックボックスを切り替える |
| API | `PATCH /api/v1/todos/:id` |
| 入力 | パスの `:id`(1以上の整数)と JSON。例 `{"isCompleted":true}` |
| 処理 | 指定した TODO の完了状態だけを更新する。V1 では `title` を更新しない |
| 結果 | 200。更新後の TODO を `data` に返す |
| エラー | 400(ID の形式が不正、本文が空、`isCompleted` が真偽値でない)、404(形式は正しいが存在しない ID)、503/500 |

受け入れ条件:

- 登録時に返された ID を指定すると、その TODO だけの完了状態が変わる。
- ID の形式が不正、本文が空、`isCompleted` が真偽値でない場合は 400 を返す。
- 形式が正しく存在しない ID は 404 を返す。

確認方法: 画面でチェックボックスを切り替える。Console または `curl.exe -i` で、正常・存在しない ID・不正な ID 形式を送り、ステータスと JSON を確認する。

完了と言える状態: 登録時の ID へ `{"isCompleted":true}` を送ると 200 が返り、その行だけが完了になること。

### 2.4 REQ-04 削除

| 項目 | 内容 |
| --- | --- |
| 操作 | TODO の削除ボタンを押す |
| API | `DELETE /api/v1/todos/:id` |
| 入力 | パスの `:id`(1以上の整数)。本文なし |
| 結果 | 204。本文を返さない |
| エラー | 400(ID の形式が不正)、404(形式は正しいが存在しない ID)、503/500 |

受け入れ条件:

- 登録時に返された ID を削除すると、その行が一覧から消える。
- ID の形式が不正なら 400、形式が正しく存在しない ID なら 404 を返す。
- 同じ ID の削除を繰り返しても、最終状態(その行がない)は変わらない。2回目以降は 404 になる。

確認方法: 画面で削除ボタンを押す。Console または `curl.exe -i` で、正常・存在しない ID を送り、ステータスを確認する。

完了と言える状態: 登録時の ID を指定すると 204 が返り、その ID が一覧から消えること。

### 2.5 画面とブラウザ側の要件

- `/todo` は EJS テンプレートで表示する。
- タイトル入力欄(最大100文字)と追加ボタン、各 TODO の完了チェックボックスと削除ボタンを置く。
- 0件、処理中、入力エラー、通信エラーを画面に表示する。
- 一覧・登録・完了切替・削除は Fetch API で REST API へ送る。操作後は一覧を再取得し、ページの再読み込みなしで画面を更新する。
- TODO のタイトルは HTML として解釈させずに表示する(安全な表示)。
- API がエラーを返したときは、エラー JSON の `code` と `message` を使って画面に知らせる。
- DELETE の 204 では応答本文を JSON として読まない。
- 通信処理のクラス構成とメソッド名は設計書で決める。

## 3 データと API の共通仕様

### 3.1 テーブル

テーブル名は `todo_tasks` とする。

| 列 | 型・条件 | 目的 |
| --- | --- | --- |
| id | INTEGER、自動採番、主キー | 1件を識別 |
| title | TEXT、必須、前後の空白を除き1〜100文字 | TODO 本文 |
| is_completed | BOOLEAN、必須、初期値 false | 完了状態 |
| created_at | TIMESTAMPTZ、必須、初期値 NOW() | 作成日時 |

`title` はアプリ側で空白除去と1〜100文字の検証を行い、その結果を保存する。DB 側にも同じ文字数の CHECK 制約を付ける。
作成 SQL は `sql/todo/020_create_todo_tasks.sql` に保存し、Neon SQL Editor で手動実行する。push しただけでは SQL は実行されない。

### 3.2 API の JSON

- TODO の JSON は `{id, title, isCompleted, createdAt}` とする。JSON のキーは camelCase、DB の列は snake_case で、`is_completed` → `isCompleted`、`created_at` → `createdAt` に変換する。`createdAt` は日時の文字列で返す。
- GET・POST・PATCH の成功本文は `{"status":"success","data":...}` とする。
- GET で0件なら `{"status":"success","data":[]}` を返す。
- DELETE の 204 は本文を付けない。
- エラー本文は `{"status":"error","code":"...","message":"...","details":[]}` に統一する。
- 応答に SQL 文、DB 接続文字列、サーバー内部の詳細を含めない。詳細はサーバー側のログで確認する。

## 4 エラーと HTTP ステータス

| ステータス | code | 条件 |
| --- | --- | --- |
| 400 | BAD_REQUEST | JSON の構文エラー、必須項目の欠落、型違い、1以上の整数ではない ID、PATCH の空本文 |
| 422 | VALIDATION_ERROR | 空白除去後の `title` が0文字、または101文字以上 |
| 404 | NOT_FOUND | 形式が正しい ID に対応する TODO が存在しない |
| 500 | INTERNAL_ERROR | サーバー内部エラー、SQL 実行エラー |
| 503 | DB_UNAVAILABLE | DB 接続が利用できない |

400・422・404・500・503 はすべて第3章のエラー JSON を返す。JSON の構文エラーも HTML のエラー画面ではなく 400 の JSON を返す。

## 5 環境別の確認方法

### 5.1 確認する環境

| 環境 | URL | 確認する時点 |
| --- | --- | --- |
| Local | http://localhost:3000/todo | 実装中(`npm run dev`)と、ビルド後(`npm run build` → `npm start`) |
| Preview | `feature/todo-app` を push したときの Deployment URL(要確認) | PR のマージ前 |
| Production | https://ai-drive-project2026-eta.vercel.app/todo | PR を main にマージした後 |

### 5.2 確認する項目

各環境で次を確認し、URL・日時・結果を `docs/todo/04_test_results.md` に記録する。未実施の項目は空欄にせず「未実施」と理由を書く。

| テスト | 期待結果 |
| --- | --- |
| 0件の一覧 | 空 DB で 200、`data` が空配列、画面に「TODOがありません」 |
| 登録 | 201、ID 付きの TODO |
| 完了切替 | 200、その行の状態が変わる |
| 削除 | 204、本文なし |
| `title` 欠落 | 400、エラー JSON |
| 空白だけの `title` | 422、エラー JSON |
| 101文字の `title` | 422、エラー JSON |
| 存在しない ID(更新・削除) | 404、エラー JSON |
| 画面の4操作 | 再読み込みなしで画面が変わる |
| 既存の `/` と `/api/db-check` | 従来どおり動く |

### 5.3 共有 DB での注意

- Preview と Production は同じ DB を使う。0件テストのために既存の行を削除したり、TRUNCATE したりしない。既存データがあって0件テストができない場合は、その時点の件数と理由を記録する。
- テストでは架空の一意なタイトルを登録し、応答で返された自分の ID だけを更新・削除する。
- Vercel の環境変数を変更した場合は、新しい Deployment で確認する。

## 6 要確認(設計書で決める)

| 項目 | 現状 | 設計書で決めること |
| --- | --- | --- |
| 追加ファイルの配置 | 授業テキストでは `src/apps/todo/`(Router・Controller・Model)、`views/todo/index.ejs`、`public/todo/todo.js`。リポジトリにはまだ存在しない | 実際の配置 |
| `tsconfig.json` のコンパイル対象 | `include` が `index.ts` と `db.ts` だけ | `src/apps/todo/` をビルド対象に含める方法 |
| JSON 本文の受け取り | `index.ts` に `express.json()` がない(`express.urlencoded()` のみ) | `express.json()` を追加する位置と、JSON 構文エラーを 400 の JSON で返す方法 |
| 500 と 503 の区別 | `/api/db-check` は DB エラーをすべて 503 で返している | どのエラーを 503(DB_UNAVAILABLE)、どれを 500(INTERNAL_ERROR)にするか |
| Preview URL | ブランチを push するまで決まらない | push 後に記録する |
