# Hatena Blog MCP Server

Claude Desktop/Web版からはてなブログを検索できるMCP (Model Context Protocol) サーバーです。

## 機能

- **search_blog**: キーワードで記事検索
- **get_recent_posts**: 最新記事取得
- **get_post_by_url**: URL指定で記事詳細取得

## デプロイ

### Vercelへのデプロイ

1. Vercelアカウントでログイン
2. このリポジトリをインポート
3. 環境変数を設定:
   - `BLOG_ID`: はてなブログID（例: `example` → `example.hatenablog.com`）
   - `CACHE_DURATION`: キャッシュ時間（秒、デフォルト: 300）

### ローカル開発

```bash
npm install
npm run dev
```

## 使用方法

### Claude Desktop設定

`claude_desktop_config.json`に以下を追加:

```json
{
  "mcpServers": {
    "hatena-blog": {
      "command": "npx",
      "args": ["--yes", "@modelcontextprotocol/server-fetch"],
      "env": {
        "FETCH_BASE_URL": "https://your-project.vercel.app/api/mcp"
      }
    }
  }
}
```

### API エンドポイント

```
POST https://your-project.vercel.app/api/mcp
```

### リクエスト例

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_blog",
    "arguments": {
      "keyword": "技術",
      "limit": 5
    }
  }
}
```

## ツール仕様

### search_blog

キーワードでブログ記事を検索します。

**パラメータ:**
- `keyword` (必須): 検索キーワード
- `limit` (オプション): 取得件数（デフォルト: 10）

### get_recent_posts

最新のブログ記事を取得します。

**パラメータ:**
- `limit` (オプション): 取得件数（デフォルト: 10）

### get_post_by_url

指定したURLの記事詳細を取得します。

**パラメータ:**
- `url` (必須): 記事のURL

## 技術仕様

- Node.js 18.x
- xml2js: RSS/Atom フィード解析
- Vercel Serverless Functions
- メモリベースキャッシュ（5分間）
- CORS対応

## ライセンス

MIT