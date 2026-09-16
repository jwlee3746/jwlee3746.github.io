import { globSync } from 'node:fs';

export default function (eleventyConfig) {
  // Node 24 executes erasable TypeScript; type checking is a separate build check.
  eleventyConfig.addExtension('11ty.ts', { key: '11ty.js' });
  eleventyConfig.addPassthroughCopy({ public: '.' });
  eleventyConfig.addPassthroughCopy({ 'jaewon-lee-resume.pdf': 'resume/jaewon-lee-resume.pdf' });
  eleventyConfig.addPassthroughCopy('data/images');
  // Keep public asset URLs stable while colocating source files under ui/.
  // Copy only browser assets, never TypeScript templates or helper modules.
  for (const path of globSync('ui/**/*.{css,js}')) {
    eleventyConfig.addPassthroughCopy({ [path]: path.replace(/^ui\//, 'theme/') });
  }
  eleventyConfig.ignores.add('**/README.md');
  eleventyConfig.ignores.add('**/AGENTS.md');
  eleventyConfig.ignores.add('CLAUDE.md');
  eleventyConfig.ignores.add('docs/**');
  // Render functions load validated data and partials themselves. Watch both,
  // even when a newly added JSON file was not a dependency of the last render.
  eleventyConfig.addWatchTarget('data/**/*.json');
  eleventyConfig.addWatchTarget('ui/**/*.ts');
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
  // JSON is loaded by scripts; leave Eleventy's global data directory at its
  // default so data/posts remains part of the Markdown template input.
  return {
    dir: { input: '.', output: '_site', includes: 'ui/shared', layouts: 'ui/posts/layouts' },
    templateFormats: ['md', '11ty.ts'],
    markdownTemplateEngine: false,
  };
}
