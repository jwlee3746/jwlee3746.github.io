export default function (eleventyConfig) {
  // Keep existing public files at their current URLs.
  for (const path of [
    "*.html",
    ".nojekyll",
    "favicon.svg",
    "resume",
    "data/images",
    "theme/**/*.css",
    "theme/**/*.js",
  ]) {
    eleventyConfig.addPassthroughCopy(path);
  }
  eleventyConfig.ignores.add("README.md");
  eleventyConfig.ignores.add("CLAUDE.md");

  return {
    dir: { input: ".", output: "_site", includes: "theme/posts", data: "data" },
    templateFormats: ["md", "liquid"],
    markdownTemplateEngine: "liquid",
  };
}
