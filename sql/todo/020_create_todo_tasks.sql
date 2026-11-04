-- TODOアプリ V1 のテーブルを作成する
-- 実行場所: Neon(アプリの DATABASE_URL と同じブランチ・DB)
-- 同名のテーブルが既にある場合は何もしない(既存のデータは消さない)
CREATE TABLE IF NOT EXISTS todo_tasks (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL CHECK (
    char_length(title) BETWEEN 1 AND 100
    AND char_length(btrim(title)) > 0
  ),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
