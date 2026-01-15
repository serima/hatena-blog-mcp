# Hatena Blog MCP Server - Developer Guide

## Project Overview

This project implements an MCP (Model Context Protocol) server that enables Claude Desktop/Web to search and retrieve posts from Hatena Blog (Japanese blogging platform). The server is designed to run as a Vercel Serverless Function and provides a REST API endpoint that implements the MCP protocol.

**Key Purpose**: Bridge Claude AI assistants with Hatena Blog content through a standardized MCP interface, enabling natural language queries about blog posts.

## Architecture

### High-Level Architecture

```
Claude Desktop/Web
    ↓ (JSON-RPC 2.0 over HTTP)
Vercel Serverless Function (api/mcp.js)
    ↓ (uses)
Hatena Blog Client (lib/hatena.js)
    ↓ (fetches RSS/Atom feeds)
Hatena Blog (*.hatenablog.com/rss)
```

### Technology Stack

- **Runtime**: Node.js 18.x
- **Deployment**: Vercel Serverless Functions
- **Protocol**: MCP (Model Context Protocol) via JSON-RPC 2.0
- **Feed Parsing**: xml2js library
- **Caching**: In-memory Map with TTL
- **CORS**: Full cross-origin support

## Codebase Structure

```
hatena-blog-mcp/
├── api/
│   └── mcp.js              # Main MCP server endpoint (Vercel function)
├── lib/
│   └── hatena.js           # Hatena Blog RSS/Atom client with caching
├── package.json            # Dependencies and scripts
├── README.md               # User-facing documentation (Japanese)
├── CLAUDE.md               # This file - developer documentation
└── test-data.json          # Sample MCP request payloads for testing
```

### File Responsibilities

#### api/mcp.js (209 lines)
- **Purpose**: Vercel Serverless Function handler implementing MCP protocol
- **Exports**: Default async function `(req, res) => {}`
- **Key Functions**:
  - `setCorsHeaders(res)`: Sets CORS headers for cross-origin requests
  - `createResponse(content, isError)`: JSON-RPC response formatter
  - `createErrorResponse(code, message, details)`: Error response builder
  - `handleToolCall(name, arguments_)`: Routes tool calls to appropriate handlers
- **MCP Methods Supported**:
  - `initialize`: Returns server capabilities and info
  - `tools/list`: Returns available tools (search_blog, get_recent_posts, get_post_by_url)
  - `tools/call`: Executes requested tool
- **Environment Variables**:
  - `BLOG_ID`: Hatena blog identifier (default: 'example')
  - `CACHE_DURATION`: Cache TTL in seconds (default: 300)

#### lib/hatena.js (136 lines)
- **Purpose**: Client for fetching and parsing Hatena Blog RSS/Atom feeds
- **Exports**: `HatenaBlogClient` class
- **Key Methods**:
  - `constructor(blogId, cacheDuration)`: Initialize with blog ID and cache settings
  - `searchBlog(keyword, limit)`: Full-text search across title, summary, and categories
  - `getRecentPosts(limit)`: Fetch most recent posts from RSS feed
  - `getPostByUrl(url)`: Find specific post by URL (searches recent 50 posts)
  - `clearCache()`: Manual cache invalidation
- **Private Methods**:
  - `_fetchWithCache(url)`: HTTP fetch with cache layer
  - `_extractPostData(entry)`: Parse RSS/Atom entry to normalized format
  - `_getCacheKey(url)`: Generate cache key
  - `_isValidCache(cacheEntry)`: Check cache validity
- **Caching Strategy**: In-memory Map with timestamp-based TTL
- **Feed Format Support**: Both RSS 2.0 and Atom feeds

## MCP Protocol Implementation

### Tool Definitions

The server exposes three tools with JSON Schema input validation:

1. **search_blog**
   - Description: Search blog posts by keyword
   - Required: `keyword` (string)
   - Optional: `limit` (number, default: 10)
   - Implementation: Case-insensitive substring match across title, summary, categories

2. **get_recent_posts**
   - Description: Get recent blog posts
   - Optional: `limit` (number, default: 10)
   - Implementation: Returns posts in RSS feed order

3. **get_post_by_url**
   - Description: Get blog post details by URL
   - Required: `url` (string)
   - Implementation: Searches recent 50 posts for matching URL

### Response Format

