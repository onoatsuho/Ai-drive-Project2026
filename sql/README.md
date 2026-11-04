# sql

## 000_check_connection.sql

- 接続先を確かめるための読み取り専用SQL
- NeonのSQL Editorで実行する

## todo/020_create_todo_tasks.sql

- TODOアプリ V1 のテーブル `todo_tasks` を作成する
- NeonのSQL Editorで、アプリの `DATABASE_URL` と同じブランチ・DBを選んで手動で実行する
- push・マージ・Vercelのデプロイでは実行されない

実行記録:

| 項目 | 内容 |
| --- | --- |
| 対象(Neonブランチ・DB) | primary・neondb |
| 実行日 | 2026-11-04 |
| 結果 | エラーなし。SELECT * FROM todo_tasks ORDER BY id で0件。列(id・title・is_completed・created_at)が設計どおりであることを確認 |
