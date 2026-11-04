# TODOアプリ V1 実装手順書

`01_requirements.md`(REQ-01〜REQ-04)と `02_design.md` にもとづく実装の順番。1工程ごとに確認してから次へ進む。
各工程の最後の「状態」に結果を記録する。

## 工程の一覧

| No | 工程 | 対象 |
| --- | --- | --- |
| 0 | 作業ブランチの作成 | Git |
| 1 | SQL ファイルを Git に保存 | `sql/todo/020_create_todo_tasks.sql` |
| 2 | SQL を Neon で手動実行 | Neon SQL Editor、`sql/README.md` |
| 3 | ビルド設定と JSON の受け取り | `tsconfig.json`、`index.ts` |
| 4 | 一覧 API(REQ-01) | `src/apps/todo/*`、`index.ts` |
| 5 | 登録 API(REQ-02) | `todoController.ts`、`todoModel.ts`、`todoRouter.ts` |
| 6 | 更新 API(REQ-03) | 同上 |
| 7 | 削除 API(REQ-04) | 同上 |
| 8 | エラーハンドラ | `todoController.ts`、`index.ts` |
| 9 | TodoApi | `public/todo/todo.js` |
| 10 | 画面 | `views/todo/index.ejs`、`public/todo/todo.js`、`public/todo/todo.css`、`index.ts` |
| 11 | ローカルテスト | `04_test_results.md` |
| 12 | push と Preview テスト | GitHub、Vercel |
| 13 | Pull Request | GitHub |
| 14 | マージと Production テスト | GitHub、Vercel |

## 0 作業ブランチの作成

- 作業: main を最新にしてから `feature/todo-app` を作る。
- コマンド:
  ```
  git switch main
  git pull origin main
  git switch -c feature/todo-app
  npm ci
  npm run build
  npm run dev
  ```
- 期待結果: `/` が表示され、`/api/db-check` が `{"status":"ok","database":"connected"}`。
- 失敗時に最初に見る場所: `.env` に `DATABASE_URL` があるか(clone 先では各自で作る。Git には追加しない)。
- 状態: 完了(2026-11-04)

## 1 SQL ファイルを Git に保存

- 対象: `sql/todo/020_create_todo_tasks.sql`
- 作業: 設計書第3章のテーブル定義を書く。この時点では DB は変わらない。
- コマンド: `git add sql/todo/020_create_todo_tasks.sql` → `git commit`
- 期待結果: GitHub にファイルが見える。
- 失敗時に最初に見る場所: ファイルの保存場所(`sql/todo/`)。
- 状態: 完了(2026-11-04)

## 2 SQL を Neon で手動実行

- 対象: Neon SQL Editor、`sql/README.md`
- 作業:
  1. Neon のダッシュボードで、アプリの `DATABASE_URL` と同じプロジェクト・ブランチ・DB(`neondb`)を選ぶ。
  2. `020_create_todo_tasks.sql` の内容を貼り付けて実行する。
  3. `SELECT * FROM todo_tasks ORDER BY id;` を実行する。
  4. `sql/README.md` にファイル名、対象、実行日、結果を書く。
- 期待結果: エラーなし。初回は0件。
- 失敗時に最初に見る場所: 選んでいる Neon のブランチと DB。同名のテーブルが既にあって列が違う場合は削除せず講師に確認する。
- 注意: push・マージ・Vercel のデプロイでは SQL は実行されない。
- 状態: 完了(2026-11-04。Neon ブランチ primary・DB neondb で実行。エラーなし、0件。`sql/README.md` に記録)

## 3 ビルド設定と JSON の受け取り

- 対象: `tsconfig.json`、`index.ts`
- 作業:
  - `tsconfig.json` の `include` に `"src/**/*.ts"` を追加する。
  - `index.ts` の `express.urlencoded()` の次に `app.use(express.json());` を追加する。
