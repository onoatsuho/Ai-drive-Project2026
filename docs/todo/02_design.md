# TODOアプリ V1 設計書

`docs/todo/01_requirements.md` の REQ-01〜REQ-04 を変更せずに参照し、ファイル構成、処理の流れ、DB、API、画面を決める。

## 1 作るものとファイルの役割

### 1.1 ファイル構成(授業テキストに合わせた配置)

```
プロジェクト直下/
├── index.ts                         既存。todoRouter・画面ルート・express.json()を追記
├── db.ts                            既存。変更しない(pool を使う)
├── tsconfig.json                    既存。include に src/**/*.ts を追加
├── src/apps/todo/
│   ├── todoRouter.ts                URLとメソッドをControllerの関数に割り当てる
│   ├── todoController.ts            入力チェック、ステータスとJSONの決定、エラーハンドラ
│   └── todoModel.ts                 SQLの実行と、DBの行→APIのJSONへの変換
├── views/todo/index.ejs             TODO画面のHTML
├── public/todo/
│   ├── todo.js                      ブラウザ用。TodoApiクラスと画面の処理
│   └── todo.css                     TODO画面の見た目(既存の /css/style.css に追加で読み込む)
├── sql/todo/020_create_todo_tasks.sql   todo_tasks の作成SQL
└── docs/todo/                       01〜04の文書
```

`public/todo/todo.css` は授業テキストの構成図にないが、既存の `/css/style.css` を変えずに TODO 画面の見た目を足すために追加する。

### 1.2 既存部分の扱い

- `/` と `/api/db-check` のコードは変更しない。
- `views/index.ejs`、`public/css/style.css`、`public/js/script.js` は変更しない。

## 2 リクエストはどこを通るか

```
ブラウザ(/todo の画面)
  │ 画面のイベント → TodoApi のメソッド → fetch
  ▼
index.ts
  │ express.json() で本文を読む(JSONが壊れていたらエラーハンドラへ)
  │ app.use('/api/v1/todos', todoRouter)
  ▼
todoRouter.ts   … メソッドとパスで Controller の関数を選ぶ
  ▼
todoController.ts … ID・本文をチェックし、ステータスとJSONを決める
  ▼
todoModel.ts    … $1 などのプレースホルダを使ってSQLを実行する
  ▼
db.ts の pool → Neon PostgreSQL(todo_tasks)
```

`index.ts` への追記は次の4か所だけにする。

| 位置 | 追記内容 |
| --- | --- |
| import の後 | `todoRouter` と `handleTodoError` の import |
| `express.urlencoded()` の次 | `app.use(express.json())` |
| `/api/db-check` の後 | `app.get('/todo', ...)` で `todo/index` を表示 |
| その次 | `app.use('/api/v1/todos', todoRouter)`、続けて `app.use('/api/v1/todos', handleTodoError)` |

エラーハンドラはルートより後に登録する(Express は登録順に処理するため)。パス `/api/v1/todos` を付けて登録するので、`/` など他のページのエラーには影響しない。

## 3 DBの設計

テーブル `todo_tasks`(`sql/todo/020_create_todo_tasks.sql`)

| 列 | 型 | 制約 | API のキー |
| --- | --- | --- | --- |
| id | INTEGER | GENERATED ALWAYS AS IDENTITY、PRIMARY KEY | id |
| title | TEXT | NOT NULL、CHECK(char_length(title) が1〜100、btrim 後が1文字以上) | title |
| is_completed | BOOLEAN | NOT NULL、DEFAULT FALSE | isCompleted |
| created_at | TIMESTAMPTZ | NOT NULL、DEFAULT NOW() | createdAt(ISO 8601 の文字列) |

- 文字数のチェックはアプリ(Controller)と DB(CHECK 制約)の両方で行う。アプリ側は `[...title].length` で数え、DB の `char_length` と同じく絵文字なども1文字として数える。
- SQL は Neon でアプリの `DATABASE_URL` と同じ DB に手動で実行し、`sql/README.md` に記録する。

## 4 APIの共通ルール

- URL は `/api/v1/todos`。1件の指定は `/api/v1/todos/:id`。
- `:id` は正規表現 `^[1-9][0-9]*$` に一致するものだけを受け付ける(先頭0、負の数、小数、文字は 400)。INTEGER の最大値 2147483647 を超える ID は、DB に問い合わせずに 404 にする。
- 本文は JSON(`Content-Type: application/json`)。JSON のキーは camelCase、DB の列は snake_case。
- 成功: `{"status":"success","data":...}`。DELETE は 204 で本文なし。
- エラー: `{"status":"error","code":"...","message":"...","details":[]}`。V1 では `details` は常に空配列。