All tool responses follow MCP convention:
```javascript
{
  content: [
    {
      type: 'text',
      text: '...' // Formatted markdown text
    }
  ]
}
```

Post information is formatted with:
- Title (bold markdown)
- URL
- Published date
- Summary (HTML stripped, truncated to 500 chars)
- Categories (comma-separated)
- Content (for detailed views)

## Development Workflows

### Local Development

```bash
# Install dependencies
npm install

# Run locally with Vercel CLI
npm run dev

# Server will be available at http://localhost:3000/api/mcp
```

### Testing MCP Endpoints

Use the test payloads in `test-data.json`:

```bash
# Test initialize
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d @test-data.json

# Or extract specific test
cat test-data.json | jq .search_blog | \
  curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d @-
```

### Making Code Changes

**When modifying api/mcp.js**:
- Ensure CORS headers remain configured for all responses
- Maintain JSON-RPC 2.0 response format
- Keep tool definitions in sync with actual implementations
- Handle all error cases with appropriate error codes

**When modifying lib/hatena.js**:
- Preserve cache behavior (critical for serverless cold starts)
- Test with both RSS and Atom feed formats
- Ensure all public methods handle missing data gracefully
- HTML stripping in summaries must be maintained

**Error Code Conventions**:
- `-32601`: Method not allowed / Unknown method
- `-32602`: Invalid params (missing required parameters)
- `-32603`: Internal error (catch-all for exceptions)

### Git Workflow

- Development branch: `claude/add-claude-documentation-uEr61`
- Always commit with descriptive messages
- Push to feature branch: `git push -u origin claude/add-claude-documentation-uEr61`

## Deployment

### Vercel Configuration

**Note**: Currently `vercel.json` is not present. Vercel auto-detects the API directory pattern.

The project uses Vercel's zero-config deployment:
- Functions are auto-detected in `api/` directory
- Node.js version specified in `package.json` engines field
- Environment variables set in Vercel dashboard

### Required Environment Variables

```bash
BLOG_ID=your-blog-id          # Without .hatenablog.com suffix
CACHE_DURATION=300            # Cache TTL in seconds (optional)
```

### Deployment Process

1. Connect repository to Vercel
2. Configure environment variables in project settings
3. Deploy (automatic on push, or manual via Vercel CLI)
4. Endpoint available at: `https://your-project.vercel.app/api/mcp`

## Key Conventions

### Code Style

- **Naming**: camelCase for functions/variables, PascalCase for classes
- **Async/Await**: Prefer async/await over raw promises
- **Error Handling**: Always catch and wrap errors with context
- **Comments**: Minimal - code should be self-documenting
- **Module System**: CommonJS (require/module.exports) for Vercel compatibility

### Data Flow Patterns

1. **Request Flow**: HTTP POST → MCP method router → Tool handler → Hatena client → RSS feed
2. **Cache Flow**: Check cache → If miss, fetch RSS → Parse XML → Cache result → Return
3. **Error Flow**: Catch exception → Wrap with context → Format as JSON-RPC error → Return with 500/400 status

### Search Implementation

The search is implemented as client-side filtering after fetching the RSS feed:
- Fetch full RSS feed (cached)
- Normalize to lowercase for comparison
- Check keyword presence in: title + summary + categories
- Return first N matches

**Limitations**:
- Only searches posts in RSS feed (typically last 20-50 posts)
- No full-text search of post body (RSS contains only summaries)
- No advanced search operators (AND, OR, NOT)

### Caching Strategy

**Why caching matters**:
- Serverless functions are stateless and cold-start frequently
- Hatena Blog RSS feeds update infrequently (minutes to hours)
- Reduces API calls to Hatena Blog servers
- Improves response time for repeated queries

**Cache behavior**:
- Keyed by RSS URL: `cache_https://blogid.hatenablog.com/rss`
- TTL-based expiration (default 5 minutes)
- No LRU eviction (acceptable for serverless with memory limits)
- Survives within single function instance lifetime

## Configuration

### Blog ID Format

- Environment variable: `BLOG_ID=example`
- Constructed URL: `https://example.hatenablog.com/rss`
- Supports standard Hatena Blog subdomain format

### Cache Duration Tuning

Balance freshness vs. performance:
- **Short (60-120s)**: Near real-time, more RSS fetches
- **Medium (300s)**: Default, good balance
- **Long (600-1800s)**: Best performance, delayed updates

