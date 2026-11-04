# TODO V1 テスト結果

- Gitのブランチ・コミット：feature/todo-app・0fdd0fa(Local のテスト時点)
- Neonブランチ・DB名（接続文字列は書かない）：primary・neondb
- Local URL、実施日時、結果：http://localhost:3000 、2026-11-04 13:45(JST)、`npm run build` → `npm start` と `npm run dev` の両方で API の31項目がすべて期待どおり。2026-11-04 に `npm run dev` で画面を操作し、0件表示・追加・完了切替・削除・入力エラー表示が期待どおり
- Preview URL、Deploymentのソースブランチ、実施日時、結果：https://ai-drive-project2026-803txu83n-ono16.vercel.app(コミット c3f1fb0)、feature/todo-app、2026-11-04、ブラウザで画面の操作と既存ページを確認し、すべて期待どおり。API のエラー系は画面から送れない項目があり、Vercel のログイン保護で curl も使えないため一部未実施
- Production URL、Deploymentのソースブランチ、実施日時、結果：未実施(PR マージ後に実施)
- REQ-01 一覧（0件を含む）：Local で0件のとき 200 `{"status":"success","data":[]}`。登録後は一覧に含まれ、id 昇順、キーが camelCase であることを確認
- REQ-02 登録（正常、title欠落、空白、101文字）：Local で正常 201(ID 付き、isCompleted は false、前後の空白は除去)、ちょうど100文字 201、title 欠落 400、title が数値 400、JSON 構文エラー 400、空白だけ 422、全角空白だけ 422、101文字 422
- REQ-03 更新（正常、存在しないID）：Local で true への更新 200、false への更新 200、存在しない ID 404、ID が `abc`・`0` は 400、本文が空 400、isCompleted が文字列 400、INTEGER 範囲外の ID 404
- REQ-04 削除（正常、存在しないID）：Local で正常 204(本文なし)、削除後に一覧から消える、削除済みの ID 404、ID が `-1` は 400
- 画面(/todo)：Local で「TODOがありません」の表示、追加(一覧に表示され入力欄が空になる)、完了切替(取り消し線が付く・戻る)、削除(行が消えて0件表示に戻る)、空白だけの追加で赤字のエラー表示(VALIDATION_ERROR)を確認。いずれもページの再読み込みなし
- Preview の画面(/todo)：「TODOがありません」の表示、追加、完了切替、削除、空白だけの追加でエラー表示(VALIDATION_ERROR)を確認。テストで追加した TODO は削除済み
- 既存TOPとDB確認：Local で `/` 200、`/api/db-check` connected。Preview でも `/` の表示と `/api/db-check` の connected を確認
- 見つかった不具合、原因、修正後の再テスト：なし
- 文書の仕様と実装に残る差分：なし(503 DB_UNAVAILABLE は DB を止めないと再現できないため未確認)

テストで登録した行は、テストの中で自分が作った ID だけを削除した。テスト後の件数は0件。

## 環境別の結果

| テスト | 期待結果 | Local | Preview | Production |
| --- | --- | --- | --- | --- |
| 0件の一覧 | 空DBで200、dataが空配列 | ○ | ○(画面) | 未実施 |
| 登録 | 201、ID付きTODO | ○ | ○(画面) | 未実施 |
| 完了切替 | 200、状態が変わる | ○ | ○(画面) | 未実施 |
| 削除 | 204、本文なし | ○ | ○(画面) | 未実施 |
| title欠落 | 400、統一エラーJSON | ○ | 未実施(画面から送れない) | 未実施 |
| 空白だけのtitle | 422、統一エラーJSON | ○ | ○(画面) | 未実施 |
| 101文字のtitle | 422、統一エラーJSON | ○ | 未実施(入力欄が100文字までのため) | 未実施 |
| 存在しないID | 404、統一エラーJSON | ○ | 未実施(画面から送れない) | 未実施 |
| 不正なID形式 | 400、統一エラーJSON | ○ | 未実施(画面から送れない) | 未実施 |
| 画面の4操作 | 再読み込みなしで画面が変わる | ○ | ○ | 未実施 |
| 既存TOPとDB確認 | 従来の機能が動く | ○ | ○ | 未実施 |
