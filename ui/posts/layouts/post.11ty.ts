export default class PostLayout {
  data() {
    return { layout: 'page.11ty.ts' };
  }

  render({ content }: { content: string }): string {
    return content;
  }
}
