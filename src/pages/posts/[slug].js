import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import { ArrowLeft } from "lucide-react"; // ← Lucide icon
import { useSelector, useDispatch } from "react-redux";
import { fetchPosts, likePost as reduxLikePost } from "../../redux/posts/postsSlice";

export default function SinglePost() {
  const router = useRouter();
  const { slug } = router.query;

  const dispatch = useDispatch();
  const posts = useSelector((state) => state.posts.items);
  const loading = useSelector((state) => state.posts.loading);

  const [post, setPost] = useState(null);

  useEffect(() => {
    // If posts not yet loaded, fetch them
    if (!posts.length) {
      dispatch(fetchPosts());
    }
  }, [dispatch, posts.length]);

  useEffect(() => {
    if (!slug || !posts.length) return;

    const found = posts.find((p) => p.slug === slug);
    setPost(found);
  }, [slug, posts]);

  const likePost = async () => {
    if (!post) return;
    try {
      await dispatch(reduxLikePost(post.id));
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
          <span>
            Published:{" "}
            {post.createdAt?.seconds
              ? new Date(post.createdAt.seconds * 1000).toLocaleDateString()
              : ""}
          </span>
          <span>{post.likes || 0} ❤️ Likes</span>
        </div>

        {post.images?.[0] && <img src={post.images[0]} alt={post.title} />}
        <div
          className="post-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <button className="like-btn" onClick={likePost}>
          ❤️ Like {post.likes || 0}
        </button>
      </div>
    </>
  );
}
