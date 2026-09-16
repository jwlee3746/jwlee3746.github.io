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
  eleventyConfig.addWatchTarget('pages/**/*.ts');
  eleventyConfig.addWatchTarget('scripts/site/**/*.ts');
  eleventyConfig.addWatchTarget('scripts/resume/data.ts');
  return {
    dir: { input: '.', output: '_site', includes: 'pages/shared', data: 'data' },
    templateFormats: ['md', '11ty.ts'],
    markdownTemplateEngine: 'liquid',
  };
}
