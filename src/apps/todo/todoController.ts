import { NextFunction, Request, Response } from 'express';
import * as todoModel from './todoModel';

const TITLE_MAX_LENGTH = 100;
const ID_MAX = 2147483647; // INTEGER型の最大値。これより大きいIDの行は存在しない

// ------------------------------
// 共通の処理
// ------------------------------

// エラーJSONを返す({"status":"error","code":"...","message":"...","details":[]})
function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ status: 'error', code, message, details: [] });
}

// パスの:idを数値に変換する。1以上の整数でなければnullを返す
function parseId(value: string): number | null {
  if (!/^[1-9][0-9]*$/.test(value)) {
    return null;
  }
  return Number(value);
}

// ------------------------------
// REQ-01〜REQ-04
// ------------------------------

// REQ-01 GET /api/v1/todos
export async function listTodos(_req: Request, res: Response): Promise<void> {
  const todos = await todoModel.findAllTodos();
  res.status(200).json({ status: 'success', data: todos });
}

// REQ-02 POST /api/v1/todos
export async function createTodo(req: Request, res: Response): Promise<void> {
  const title = req.body?.title;
  if (typeof title !== 'string') {
    sendError(res, 400, 'BAD_REQUEST', 'titleを文字列で送ってください');
    return;
  }

  const trimmedTitle = title.trim();
  // [...文字列].length で数えると、DBのchar_lengthと同じく絵文字なども1文字になる
  const length = [...trimmedTitle].length;
  if (length < 1 || length > TITLE_MAX_LENGTH) {
    sendError(res, 422, 'VALIDATION_ERROR', `タイトルは前後の空白を除いて1〜${TITLE_MAX_LENGTH}文字で入力してください`);
    return;
  }

  const todo = await todoModel.createTodo(trimmedTitle);
  res.status(201).json({ status: 'success', data: todo });
}

// REQ-03 PATCH /api/v1/todos/:id
export async function updateTodo(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id as string);
  if (id === null) {
    sendError(res, 400, 'BAD_REQUEST', 'IDは1以上の整数で指定してください');
    return;
  }

  const isCompleted = req.body?.isCompleted;
  if (typeof isCompleted !== 'boolean') {
    sendError(res, 400, 'BAD_REQUEST', 'isCompletedをtrueまたはfalseで送ってください');
    return;
  }

  const todo = id <= ID_MAX ? await todoModel.updateTodoCompleted(id, isCompleted) : null;
  if (todo === null) {
    sendError(res, 404, 'NOT_FOUND', '指定したTODOが見つかりません');
    return;
  }
  res.status(200).json({ status: 'success', data: todo });
}

// REQ-04 DELETE /api/v1/todos/:id
export async function deleteTodo(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id as string);
  if (id === null) {
    sendError(res, 400, 'BAD_REQUEST', 'IDは1以上の整数で指定してください');
    return;
  }

  const deleted = id <= ID_MAX ? await todoModel.deleteTodo(id) : false;
  if (!deleted) {
    sendError(res, 404, 'NOT_FOUND', '指定したTODOが見つかりません');
    return;
  }
  res.status(204).end(); // 204は本文を返さない
}

// ------------------------------
// エラーハンドラ(index.tsで /api/v1/todos のルートの後に登録する)
// ------------------------------

// DBに接続できないときのエラーかどうか
function isDbUnavailable(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  const message = error instanceof Error ? error.message : '';
  if (typeof code === 'string') {
    // Node.jsの通信エラー、またはPostgreSQLの接続エラー(08xxx)・接続数超過(53300)・停止中(57P01〜57P03)
    if (['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN'].includes(code)) return true;
    if (code.startsWith('08') || ['53300', '57P01', '57P02', '57P03'].includes(code)) return true;
  }
  return message.includes('timeout exceeded when trying to connect') || message.includes('Connection terminated');
}

// express.json()が本文を読めなかったときのエラーかどうか(JSONの構文エラーなど)
function isBodyParseError(error: unknown): boolean {
  const { type, status } = (error ?? {}) as { type?: unknown; status?: unknown };
  return typeof type === 'string' && typeof status === 'number' && status >= 400 && status < 500;
}

export function handleTodoError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (isBodyParseError(error)) {
    sendError(res, 400, 'BAD_REQUEST', 'JSONの形式が正しくありません');
    return;
  }

  // 詳細はサーバーのログだけに出し、応答には含めない
  console.error('TODO APIでエラーが発生しました', error);
  if (isDbUnavailable(error)) {
    sendError(res, 503, 'DB_UNAVAILABLE', 'データベースに接続できません');
    return;
  }
  sendError(res, 500, 'INTERNAL_ERROR', 'サーバー内部でエラーが発生しました');
}
