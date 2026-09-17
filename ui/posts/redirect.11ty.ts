export const data = { permalink: '/blog/index.html', eleventyExcludeFromCollections: true };

export default function (): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<title>글 목록으로 이동</title><meta http-equiv="refresh" content="0;url=/blog/posts/">
<link rel="canonical" href="https://jwlee3746.github.io/blog/posts/"></head>
<body><a href="/blog/posts/">전체 글 목록으로 이동</a></body></html>`;
}
