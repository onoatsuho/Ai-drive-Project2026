import { pool } from '../../../db';

// DBの1行の形(列名はsnake_case)
type TodoRow = {
  id: number;
  title: string;
  is_completed: boolean;
  created_at: Date;
};

// APIで返すTODOの形(キーはcamelCase)
export type Todo = {
  id: number;
  title: string;
  isCompleted: boolean;
  createdAt: string;
};

// SELECT・RETURNINGで取り出す列
const TODO_COLUMNS = 'id, title, is_completed, created_at';

// DBの行をAPI用の形に変換する
function toTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    isCompleted: row.is_completed,
    createdAt: row.created_at.toISOString(),
  };
}

// REQ-01 一覧をidの昇順で取得する
export async function findAllTodos(): Promise<Todo[]> {
  const result = await pool.query<TodoRow>(
    `SELECT ${TODO_COLUMNS} FROM todo_tasks ORDER BY id`
  );
  return result.rows.map(toTodo);
}

// REQ-02 1件登録し、採番されたTODOを返す
export async function createTodo(title: string): Promise<Todo> {
  const result = await pool.query<TodoRow>(
    `INSERT INTO todo_tasks (title) VALUES ($1) RETURNING ${TODO_COLUMNS}`,
    [title]
  );
  return toTodo(result.rows[0]);
}

// REQ-03 完了状態だけを更新する。対象がなければnullを返す
export async function updateTodoCompleted(id: number, isCompleted: boolean): Promise<Todo | null> {
  const result = await pool.query<TodoRow>(
    `UPDATE todo_tasks SET is_completed = $1 WHERE id = $2 RETURNING ${TODO_COLUMNS}`,
    [isCompleted, id]
  );
  return result.rows.length > 0 ? toTodo(result.rows[0]) : null;
}

// REQ-04 1件削除する。削除できたらtrue、対象がなければfalseを返す
export async function deleteTodo(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM todo_tasks WHERE id = $1', [id]);
  return result.rowCount === 1;
}
