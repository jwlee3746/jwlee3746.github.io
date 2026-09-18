import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DOMParser } from 'linkedom';
import sitemap from '../../ui/sitemap.11ty.ts';
import robots from '../../ui/robots.11ty.ts';
test('sitemap contains canonical posts, categories and tags exactly once, with XML escaping', async () => {
  const xml = await sitemap({ collections: {
    posts: [{ url: '/posts/a/' }, { url: '/posts/a/' }],
    categories: [{ url: '/categories/A&B/' }], tagGroups: [{ url: '/tags/tag-eA/' }],
  } });
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const urls = [...doc.querySelectorAll('loc')].map(node => node.textContent);
  assert.equal(urls.length, 8);
  assert.equal(new Set(urls).size, 8);
  assert(urls.includes('https://jwlee3746.github.io/categories/A&B/'));
  assert(urls.every(url => !url?.includes('/blog/') && !url?.includes('404')));
  assert(xml.includes('A&amp;B'));
  assert.match(await robots(), /Sitemap: https:\/\/jwlee3746.github.io\/sitemap.xml/);
});
