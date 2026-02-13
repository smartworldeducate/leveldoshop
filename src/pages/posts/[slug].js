import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc, increment } from "firebase/firestore";
import { db } from "../../lib/firebaseClient";
import Head from "next/head";
import { ArrowLeft } from "lucide-react"; // ← Lucide icon

export default function SinglePost() {
  const router = useRouter();
  const { slug } = router.query;
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const fetchPost = async () => {
      try {
        const snap = await getDocs(collection(db, "posts"));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const found = data.find(p => p.slug === slug);
        setPost(found);
      } catch (err) {
        console.error("Failed to fetch post:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  const likePost = async () => {
    if (!post) return;
    try {
      await updateDoc(doc(db, "posts", post.id), { likes: increment(1) });
      setPost({ ...post, likes: (post.likes || 0) + 1 });
    } catch (err) {
      console.error("Failed to like post:", err);
    }
  };

  if (loading) return <div className="posts__loading">Loading...</div>;
  if (!post) return <div className="posts__empty">Post not found.</div>;

  return (
    <>
      <Head>
        <title>{post.title} | Your Website</title>
        <meta name="description" content={post.content.slice(0, 150)} />
      </Head>

      <div className="single-post container">
        {/* Back Button */}
        <button className="back-btn" onClick={() => router.back()}>
          <ArrowLeft size={20} /> Back
        </button>

        <h1>{post.title}</h1>
        <div className="post-meta">
          <span>Published: {post.createdAt?.toDate().toLocaleDateString()}</span>
          <span>{post.likes || 0} ❤️ Likes</span>
        </div>

        {post.images?.[0] && <img src={post.images[0]} alt={post.title} />}
        <p>{post.content}</p>

        <button className="like-btn" onClick={likePost}>
          ❤️ Like {post.likes || 0}
        </button>
      </div>
    </>
  );
}
