import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebaseClient";
import Link from "next/link";

export default function Posts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const snap = await getDocs(collection(db, "posts"));
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        data.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });

        setPosts(data);
      } catch (err) {
        console.error("Error fetching posts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

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
                <img
                  src={p.images?.[0] || "/placeholder.png"}
                  alt={p.title}
                />
              </div>

              <div className="posts__content">
                <div className="posts__meta">
                  <span>
                    {p.createdAt?.seconds
                      ? new Date(
                          p.createdAt.seconds * 1000
                        ).toLocaleDateString()
                      : ""}
                  </span>
                  <span>❤️ {p.likes || 0}</span>
                </div>

                <h3>{p.title}</h3>

                <p>
                  {p.content?.length > 140
                    ? p.content.slice(0, 140) + "..."
                    : p.content}
                </p>

                <span className="read-more">Read More →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
