const xml2js = require('xml2js');

class HatenaBlogClient {
  constructor(blogId, cacheDuration = 300) {
    this.blogId = blogId;
    this.cacheDuration = cacheDuration * 1000; // Convert to milliseconds
    this.cache = new Map();
  }

  _getCacheKey(url) {
    return `cache_${url}`;
  }

  _isValidCache(cacheEntry) {
    return cacheEntry && (Date.now() - cacheEntry.timestamp) < this.cacheDuration;
  }

  async _fetchWithCache(url) {
    const cacheKey = this._getCacheKey(url);
    const cached = this.cache.get(cacheKey);

    if (this._isValidCache(cached)) {
      return cached.data;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlData = await response.text();
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(xmlData);

      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to fetch ${url}: ${error.message}`);
    }
  }

  _extractPostData(entry) {
    const title = entry.title?.[0]?._ || entry.title?.[0] || 'No title';
    const link = entry.link?.[0]?.$?.href || entry.link?.[0] || '';
    const published = entry.published?.[0] || entry['dc:date']?.[0] || '';
    const updated = entry.updated?.[0] || entry['dc:date']?.[0] || '';
    const summary = entry.summary?.[0]?._ || entry.summary?.[0] || entry.content?.[0]?._ || entry.content?.[0] || '';
    const categories = entry.category?.map(cat => cat.$?.term || cat).filter(Boolean) || [];

    return {
      title,
      link,
      published,
      updated,
      summary: summary.replace(/<[^>]*>/g, '').substring(0, 500),
      categories,
      content: summary
    };
  }

  async searchBlog(keyword, limit = 10) {
    try {
      const feedUrl = `https://${this.blogId}.hatenablog.com/rss`;
      const result = await this._fetchWithCache(feedUrl);

      if (!result.rss?.channel?.[0]?.item && !result.feed?.entry) {
        return [];
      }

      const entries = result.rss?.channel?.[0]?.item || result.feed?.entry || [];
      
      if (!Array.isArray(entries)) {
        return [];
      }

      const posts = entries.map(entry => this._extractPostData(entry));

      const filteredPosts = posts.filter(post => {
        const searchText = `${post.title} ${post.summary} ${post.categories.join(' ')}`.toLowerCase();
        return searchText.includes(keyword.toLowerCase());
      });

      return filteredPosts.slice(0, limit);
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  async getRecentPosts(limit = 10) {
    try {
      const feedUrl = `https://${this.blogId}.hatenablog.com/rss`;
      const result = await this._fetchWithCache(feedUrl);

      if (!result.rss?.channel?.[0]?.item && !result.feed?.entry) {
        return [];
      }

      const entries = result.rss?.channel?.[0]?.item || result.feed?.entry || [];
      
      if (!Array.isArray(entries)) {
        return [];
      }

      const posts = entries.map(entry => this._extractPostData(entry));
      return posts.slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to get recent posts: ${error.message}`);
    }
  }

  async getPostByUrl(url) {
    try {
      const recentPosts = await this.getRecentPosts(50);
      const post = recentPosts.find(p => p.link === url);

      if (!post) {
        throw new Error('Post not found');
      }

      return post;
    } catch (error) {
      throw new Error(`Failed to get post by URL: ${error.message}`);
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = HatenaBlogClient;