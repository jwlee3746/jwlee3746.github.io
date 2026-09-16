import { escapeHtml } from "../../shared/html.ts";
import { formatDate } from "../date.ts";

interface Post {
  url: string;
  date: Date;
  data: { title: string };
}

export const data = { layout: "page.11ty.ts" };

export default function ({ collections }: { collections: { posts: Post[] } }): string {
  if (collections.posts.length === 0) {
    return "<p>아직 이전된 글이 없습니다.</p>";
  }
  const items = [...collections.posts].reverse().map((post) => {
    const date = formatDate(post.date);
    return `<li>
      <a href="${escapeHtml(post.url)}">${escapeHtml(post.data.title)}</a>
      <time datetime="${date}">${date}</time>
    </li>`;
  });
  return `<ul>${items.join("\n")}</ul>`;
}
