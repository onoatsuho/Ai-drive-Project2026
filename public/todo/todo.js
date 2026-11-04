// ------------------------------
// APIとの通信(fetchとAPIのURLはこのクラスの中だけに書く)
// ------------------------------

// APIがエラーを返したときに投げるエラー。画面でcodeとmessageを使う
class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

class TodoApi {
  constructor(baseUrl = '/api/v1/todos') {
    this.baseUrl = baseUrl;
  }

  // REQ-01 一覧。TODOの配列を返す
  async list() {
    const body = await this.request(this.baseUrl, { method: 'GET' });
    return body.data;
  }

  // REQ-02 登録。登録したTODOを返す
  async create(title) {
    const body = await this.request(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    return body.data;
  }

  // REQ-03 完了状態の部分更新。更新したTODOを返す
  async update(id, isCompleted) {
    const body = await this.request(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted }),
    });
    return body.data;
  }

  // REQ-04 削除。204は本文がないので値を返さない
  async delete(id) {
    await this.request(`${this.baseUrl}/${id}`, { method: 'DELETE' });
  }

  // 4つのメソッドで共通の通信処理
  async request(url, options) {
    let res;
    try {
      res = await fetch(url, options);
    } catch {
      throw new ApiError(0, 'NETWORK_ERROR', 'サーバーに接続できませんでした');
    }

    // 204は本文がないため、res.json()を呼ばない
    if (res.status === 204) {
      return null;
    }

    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null; // JSONではない応答
    }

    if (!res.ok) {
      const code = body && body.code ? body.code : 'UNKNOWN_ERROR';
      const message = body && body.message ? body.message : `エラーが発生しました(HTTP ${res.status})`;
      throw new ApiError(res.status, code, message);
    }
    if (body === null) {
      throw new ApiError(res.status, 'INVALID_RESPONSE', 'サーバーの応答を読み取れませんでした');
    }
    return body;
  }
}

// ------------------------------
// 画面の処理(APIを使うときは必ずtodoApiのメソッドを呼ぶ)
// ------------------------------

const todoApi = new TodoApi();

const form = document.getElementById('todoForm');
const titleInput = document.getElementById('todoTitle');
const addButton = document.getElementById('addButton');
const statusMessage = document.getElementById('statusMessage');
const errorMessage = document.getElementById('errorMessage');
const emptyMessage = document.getElementById('emptyMessage');
const todoList = document.getElementById('todoList');

// 処理中は操作できないようにして、二重送信を防ぐ
function setBusy(isBusy) {
  statusMessage.textContent = isBusy ? '処理中…' : '';
  addButton.disabled = isBusy;
  todoList.querySelectorAll('input, button').forEach((element) => {
    element.disabled = isBusy;
  });
}

function showError(error) {
  if (error instanceof ApiError) {
    errorMessage.textContent = `${error.message}(${error.code})`;
  } else {
    errorMessage.textContent = '予期しないエラーが発生しました';
    console.error(error);
  }
}

function clearError() {
  errorMessage.textContent = '';
}

// 一覧を表示する。タイトルはtextContentで入れ、HTMLとして解釈させない
function renderTodos(todos) {
  todoList.replaceChildren();
  emptyMessage.hidden = todos.length > 0;

  todos.forEach((todo) => {
    const item = document.createElement('li');
    item.className = todo.isCompleted ? 'todo-item is-completed' : 'todo-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.isCompleted;
    checkbox.id = `todo-${todo.id}`;
    checkbox.addEventListener('change', () => {
      runAction(() => todoApi.update(todo.id, checkbox.checked));
    });

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = todo.title;

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = '削除';
    deleteButton.addEventListener('click', () => {
      runAction(() => todoApi.delete(todo.id));
    });

    item.append(checkbox, label, deleteButton);
    todoList.append(item);
  });
}

// 一覧をAPIから取得し直して表示する
async function loadTodos() {
  const todos = await todoApi.list();
  renderTodos(todos);
}

// 操作(登録・更新・削除)を実行し、成功・失敗どちらでも一覧を表示し直す
async function runAction(action) {
  clearError();
  setBusy(true);
  let succeeded = false;
  try {
    await action();
    succeeded = true;
  } catch (error) {
    showError(error);
  }
  try {
    await loadTodos();
  } catch (error) {
    showError(error);
  }
  setBusy(false);
  return succeeded;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault(); // ページの再読み込みを止める
  const succeeded = await runAction(() => todoApi.create(titleInput.value));
  if (succeeded) {
    titleInput.value = '';
  }
  titleInput.focus();
});

// 最初の表示(操作は何もせず、一覧の取得と表示だけを行う)
runAction(async () => {});
