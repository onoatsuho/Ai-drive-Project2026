import { Router } from 'express';
import { createTodo, deleteTodo, listTodos, updateTodo } from './todoController';

// index.tsで /api/v1/todos に登録する。ここでのパスはそれより後ろの部分
export const todoRouter = Router();

todoRouter.get('/', listTodos); // REQ-01 一覧
todoRouter.post('/', createTodo); // REQ-02 登録
todoRouter.patch('/:id', updateTodo); // REQ-03 完了状態の部分更新
todoRouter.delete('/:id', deleteTodo); // REQ-04 削除
