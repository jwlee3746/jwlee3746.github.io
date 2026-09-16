import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import MarkdownIt from 'markdown-it';
import { katex } from '@mdit/plugin-katex';
import { renderTableOfContents } from '../../ui/posts/toc.ts';
import PostLayout from '../../ui/posts/layouts/post.11ty.ts';

test('every TOC link resolves with duplicate, Korean, empty and explicit headings', () => {
  const result = renderTableOfContents('<div id="반복"></div><h1>반복</h1><h3>반복</h3><h2 id="saved">A &amp; <code>B</code></h2><h2>!!!</h2><h2>!!!</h2>');
  const { document } = parseHTML(`<html><body>${result.toc}${result.content}</body></html>`);
  const headings = [...document.querySelectorAll('h1,h2,h3')];
  assert.deepEqual(headings.map(node => node.id), ['반복-1', '반복-2', 'saved', 'section', 'section-1']);
  const links = [...document.querySelectorAll('nav a')];
  assert.equal(links.length, headings.length);
  links.forEach((link, index) => {
    const id = decodeURIComponent(link.getAttribute('href')!.slice(1));
    assert.equal(document.getElementById(id), headings[index]);
  });
  assert.equal(links[2].textContent, 'A & B');
  assert.equal(links[2].children.length, 0);
});

test('no headings produce no TOC and body markup is preserved', () => {
  const content = '<p>본문</p><pre><code>&lt;h2&gt;코드&lt;/h2&gt;</code></pre>';
  assert.deepEqual(renderTableOfContents(content), { content, toc: '' });
});

test('TOC requires true, while heading anchors remain available with TOC off', () => {
  for (const toc of [undefined, false, true]) {
    const html = new PostLayout().render({ content: '<h2>본문</h2>', toc });
    assert.equal(html.includes('aria-label="목차"'), toc === true);
    assert.match(html, /<h2 id="본문">본문<\/h2>/);
    assert.doesNotMatch(html, /<h1 id=/);
  }
});

test('math headings have one readable TOC label and keep their pre-math anchors', () => {
  const source = '## 복잡도 $O(n)$\n\n## 복잡도 $O(n)$\n\n## 관계 $\\alpha + \\beta$와 $x < y$';
  const plain = renderTableOfContents(new MarkdownIt().render(source));
  const rendered = new MarkdownIt().use(katex).render(source);
  const result = renderTableOfContents(rendered);
  const { document } = parseHTML(`<html><body>${result.toc}${result.content}</body></html>`);
  const old = parseHTML(`<html><body>${plain.content}</body></html>`).document;
  const headings = [...document.querySelectorAll('h2')];
  assert.deepEqual(headings.map(node => node.id), [...old.querySelectorAll('h2')].map(node => node.id));
  assert.deepEqual(headings.slice(0, 2).map(node => node.id), ['복잡도-on', '복잡도-on-1']);
  const links = [...document.querySelectorAll('.post-toc a')];
  assert.deepEqual(links.map(node => node.textContent), ['복잡도 O(n)', '복잡도 O(n)', '관계 α+β와 x<y']);
  links.forEach((link, index) => {
    assert.equal(document.getElementById(decodeURIComponent(link.getAttribute('href')!.slice(1))), headings[index]);
    assert.equal(link.children.length, 0);
  });
  // The body must retain both visual math and accessible MathML/annotations.
  const original = parseHTML(`<html><body>${rendered}</body></html>`).document;
  assert.deepEqual(headings.map(node => node.innerHTML), [...original.querySelectorAll('h2')].map(node => node.innerHTML));
});

test('math headings retain explicit anchors and do not create a TOC when disabled', () => {
  const math = new MarkdownIt().use(katex).renderInline('$O(n)$');
  const content = `<h2 id="complexity">복잡도 ${math}</h2>`;
  for (const toc of [false, true]) {
    const html = new PostLayout().render({ content, toc });
    const { document } = parseHTML(`<html><body>${html}</body></html>`);
    assert.equal(document.querySelector('h2')!.id, 'complexity');
    assert.equal(document.querySelector('.post-toc a')?.textContent, toc ? '복잡도 O(n)' : undefined);
    assert(document.querySelector('h2 .katex-mathml annotation'));
    assert(document.querySelector('h2 .katex-html'));
  }
});
