import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
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
