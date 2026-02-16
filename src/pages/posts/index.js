import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import { fetchPosts } from "../../redux/posts/postsSlice"; // Redux actions

export default function Posts() {
  const dispatch = useDispatch();
  const posts = useSelector((state) => state.posts.items);
  const loading = useSelector((state) => state.posts.loading);

  useEffect(() => {
    dispatch(fetchPosts());
  }, [dispatch]);

  function truncateHTMLContent(html, maxLength = 140) {
  const div = document.createElement("div");
  div.innerHTML = html;

  let result = "";
  let length = 0;

  function traverse(node) {
    if (length >= maxLength) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const remaining = maxLength - length;
      const text = node.textContent.slice(0, remaining);
      result += text;
      length += text.length;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      result += `<${node.tagName.toLowerCase()}${[...node.attributes]
        .map((attr) => ` ${attr.name}="${attr.value}"`)
        .join("")}>`;
      node.childNodes.forEach(traverse);
      result += `</${node.tagName.toLowerCase()}>`;
    }
  }

  div.childNodes.forEach(traverse);

  if (length >= maxLength) result += "...";
  return result;
}


  return (
    <div className="posts container">
      <div className="posts__header">
        <h1 className="section-title">Latest Articles</h1>
        <p className="section-subtitle">
          Insights, updates, and valuable knowledge from our blog
        </p>
      </div>

      {loading ? (
        <div className="posts__loading">Loading posts...</div>
      ) : posts.length === 0 ? (
        <div className="posts__empty">No posts available yet.</div>
      ) : (
        <div className="posts__grid">
          {posts.map((p) => (
            <Link key={p.id} href={`/posts/${p.slug}`} className="posts__card">
              <div className="posts__image">
                <img src={p.images?.[0] || "/placeholder.png"} alt={p.title} />
              </div>

              <div className="posts__content">
                <div className="posts__meta">
                  <span>
                    {p.createdAt?.seconds
                      ? new Date(p.createdAt.seconds * 1000).toLocaleDateString()
                      : ""}
                  </span>
                  <span>❤️ {p.likes || 0}</span>
                </div>

                <h3>{p.title}</h3>

                <p
                  dangerouslySetInnerHTML={{
                    __html: truncateHTMLContent(p.content, 140),
                  }}
                />

                <span className="read-more">Read More →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
