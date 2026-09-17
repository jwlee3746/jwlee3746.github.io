import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { postMetadata } from '../../ui/posts/metadata.ts';
const input = { title: '</script><script>bad()</script>', description: '<p>A &amp; B "설명"</p>', url: 'https://example.com/posts/a/', author: '이름' };
test('article metadata uses canonical URL and safely serializes titles and descriptions', () => {
  const doc = parseHTML(postMetadata({ ...input, date: '2024-05-01' })).document;
  assert.equal(doc.querySelectorAll('script').length, 1);
  const schema = JSON.parse(doc.querySelector('script')!.textContent!);
  assert.equal(schema.headline, input.title);
  assert.equal(schema.mainEntityOfPage, input.url);
  assert.equal(schema.datePublished, '2024-05-01T00:00:00.000Z');
  assert.equal(doc.querySelector('meta[name=description]')?.getAttribute('content'), 'A & B "설명"');
  assert(!postMetadata({ ...input, date: '2024-05-01' }).includes('og:image'));
});
test('listing pages have a description but no article schema', () => {
  const doc = parseHTML(postMetadata(input)).document;
  assert.equal(doc.querySelector('script'), null);
  assert(doc.querySelector('meta[name=author]'));
});