- コマンド: `npm run build`
- 期待結果: エラーなし。
- 失敗時に最初に見る場所: ターミナルの最初のエラー行。
- 状態: 完了(2026-11-04)

## 4 一覧 API(REQ-01)

- 対象: `src/apps/todo/todoModel.ts`(`findAllTodos`)、`todoController.ts`(`listTodos`)、`todoRouter.ts`(`get('/')`)、`index.ts`(import と `app.use('/api/v1/todos', todoRouter)`)
- 作業: 一覧の SQL(`ORDER BY id`)と、DB の行を camelCase の JSON に変換する処理を書く。
- コマンド: `npm run build` → `npm run dev` → `curl.exe -i http://localhost:3000/api/v1/todos`
- 期待結果: 200、`{"status":"success","data":[]}`。
- 失敗時に最初に見る場所: import のパス(`../../../db`)、工程2を実行したか、ターミナルの最初のエラー。
- 完了と言える状態: データ0件なら GET の `data` が空配列になること。
- 状態: 完了(2026-11-04。0件で 200 `data: []` を確認。テーブル作成前は 500 INTERNAL_ERROR になることも確認)

## 5 登録 API(REQ-02)

- 対象: `todoModel.ts`(`createTodo`)、`todoController.ts`(`createTodo`)、`todoRouter.ts`(`post('/')`)
- 作業: title が文字列かを調べ(400)、trim 後の文字数を調べ(422)、`INSERT ... RETURNING` で登録する。
- コマンド(PowerShell):
  ```
  curl.exe -i -X POST http://localhost:3000/api/v1/todos -H "Content-Type: application/json" -d '{\"title\":\"授業の動作確認\"}'
  ```
  ※ PowerShell では JSON の `"` を `\"` にする。ブラウザの Console で fetch を使う方法(授業テキスト第7章)でもよい。
- 期待結果: 201、ID 付きの TODO。一覧を取得すると1件増える。
- 失敗時に最初に見る場所: `express.json()` の位置、`Content-Type`、SQL のプレースホルダ。
- 完了と言える状態: 正しい title を送ると 201 で ID 付きの TODO が返り、一覧に含まれること。
- 状態: 完了(2026-11-04。正常 201、400・422 をローカルで確認)

## 6 更新 API(REQ-03)

- 対象: `todoModel.ts`(`updateTodoCompleted`)、`todoController.ts`(`updateTodo`)、`todoRouter.ts`(`patch('/:id')`)
- 作業: ID の形式(400)→ isCompleted の型(400)→ `UPDATE ... WHERE id = $2 RETURNING`。行がなければ 404。
- コマンド: 登録で返った ID に `{"isCompleted":true}` を PATCH で送る。
- 期待結果: 200、その行だけ `isCompleted: true`。
- 失敗時に最初に見る場所: ID の解析、UPDATE の WHERE、RETURNING。
- 完了と言える状態: 登録時の ID へ `{"isCompleted":true}` を送ると 200 が返り、その行だけが完了になること。
- 状態: 完了(2026-11-04。正常 200、400、404 をローカルで確認)

## 7 削除 API(REQ-04)

- 対象: `todoModel.ts`(`deleteTodo`)、`todoController.ts`(`deleteTodo`)、`todoRouter.ts`(`delete('/:id')`)
- 作業: ID の形式(400)→ `DELETE ... WHERE id = $1`。`rowCount` が0なら 404、1なら 204(本文なし)。
- コマンド: `curl.exe -i -X DELETE http://localhost:3000/api/v1/todos/<登録したID>`
- 期待結果: 204、そのIDが一覧から消える。もう一度送ると 404。
- 失敗時に最初に見る場所: DELETE の WHERE、rowCount、204 で本文を返していないか。
- 完了と言える状態: 登録時の ID を指定すると 204 が返り、その ID が一覧から消えること。
- 状態: 完了(2026-11-04。正常 204、400、404 をローカルで確認)

## 8 エラーハンドラ

