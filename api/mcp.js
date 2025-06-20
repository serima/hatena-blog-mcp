const HatenaBlogClient = require('../lib/hatena');

const BLOG_ID = process.env.BLOG_ID || 'example';
const CACHE_DURATION = parseInt(process.env.CACHE_DURATION) || 300;

const blogClient = new HatenaBlogClient(BLOG_ID, CACHE_DURATION);

const MCP_TOOLS = [
  {
    name: 'search_blog',
    description: 'Search blog posts by keyword',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: 'Search keyword'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 10)',
          default: 10
        }
      },
      required: ['keyword']
    }
  },
  {
    name: 'get_recent_posts',
    description: 'Get recent blog posts',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 10)',
          default: 10
        }
      }
    }
  },
  {
    name: 'get_post_by_url',
    description: 'Get blog post details by URL',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Blog post URL'
        }
      },
      required: ['url']
    }
  }
];

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization');
}

function createResponse(content, isError = false) {
  return {
    jsonrpc: '2.0',
    id: null,
    [isError ? 'error' : 'result']: content
  };
}

function createErrorResponse(code, message, details = null) {
  const error = { code, message };
  if (details) error.data = details;
  return createResponse(error, true);
}

async function handleToolCall(name, arguments_) {
  try {
    switch (name) {
      case 'search_blog':
        const searchResults = await blogClient.searchBlog(
          arguments_.keyword,
          arguments_.limit || 10
        );
        return {
          content: [
            {
              type: 'text',
              text: `Found ${searchResults.length} posts matching "${arguments_.keyword}":\n\n` +
                    searchResults.map((post, i) => 
                      `${i + 1}. **${post.title}**\n` +
                      `   URL: ${post.link}\n` +
                      `   Published: ${post.published}\n` +
                      `   Summary: ${post.summary}\n` +
                      `   Categories: ${post.categories.join(', ')}\n`
                    ).join('\n')
            }
          ]
        };

      case 'get_recent_posts':
        const recentPosts = await blogClient.getRecentPosts(arguments_.limit || 10);
        return {
          content: [
            {
              type: 'text',
              text: `Recent ${recentPosts.length} posts:\n\n` +
                    recentPosts.map((post, i) =>
                      `${i + 1}. **${post.title}**\n` +
                      `   URL: ${post.link}\n` +
                      `   Published: ${post.published}\n` +
                      `   Summary: ${post.summary}\n` +
                      `   Categories: ${post.categories.join(', ')}\n`
                    ).join('\n')
            }
          ]
        };

      case 'get_post_by_url':
        const post = await blogClient.getPostByUrl(arguments_.url);
        return {
          content: [
            {
              type: 'text',
              text: `**${post.title}**\n\n` +
                    `URL: ${post.link}\n` +
                    `Published: ${post.published}\n` +
                    `Updated: ${post.updated}\n` +
                    `Categories: ${post.categories.join(', ')}\n\n` +
                    `Content:\n${post.content}`
            }
          ]
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    throw new Error(`Tool execution failed: ${error.message}`);
  }
}

module.exports = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json(createErrorResponse(-32601, 'Method not allowed'));
    return;
  }

  try {
    const { method, params, id } = req.body;

    switch (method) {
      case 'initialize':
        res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'hatena-blog-mcp',
              version: '1.0.0'
            }
          }
        });
        break;

      case 'tools/list':
        res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            tools: MCP_TOOLS
          }
        });
        break;

      case 'tools/call':
        if (!params?.name) {
          res.status(400).json(createErrorResponse(-32602, 'Tool name is required'));
          return;
        }

        const result = await handleToolCall(params.name, params.arguments || {});
        res.status(200).json({
          jsonrpc: '2.0',
          id,
          result
        });
        break;

      default:
        res.status(400).json(createErrorResponse(-32601, `Unknown method: ${method}`));
    }
  } catch (error) {
    console.error('MCP Server Error:', error);
    res.status(500).json(createErrorResponse(-32603, 'Internal error', error.message));
  }
};