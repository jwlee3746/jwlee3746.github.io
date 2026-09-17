import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { searchText } from '../../ui/posts/search-text.ts';
import { renderPostList, type Post } from '../../ui/posts/list.ts';

const post: Post = {
  url: '/posts/example/', date: new Date('2024-01-01'),
  data: { title: '예시', category: 'Algorithm', tags: ['C++'], excerpt: '요약' },
  templateContent: '<p>본문 전용단어 &amp; back<strong>track</strong></p><pre><code>return &quot;&lt;value&gt;&quot;;</code></pre>',
};

test('search text retains inline words, separates blocks, and decodes entities', () => {
  assert.equal(searchText(post.templateContent!), '본문 전용단어 & backtrack return "<value>";');
  assert.equal(searchText('<h2>한글</h2><p>본문</p><ul><li>첫째</li><li>둘째</li></ul>'), '한글 본문 첫째 둘째');
});

test('search text excludes scripts, styles, templates, TOC and duplicate math markup', () => {
  assert.equal(searchText(`<nav class="post-toc">목차전용</nav><p>visible</p>
    <script>unwanted()</script><style>.hidden { color: red }</style><template>unused</template>
    <span class="katex"><span class="katex-mathml">duplicate</span><span class="katex-html">x + y</span></span>`), 'visible x + y');
});

test('only the searchable list includes body text and escapes it as inert attribute data', () => {
  const document = parseHTML(renderPostList([post], { searchBody: true })).document;
  const card = document.querySelector('.post-card')!;
  assert.match(card.getAttribute('data-search')!, /예시 요약 Algorithm C\+\+ 본문/);
  assert.match(card.getAttribute('data-search')!, /전용단어 & backtrack return "<value>";/);
  assert.equal(document.querySelector('value'), null);
  assert(!card.textContent.includes('전용단어'));
  const ordinary = parseHTML(renderPostList([post])).document;
  assert(!ordinary.querySelector('.post-card')!.getAttribute('data-search')!.includes('전용단어'));
  assert.doesNotThrow(() => renderPostList([{ ...post, templateContent: undefined }], { searchBody: true }));
});
