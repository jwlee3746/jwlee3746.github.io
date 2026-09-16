declare module 'markdown-it-table-of-contents' {
  import type MarkdownIt from 'markdown-it';
  import type Token from 'markdown-it/lib/token.mjs';
  const tableOfContents: MarkdownIt.PluginWithOptions<{
    includeLevel?: number[];
    listType?: 'ol' | 'ul';
    transformLink?: (id: string | null) => string | null;
    getTokensText?: (tokens: Token[], inline: Token) => string;
    format?: (html: string) => string;
  }>;
  export default tableOfContents;
}
