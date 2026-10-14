# My Express Site

Express + TypeScript + EJSを使用して作成したWebサイトです。

## 使用技術

- Node.js
- Express
- TypeScript
- EJS
- Neon(PostgreSQL)
- HTML / CSS / JavaScript
- Vercel

## ローカルでの実行

パッケージをインストールします。

```bash
npm install
```

開発サーバーを起動します。

```bash
npm run dev
```

ブラウザから以下へアクセスします。

```
http://localhost:3000/
```

ビルドして実行する場合は次のとおりです。

```bash
npm run build
npm start
```

## データベース(Neon)

Neon(PostgreSQL)に接続しています。

- 接続文字列は環境変数 `DATABASE_URL` から読み込みます(値はGitHubに載せません)
- ローカルではプロジェクト直下の `.env` に `DATABASE_URL` を設定します
- Vercelでは Preview と Production の環境変数 `DATABASE_URL` に、Neonのプール接続URLを登録しています

### 接続確認API

`/api/db-check` を開くと、DBに接続できた場合は次のように表示されます。

```json
{"status":"ok","database":"connected"}
```

接続できない場合は 503 と `{"status":"error","database":"unavailable"}` を返します。

### SQLファイル

- `sql/000_check_connection.sql` … 接続先を確かめるための読み取り専用SQL。NeonのSQL Editorで実行します

## 公開URL

https://ai-drive-project2026-eta.vercel.app

## 作者

Web開発演習 受講生