- 対象: `todoController.ts`(`handleTodoError`)、`index.ts`(`app.use('/api/v1/todos', handleTodoError)` をルートの後に登録)
- 作業: JSON の構文エラーを 400、DB 接続エラーを 503、それ以外を 500 の統一エラー JSON にする。
- コマンド: 壊れた JSON(`{"title": `)を POST する。
- 期待結果: HTML のエラー画面ではなく、400 の統一エラー JSON。
- 失敗時に最初に見る場所: エラーハンドラがルートより後に登録されているか、引数が4つあるか。
- 状態: 完了(2026-11-04。400 と 500 をローカルで確認。503 は DB を止められないため未確認)

## 9 TodoApi

- 対象: `public/todo/todo.js`
- 作業: `TodoApi` クラスに `list`・`create`・`update`・`delete` と共通の `request` を作る。204 では `res.json()` を呼ばない。エラーは `ApiError`(`status`・`code`・`message`)にする。
- 確認: `/todo` を開き、開発者ツールの Console で `await todoApi.list()` を実行する。
- 期待結果: 配列が返る。
- 失敗時に最初に見る場所: Network タブの URL・メソッド・応答。
- 状態: コード完了。ブラウザでの確認は工程2の後

## 10 画面

- 対象: `views/todo/index.ejs`、`public/todo/todo.js`(画面の処理)、`public/todo/todo.css`、`index.ts`(`app.get('/todo', ...)`)
- 作業: 入力フォーム、一覧、チェックボックス、削除ボタン、処理中・エラー・0件の表示を作り、TodoApi のメソッドから API を呼ぶ。
- 確認: `/todo` で登録 → 完了切替 → 削除。
- 期待結果: 再読み込みなしで画面が変わる。0件なら「TODOがありません」。
- 失敗時に最初に見る場所: Network タブ、Console のエラー、`/todo/todo.js` のパス。
- 状態: コード完了(`/todo`・`/todo/todo.js`・`/todo/todo.css` が 200 で返ることを確認)。画面操作の確認は工程2の後

## 11 ローカルテスト

- 作業: `npm run dev` と、`npm run build` → `npm start` の両方で、`04_test_results.md` の項目を確認する。
- 期待結果: `04_test_results.md` の Local の欄がすべて期待どおり。既存の `/` と `/api/db-check` も動く。
- 失敗時に最初に見る場所: ターミナルの最初のエラー、`views/todo/` と `public/todo/` のパス。
- 状態: API は完了(2026-11-04。`npm run dev` と `npm start` の両方で31項目 OK)。画面の操作は未実施

## 12 push と Preview テスト

- コマンド:
  ```
  git status
  git diff --cached --name-only
  git push origin feature/todo-app
  ```
- 作業: `.env`・接続文字列・個人情報が含まれないことを確認してから push する。Vercel の Deployments で `feature/todo-app` の Preview URL を開き、工程11と同じ項目を確認する。
- 期待結果: Preview で Local と同じ結果。
- 失敗時に最初に見る場所: Vercel の Build Logs、Function Logs、Preview の環境変数 `DATABASE_URL`。
- 注意: Preview と Production は同じ DB を使う。自分で作った ID だけを更新・削除する。
- 状態: push とビルドは完了(2026-11-04)。Preview の動作確認は未実施

## 13 Pull Request

- 作業: `feature/todo-app` → `main` の PR を作り、変更内容、Preview URL、テスト結果、未解決事項を書く。
- 状態: 作成済み(https://github.com/onoatsuho/Ai-drive-Project2026/pull/2)。Preview の結果は確認後に追記する

## 14 マージと Production テスト

- 作業: Preview で V1 を確認したら main にマージする。Production URL(https://ai-drive-project2026-eta.vercel.app/todo)で同じ項目を確認し、`04_test_results.md` に追記してコミット・push する。
- 失敗時に最初に見る場所: Production の Deployment のソースブランチが main か、Production の環境変数。
- 状態: 未実施
