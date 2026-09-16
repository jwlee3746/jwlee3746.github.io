export default function (eleventyConfig) {
  // Node 24 executes erasable TypeScript; type checking is a separate build check.
  eleventyConfig.addExtension('11ty.ts', { key: '11ty.js' });
  eleventyConfig.addPassthroughCopy({ public: '.' });
  eleventyConfig.addPassthroughCopy({ 'jaewon-lee-resume.pdf': 'resume/jaewon-lee-resume.pdf' });
  for (const path of ['data/images', 'theme/**/*.css', 'theme/**/*.js']) {
    eleventyConfig.addPassthroughCopy(path);
  }
  eleventyConfig.ignores.add('**/README.md');
  eleventyConfig.ignores.add('**/AGENTS.md');
  eleventyConfig.ignores.add('CLAUDE.md');
  eleventyConfig.ignores.add('docs/**');
  // Render functions load validated data and partials themselves. Watch both,
  // even when a newly added JSON file was not a dependency of the last render.
  eleventyConfig.addWatchTarget('data/**/*.json');
  eleventyConfig.addWatchTarget('templates/**/*.ts');
  eleventyConfig.addWatchTarget('scripts/site/**/*.ts');
  eleventyConfig.addWatchTarget('scripts/resume/data.ts');
  // JSON is loaded by scripts; leave Eleventy's global data directory at its
  // default so data/posts remains part of the Markdown template input.
  return {
    dir: { input: '.', output: '_site', includes: 'templates/shared' },
    templateFormats: ['md', '11ty.ts'],
    markdownTemplateEngine: 'liquid',
  };
}
