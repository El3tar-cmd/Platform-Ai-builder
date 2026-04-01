/**
 * SearchService.ts
 * A lightweight, client-side Web Search service using DuckDuckGo Lite and a CORS Proxy.
 * Provides up-to-date context for the LLM without requiring a dedicated backend.
 */

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

export class SearchService {
  // Using a fast, public CORS proxy to bypass browser restrictions
  private static PROVIDERS = [
    'https://searx.be/search',
    'https://paulgo.io/search',
    'https://searx.work/search',
    'https://baresearch.org/search',
    'https://searx.cat/search'
  ];

  private static CORS_PROXIES = [
    'https://api.allorigins.win/get?url=',
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?'
  ];

  /**
   * Primary Search Entry Point: Tries DDG Instant first, then the Matrix.
   */
  static async searchWeb(query: string, maxResults = 5): Promise<string> {
    console.group(`🌐 Smart Research: "${query}"`);
    
    // Tier 1: DuckDuckGo Instant (High Performance, No Scraping)
    console.log('Tier 1: Trying DuckDuckGo Instant API...');
    const ddgResults = await this.searchDDGInstant(query);
    if (ddgResults.length > 0) {
      console.log(`✅ Tier 1 Success: ${ddgResults.length} results.`);
      console.groupEnd();
      return this.formatResults(ddgResults);
    }

    // Tier 2: Resilient Matrix (SearXNG + Proxy Rotation)
    console.log('Tier 2: Falling back to Deep Web Matrix...');
    for (const provider of this.PROVIDERS) {
      for (const proxy of this.CORS_PROXIES) {
        try {
          const searchUrl = `${provider}?q=${encodeURIComponent(query)}&format=json&safesearch=1`;
          const url = proxy.includes('raw') || proxy.includes('corsproxy') 
            ? `${proxy}${encodeURIComponent(searchUrl)}`
            : `${proxy}${encodeURIComponent(searchUrl)}`;

          const response = await fetch(url);
          if (!response.ok) continue;

          let data;
          if (proxy.includes('get?url=')) {
            const wrapper = await response.json();
            data = JSON.parse(wrapper.contents);
          } else {
            data = await response.json();
          }

          if (data?.results?.length > 0) {
            const results = data.results.slice(0, maxResults).map((r: any) => ({
              title: this.clean(r.title),
              link: r.url || r.link,
              snippet: this.clean(r.content || r.snippet)
            }));
            console.log(`✅ Tier 2 Success via ${provider} (${proxy})`);
            console.groupEnd();
            return this.formatResults(results);
          }
        } catch (err) { /* Silent fail to next proxy/provider */ }
      }
    }

    console.groupEnd();
    return "System Note: Extensive web search was attempted but no reliable results were found. Please rely on your internal technical training for best practices.";
  }

  private static async searchDDGInstant(query: string): Promise<SearchResult[]> {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      const wrapper = await response.json();
      const data = JSON.parse(wrapper.contents);

      const results: SearchResult[] = [];
      if (data.AbstractText) {
        results.push({
          title: data.Heading || 'Main Insight',
          link: data.AbstractURL,
          snippet: data.AbstractText
        });
      }

      const related = data.RelatedTopics || [];
      related.slice(0, 3).forEach((r: any) => {
        if (r.Text && r.FirstURL) {
          results.push({ title: 'Contextual info', link: r.FirstURL, snippet: r.Text });
        }
      });

      return results;
    } catch { return []; }
  }

  private static formatResults(results: SearchResult[]): string {
    let context = '\n\n--- WEB SEARCH RESULTS (LIVE INTELLIGENCE) ---\n';
    results.forEach((r, idx) => {
      context += `${idx + 1}. **${r.title}**\n   Link: ${r.link}\n   Snippet: ${r.snippet}\n\n`;
    });
    context += '--- END WEB SEARCH ---\nINSTRUCTION: Analyze these results and prioritize "Best Practices" in your response.\n';
    return context;
  }

  private static clean(s: string): string {
    return (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }
}