| ステータス | code | 返す場所 |
| --- | --- | --- |
| 400 | BAD_REQUEST | Controller(ID・本文の形式)、エラーハンドラ(JSON の構文エラー) |
| 422 | VALIDATION_ERROR | Controller(title の文字数) |
| 404 | NOT_FOUND | Controller(Model が「対象なし」を返したとき) |
| 500 | INTERNAL_ERROR | エラーハンドラ(上記以外の例外) |
| 503 | DB_UNAVAILABLE | エラーハンドラ(DB 接続エラーと判定した例外) |

## 5 APIの設計

### 5.1 REQ-01 TODO一覧を取得する

| 項目 | 内容 |
| --- | --- |
| メソッド・URL | `GET /api/v1/todos` |
| リクエスト本文 | なし |
| 成功 | 200 `{"status":"success","data":[{"id":1,"title":"課題を提出する","isCompleted":false,"createdAt":"2026-11-04T04:00:00.000Z"}]}` |
| 0件 | 200 `{"status":"success","data":[]}` |
| 失敗 | 503 DB_UNAVAILABLE、500 INTERNAL_ERROR |
| DB処理 | `SELECT id, title, is_completed, created_at FROM todo_tasks ORDER BY id` |
| 関数 | Router `get('/')` → Controller `listTodos` → Model `findAllTodos` |
| TodoApi | `list()` … `data` の配列を返す |
| 確認方法 | `curl.exe -i http://localhost:3000/api/v1/todos`、画面の一覧と「TODOがありません」 |

### 5.2 REQ-02 TODOを登録する

| 項目 | 内容 |
| --- | --- |
| メソッド・URL | `POST /api/v1/todos` |
| リクエスト本文 | `{"title":"課題を提出する"}` |
| 成功 | 201 `{"status":"success","data":{"id":2,"title":"課題を提出する","isCompleted":false,"createdAt":"..."}}` |
| 失敗 | 400 BAD_REQUEST(JSON 構文エラー、title 欠落、title が文字列でない)、422 VALIDATION_ERROR(trim 後0文字・101文字以上)、503、500 |
| DB処理 | `INSERT INTO todo_tasks (title) VALUES ($1) RETURNING id, title, is_completed, created_at`(`$1` は trim 後の title) |
| 関数 | Router `post('/')` → Controller `createTodo` → Model `createTodo` |
| TodoApi | `create(title)` … 登録した TODO を返す |
| 確認方法 | 画面から追加。Console・curl で正常、title 欠落、空白だけ、101文字を送る |

### 5.3 REQ-03 完了状態を変える

| 項目 | 内容 |
| --- | --- |
| メソッド・URL | `PATCH /api/v1/todos/:id` |
| リクエスト本文 | `{"isCompleted":true}` |
| 成功 | 200 `{"status":"success","data":{"id":2,"title":"課題を提出する","isCompleted":true,"createdAt":"..."}}` |
| 失敗 | 400 BAD_REQUEST(ID 形式不正、本文が空、isCompleted が真偽値でない)、404 NOT_FOUND(存在しない ID)、503、500 |
| DB処理 | `UPDATE todo_tasks SET is_completed = $1 WHERE id = $2 RETURNING ...`。返った行が0件なら 404 |
| 関数 | Router `patch('/:id')` → Controller `updateTodo` → Model `updateTodoCompleted` |
| TodoApi | `update(id, isCompleted)` … 更新した TODO を返す |
| 確認方法 | 画面のチェックボックス。Console・curl で正常、存在しない ID、`abc` の ID を送る |

チェックの順番は「ID の形式 → 本文 → DB」。形式が不正なら DB に問い合わせない。

### 5.4 REQ-04 TODOを削除する

| 項目 | 内容 |
| --- | --- |
| メソッド・URL | `DELETE /api/v1/todos/:id` |
| リクエスト本文 | なし |
| 成功 | 204、本文なし |
| 失敗 | 400 BAD_REQUEST(ID 形式不正)、404 NOT_FOUND(存在しない ID)、503、500 |
| DB処理 | `DELETE FROM todo_tasks WHERE id = $1`。`rowCount` が1なら削除成功、0なら 404 |
| 関数 | Router `delete('/:id')` → Controller `deleteTodo` → Model `deleteTodo` |
| TodoApi | `delete(id)` … 値を返さない。204 の本文を JSON として読まない |
| 確認方法 | 画面の削除ボタン。Console・curl で正常、削除済みの ID を送る |

