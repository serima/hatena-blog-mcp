# はてなブログ MCP Server 実装指示書

## プロジェクト概要
はてなブログをClaude Desktop/Web版から検索できるMCPサーバーを実装する。
Vercelにデプロイして `https://your-project.vercel.app/api/mcp` でアクセス可能にする。

## 実装要件

### プロジェクト構造
```
hatena-blog-mcp/
├── package.json
├── vercel.json  
├── api/
│   └── mcp.js
├── lib/
│   └── hatena.js
└── README.md
```

### 機能要件
1. **search_blog**: キーワードで記事検索
2. **get_recent_posts**: 最新記事取得
3. **get_post_by_url**: URL指定で記事詳細取得

### 技術仕様
- Node.js 18.x
- RSS/Atom フィード解析（xml2js使用）
- CORS対応
- エラーハンドリング
- メモリベースキャッシュ（5分）

### MCPプロトコル対応
- `initialize`: サーバー情報返却
- `tools/list`: 利用可能ツール一覧
- `tools/call`: ツール実行

### Vercel設定
- Serverless Functions使用
- 環境変数: BLOG_ID, CACHE_DURATION
- CORS headers設定

## 実装順序
1. package.json, vercel.json作成
2. lib/hatena.js実装（RSS解析）
3. api/mcp.js実装（MCPサーバー）
4. テスト用データ作成
5. README.md作成

## カスタマイズポイント
- ブログID: `${BLOG_ID}.hatenablog.com`
- 検索アルゴリズム: タイトル・本文・タグ対応
- キャッシュ戦略: Vercel制約考慮

完全に動作するプロジェクトを一度に生成してください。
