import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import MarkdownIt from 'markdown-it';
import { katex } from '@mdit/plugin-katex';
import { postTableOfContents } from '../../ui/posts/toc.ts';
import PostLayout from '../../ui/posts/layouts/post.11ty.ts';

const markdown = () => new MarkdownIt({ html: true }).use(katex).use(postTableOfContents);
const documentFor = (html: string) => parseHTML(`<html><body>${html}</body></html>`).document;

function assertLinksResolve(document: Document) {
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')];
  const links = [...document.querySelectorAll('.post-toc a')];
  assert.equal(links.length, headings.length);
  links.forEach((link, index) => {
    const id = decodeURIComponent(link.getAttribute('href')!.slice(1));
    assert.equal(document.getElementById(id), headings[index]);
  });
  return { headings, links };
}

test('HTML headings retain explicit IDs, reserved IDs, Korean duplicates and empty slugs', () => {
  const document = documentFor(markdown().render('<div id="반복"></div><h1>반복</h1><h3>반복</h3><h2 id="saved">A &amp; <code>B</code></h2><h2>!!!</h2><h2>!!!</h2>', { toc: true }));
  const { headings, links } = assertLinksResolve(document);
  assert.deepEqual(headings.map(node => node.id), ['반복-1', '반복-2', 'saved', 'section', 'section-1']);
  assert.equal(links[2].textContent, 'A & B');
  assert.equal(links[2].children.length, 0);
  assert.equal(document.querySelectorAll('h2 code').length, 1);
});

test('no headings produce no TOC and body markup is preserved', () => {
  const source = '본문\n\n```html\n<h2>코드</h2>\n```';
  assert.equal(markdown().render(source, { toc: true }), new MarkdownIt().render(source));
});

test('only front matter true enables TOC, while anchors remain available when off', () => {
  for (const toc of [undefined, false, 'true', true]) {
    const content = markdown().render('## 본문\n\n[[toc]]', { toc });
    const html = new PostLayout().render({ content, page: { url: '/posts/example/' }, collections: { posts: [] } });
    const document = documentFor(html);
    assert.equal(document.querySelectorAll('.post-toc').length, toc === true ? 1 : 0);
    assert.equal(document.querySelector('h2')!.id, '본문');
    assert.equal(document.querySelector('h2')!.getAttribute('tabindex'), '-1');
    assert.match(document.body.textContent!, /\[\[toc\]\]/);
  }
});

test('math TOC labels render once and keep pre-math anchors without changing the body', () => {
  const source = '## 복잡도 $O(n)$\n\n## 복잡도 $O(n)$\n\n## 관계 $\\alpha + \\beta$와 $x < y$';
  const document = documentFor(markdown().render(source, { toc: true }));
  const { headings, links } = assertLinksResolve(document);
  const old = documentFor(new MarkdownIt().use(postTableOfContents).render(source));
  assert.deepEqual(headings.map(node => node.id), [...old.querySelectorAll('h2')].map(node => node.id));
  assert.deepEqual(headings.slice(0, 2).map(node => node.id), ['복잡도-on', '복잡도-on-1']);
  assert.deepEqual(links.map(link => link.querySelectorAll('.katex').length), [1, 1, 2]);
  assert.deepEqual([...links[2].querySelectorAll('.katex annotation')].map(node => node.textContent), ['\\alpha + \\beta', 'x < y']);
  // KaTeX's visual HTML is aria-hidden; its MathML remains accessible in each link.
  assert.equal(document.querySelectorAll('.post-toc .katex-html[aria-hidden="true"]').length, 4);
  const original = documentFor(new MarkdownIt().use(katex).render(source));
  assert.deepEqual(headings.map(node => node.innerHTML), [...original.querySelectorAll('h2')].map(node => node.innerHTML));
});

test('raw HTML math headings retain explicit anchors and intact accessible math', () => {
  const math = new MarkdownIt().use(katex).renderInline('$O(n)$');
  for (const toc of [false, true]) {
    const document = documentFor(markdown().render(`<h2 id="complexity">복잡도 ${math}</h2>`, { toc }));
    assert.equal(document.querySelector('h2')!.id, 'complexity');
    assert.equal(document.querySelector('.post-toc a')?.textContent, toc ? '복잡도 O(n)' : undefined);
    assert(document.querySelector('h2 .katex-mathml annotation'));
    assert(document.querySelector('h2 .katex-html'));
  }
});

test('Markdown and HTML headings share one registry including later explicit and inline IDs', () => {
  const source = '## 반복\n\n<div><h2 id="반복">고정</h2><h2>반복</h2></div>\n\n## 반복\n\n<span id="반복-1"></span>인라인';
  const document = documentFor(markdown().render(source, { toc: true }));
  assert.deepEqual(assertLinksResolve(document).headings.map(node => node.id), ['반복-2', '반복', '반복-3', '반복-4']);
});

test('TOC handles all heading levels, escaped text and links without nested anchors', () => {
  const source = '### 먼저\n\n# 시작\n\n###### [링크](https://example.com) & `A<B>`\n\n## !!!\n\n## !!!\n\n## <span>HTML &amp; 텍스트</span>';
  const document = documentFor(markdown().render(source, { toc: true }));
  const { links } = assertLinksResolve(document);
  assert.equal(links[2].textContent, '링크 & A<B>');
  assert.equal(links[5].textContent, 'HTML & 텍스트');
  assert.equal(document.querySelectorAll('.post-toc a a').length, 0);
  assert.equal(document.querySelectorAll('.post-toc li > ol').length > 0, true);
});

test('reusing the Markdown engine and environment cannot leak IDs or TOCs between pages', () => {
  const md = markdown();
  const env = { toc: true };
  const first = md.render('## 같은 제목\n\n## 같은 제목', env);
  assert.equal(md.render('## 같은 제목\n\n## 같은 제목', env), first);
  const next = documentFor(md.render('## 다른 제목', env));
  assertLinksResolve(next);
  assert.doesNotMatch(next.body.innerHTML, /같은 제목/);
  assert.equal(documentFor(md.render('본문', env)).querySelector('.post-toc'), null);
});

test('explicit fragments and heading text are escaped safely in TOC links', () => {
  const source = '<h2 id="a&amp;&quot;&lt;b">&lt;img src=x onerror=alert(1)&gt;</h2>\n\n## `&lt;script&gt;`';
  const document = documentFor(markdown().render(source, { toc: true }));
  const { links } = assertLinksResolve(document);
  assert.equal(links[0].textContent, '<img src=x onerror=alert(1)>');
  assert.equal(document.querySelector('.post-toc img, .post-toc script, .post-toc [onerror]'), null);
});