## 6 画面とTodoApiの設計

### 6.1 画面(`views/todo/index.ejs`、URL `/todo`)

| 部品 | id | 役割 |
| --- | --- | --- |
| 入力欄(maxlength=100)と追加ボタン | `todoTitle`、`addButton`(form は `todoForm`) | REQ-02 |
| 処理中の表示 | `statusMessage` | 「処理中…」 |
| エラーの表示 | `errorMessage` | `message(code)` の形で表示 |
| 0件の表示 | `emptyMessage` | 「TODOがありません」 |
| 一覧 | `todoList` | 各行にチェックボックス(REQ-03)、タイトル、削除ボタン(REQ-04) |

完了した行はタイトルに取り消し線を付ける。

### 6.2 TodoApi(`public/todo/todo.js`)

fetch と API の URL はこのクラスの中にだけ書く。画面のイベントからは必ずメソッドを呼ぶ。

| メソッド | 呼ぶ API | 戻り値 |
| --- | --- | --- |
| `list()` | GET `/api/v1/todos` | TODO の配列 |
| `create(title)` | POST `/api/v1/todos` | 登録した TODO |
| `update(id, isCompleted)` | PATCH `/api/v1/todos/:id` | 更新した TODO |
| `delete(id)` | DELETE `/api/v1/todos/:id` | なし |

共通の `request(url, options)` で次を行う。

1. fetch が失敗(サーバーに届かない)したら `ApiError(0, 'NETWORK_ERROR', ...)` を投げる。
2. 204 なら本文を読まずに終わる。
3. それ以外は `res.json()` で本文を読む。
4. `res.ok` が false なら、本文の `code` と `message` で `ApiError` を投げる。

### 6.3 画面の動き

- 表示時と、登録・更新・削除の後に `list()` で一覧を取得し直して描画する(ページの再読み込みはしない)。
- タイトルは `textContent` で入れる。HTML として解釈させない。
- 処理中は追加ボタン・チェックボックス・削除ボタンを無効にして二重送信を防ぐ。
- 失敗しても一覧を取得し直すので、チェックボックスは DB の状態に戻る。
- 登録に成功したら入力欄を空にする。

## 7 エラーはどこで処理するか

| 発生場所 | 例 | 処理する場所 | 応答 |
| --- | --- | --- | --- |
| `express.json()` | JSON の構文エラー | `handleTodoError`(本文読み取りエラーと判定) | 400 BAD_REQUEST |
| Controller の入力チェック | title 欠落、ID が `abc` | Controller | 400 / 422 |
| Model の結果 | 対象の行がない | Controller | 404 |
| Model(SQL 実行) | DB に接続できない | `handleTodoError`(接続エラーと判定) | 503 DB_UNAVAILABLE |
| Model(SQL 実行) | テーブルがない、その他 | `handleTodoError` | 500 INTERNAL_ERROR |
| ブラウザの fetch | 通信できない | TodoApi → 画面 | 「サーバーに接続できませんでした」 |

- Express 5 は async 関数の中で起きた例外をエラーハンドラへ渡すので、Controller では try/catch を書かない。
- DB 接続エラーの判定: Node.js の通信エラー(`ECONNREFUSED` など)、PostgreSQL の接続エラー(コードが `08` で始まる)、接続数超過(`53300`)、停止中(`57P01`〜`57P03`)、接続タイムアウト。
- エラーの詳細は `console.error` でサーバーのログ(Vercel では Function Logs)に出す。応答には SQL や接続文字列を含めない。

## 8 実装への注意事項

- `index.ts` の追記は最低限にする(第2章の4か所)。
- `tsconfig.json` の `include` に `src/**/*.ts` を加えないと、`npm run build` で `src` がコンパイルされない。
- SQL の値は必ず `$1` などのプレースホルダで渡す。文字列をつなげて SQL を作らない。
- `public/` の静的ファイルは `/todo/todo.js` のように `public` を除いたパスで参照する。
- 画面ルートは `/todo`、静的ファイルは `/todo/todo.js`。パスが違うので衝突しない。
- Preview と Production は同じ DB を参照する。テストでは自分で作った ID だけを更新・削除する。

## 9 要確認

| 項目 | 内容 |
| --- | --- |
| Neon のブランチ名 | SQL の実行先は `DATABASE_URL` と同じ DB(`neondb`)。ブランチ名は Neon のダッシュボードで確認する |
| V1 にない URL | `GET /api/v1/todos/:id` や `PUT` は作らない。アクセスされた場合は Express の標準の 404(HTML)になる |