## Integration with Claude

### Claude Desktop Configuration

Add to `claude_desktop_config.json`:

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

This uses the MCP fetch server as a proxy to HTTP-based MCP servers.

## Common Tasks

### Adding a New Tool

1. Define tool schema in `MCP_TOOLS` array (api/mcp.js:8-56)
2. Add case handler in `handleToolCall` function (api/mcp.js:78-142)
3. Implement method in `HatenaBlogClient` if needed (lib/hatena.js)
4. Update README.md with tool documentation
5. Add test payload to test-data.json

### Modifying Search Algorithm

Edit `searchBlog` method in lib/hatena.js:66-92:
- Adjust filter logic (line 84)
- Add ranking/scoring
- Support advanced search syntax

### Changing Response Format

Modify the formatting in `handleToolCall` function (api/mcp.js:87-99, 107-117, 125-133):
- Keep MCP `content` array structure
- Use markdown for formatting
- Consider mobile readability

### Debugging

**Local debugging**:
```bash
# Enable detailed logging
NODE_ENV=development npm run dev

# Check cache behavior
# Add console.log in lib/hatena.js _fetchWithCache
```

**Production debugging**:
- Check Vercel function logs in dashboard
- Verify environment variables are set
- Test RSS feed accessibility: `curl https://BLOG_ID.hatenablog.com/rss`

## Security Considerations

- **CORS**: Wide open (`Access-Control-Allow-Origin: *`) - appropriate for public API
- **No Authentication**: Public read-only access - acceptable for public blogs
- **Input Validation**: JSON Schema validation via MCP tool definitions
- **XSS Prevention**: HTML stripped from summaries
- **Rate Limiting**: Implicit via cache layer
- **Secrets**: BLOG_ID is not sensitive (public blog identifier)

## Performance Characteristics

**Cold Start** (first request to new function instance):
- ~500-1000ms with RSS fetch
- Includes npm package loading and XML parsing

**Warm Cache** (subsequent requests):
- ~50-100ms (cache hit)

**Memory Usage**:
- Minimal: single RSS feed + parsed JSON
- Typical: <10MB per instance

**Vercel Limits**:
- Function timeout: 10s (hobby), 60s (pro)
- Memory: 1024MB
- No persistent storage (cache is per-instance)

## Testing Strategy

**Current State**: No automated tests

**Recommended Testing Approach**:
1. **Unit Tests**: lib/hatena.js methods with mocked fetch
2. **Integration Tests**: api/mcp.js with test-data.json payloads
3. **E2E Tests**: Real requests to deployed Vercel function

**Manual Testing**:
- Use test-data.json with curl/httpie
- Test with real Hatena Blog feeds
- Verify cache behavior with timing measurements

## Troubleshooting

### "Post not found" for get_post_by_url
- URL must exactly match RSS feed entry
- Only searches recent 50 posts (RSS feed limit)
- Check URL format matches Hatena Blog canonical URLs

### Empty search results
- Verify BLOG_ID is correct
- Check RSS feed is accessible: `https://BLOG_ID.hatenablog.com/rss`
- Keyword matching is case-insensitive but exact substring

### Cache not working
- Cache is per-function instance
- Serverless functions scale to zero (cache lost)
- Check CACHE_DURATION environment variable

### CORS errors in browser
- Verify setCorsHeaders is called for all responses
- Check OPTIONS preflight handling (line 147-150)

## Future Improvements

Potential enhancements (not currently implemented):

- [ ] Add vercel.json for explicit function configuration
- [ ] Implement automated tests (Jest)
- [ ] Support pagination for large result sets
- [ ] Add more robust feed format detection
- [ ] Implement Redis caching for cross-instance sharing
- [ ] Add telemetry/monitoring (Vercel Analytics)
- [ ] Support multiple blogs (multi-tenant)
- [ ] Add tag/category filtering tool
- [ ] Implement date range filtering
- [ ] Add full content fetching (scraping post pages)
- [ ] Support Hatena Blog API (not just RSS)

## Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Hatena Blog RSS Format](http://developer.hatena.ne.jp/ja/documents/blog/apis/atom)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [xml2js Documentation](https://github.com/Leonidas-from-XIV/node-xml2js)

## License

MIT License - See package.json

---

**Last Updated**: 2026-01-15
**Project Status**: Production-ready, actively maintained
