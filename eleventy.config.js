import { globSync } from 'node:fs';
import Prism from 'prismjs';
import loadLanguages from 'prismjs/components/index.js';
import { katex } from '@mdit/plugin-katex';
import { groupCategories } from './ui/posts/categories.ts';
import { legacyRedirects } from './ui/posts/legacy-urls.ts';
import { postTableOfContents } from './ui/posts/toc.ts';

loadLanguages.silent = true;

export default function (eleventyConfig) {
  eleventyConfig.amendLibrary('md', markdown => markdown.use(katex, {
    transformer: (html, display) => display
      ? `<div class="math-block" tabindex="0" role="region" aria-label="수식">${html}</div>`
      : html,
  }).use(postTableOfContents));
  eleventyConfig.addPassthroughCopy({
    'node_modules/katex/dist/katex.min.css': 'theme/posts/katex/katex.min.css',
    'node_modules/katex/dist/fonts': 'theme/posts/katex/fonts',
  });
  eleventyConfig.addMarkdownHighlighter((code, language) => {
    if (language) loadLanguages(language);
    const grammar = Object.hasOwn(Prism.languages, language) ? Prism.languages[language] : undefined;
    const highlighted = grammar && typeof grammar === 'object'
      ? Prism.highlight(code, grammar, language)
      : code.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    return `<pre tabindex="0"><code>${highlighted}</code></pre>`;
  });
  // Node 24 executes erasable TypeScript; type checking is a separate build check.
  eleventyConfig.addExtension('11ty.ts', { key: '11ty.js' });
  eleventyConfig.addPassthroughCopy({ public: '.' });
  eleventyConfig.addPassthroughCopy('theme.css');
  eleventyConfig.addPassthroughCopy({ 'jaewon-lee-resume.pdf': 'resume/jaewon-lee-resume.pdf' });
  eleventyConfig.addPassthroughCopy('data/images');
  eleventyConfig.addPassthroughCopy({ 'data/pdf': 'blog/assets/docs' });
  eleventyConfig.addPassthroughCopy('data/pdf');
  // Keep public asset URLs stable while colocating source files under ui/.
  // Copy only browser assets, never TypeScript templates or helper modules.
  for (const path of globSync('ui/**/*.{css,js}')) {
    eleventyConfig.addPassthroughCopy({ [path]: path.replace(/^ui\//, 'theme/') });
  }
  eleventyConfig.ignores.add('**/README.md');
  eleventyConfig.ignores.add('**/AGENTS.md');
  eleventyConfig.ignores.add('CLAUDE.md');
  eleventyConfig.ignores.add('docs/**');
  // Eleventy's JS dependency parser cannot parse native TypeScript imports.
  // Explicit watch targets below cover those modules and their data instead.
  eleventyConfig.setWatchJavaScriptDependencies(false);
  // Render functions load validated data and partials themselves. Watch both,
  // even when a newly added JSON file was not a dependency of the last render.
  eleventyConfig.addWatchTarget('data/**/*.json');
  eleventyConfig.addWatchTarget('ui/**/*.ts', { resetConfig: true });
  eleventyConfig.addWatchTarget('scripts/site/**/*.ts');
  eleventyConfig.addWatchTarget('scripts/resume/data.ts');
  eleventyConfig.addCollection('posts', collection => {
    const posts = collection.getFilteredByGlob('data/posts/**/*.md');
    // Flat data/posts/YYYY-MM-DD-slug.md; classify content with front matter tags.
    const filename = /^\.\/data\/posts\/\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
    for (const post of posts) {
      if (!filename.test(post.inputPath)) {
        throw new Error(`Use data/posts/YYYY-MM-DD-slug.md and tags, not category directories: ${post.inputPath}`);
      }
    }
    return posts;
  });
  eleventyConfig.addCollection('categories', collection =>
    groupCategories(collection.getFilteredByGlob('data/posts/**/*.md')));
  eleventyConfig.addCollection('legacyRedirects', collection =>
    legacyRedirects(collection.getFilteredByGlob('data/posts/**/*.md')));
  // JSON is loaded by scripts; leave Eleventy's global data directory at its
  // default so data/posts remains part of the Markdown template input.
  return {
    dir: { input: '.', output: '_site', includes: 'ui/shared', layouts: 'ui/posts/layouts' },
    templateFormats: ['md', '11ty.ts'],
    markdownTemplateEngine: false,
  };
}
