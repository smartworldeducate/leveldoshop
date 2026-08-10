import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";

import PageGuard from "../../components/PageGuard";
import SectionHead from "../../components/SectionHead";
import { fetchPosts, likePost as reduxLikePost } from "../../redux/posts/postsSlice";
import { excerptOf, formatPostDate, readingTime } from "../../utils/post";

const LIKED_KEY = "likedPosts";

function SinglePost() {
  const router = useRouter();
  const { slug } = router.query;

  const dispatch = useDispatch();
  const posts = useSelector((state) => state.posts.items);
  const loading = useSelector((state) => state.posts.loading);

  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!posts.length) dispatch(fetchPosts());
  }, [dispatch, posts.length]);

  const post = useMemo(() => posts.find((p) => p.slug === slug), [posts, slug]);
  const more = useMemo(
    () => posts.filter((p) => p.slug !== slug).slice(0, 3),
    [posts, slug]
  );

  // One like per reader per post, remembered locally.
  useEffect(() => {
    if (typeof window === "undefined" || !post) return;
    try {
      const stored = JSON.parse(window.localStorage.getItem(LIKED_KEY) || "[]");
      setLiked(stored.includes(post.id));
    } catch {
      setLiked(false);
    }
  }, [post]);

  const like = async () => {
    if (!post || liked) return;
    setLiked(true);
    try {
      await dispatch(reduxLikePost(post.id)).unwrap();
      const stored = JSON.parse(window.localStorage.getItem(LIKED_KEY) || "[]");
      window.localStorage.setItem(LIKED_KEY, JSON.stringify([...stored, post.id]));
    } catch {
      setLiked(false);
    }
  };

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, url });
        return;
      } catch {
        /* cancelled — fall through to copying */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked; nothing useful to do */
    }
  };

  if (loading && !post) {
    return (
      <div className="article">
        <div className="article__skeleton" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="catalog__empty">
        <i className="bx bx-news"></i>
        <p>That article does not exist or has been removed.</p>
        <Link href="/posts" className="catalog__filter__clear">
          Back to the blog
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{`${post.title} · Leveldo Grocery`}</title>
        <meta name="description" content={excerptOf(post.content, 155)} />
      </Head>

      <article className="article">
        <nav className="article__crumbs">
          <Link href="/">Home</Link>
          <i className="bx bx-chevron-right"></i>
          <Link href="/posts">Blog</Link>
        </nav>

        <header className="article__head">
          <h1 className="article__title">{post.title}</h1>
          <div className="article__meta">
            <span>{formatPostDate(post.createdAt)}</span>
            <span className="article__dot" />
            <span>{readingTime(post.content)} min read</span>
            <span className="article__dot" />
            <span>
              {post.likes || 0} like{(post.likes || 0) === 1 ? "" : "s"}
            </span>
          </div>
        </header>

        {post.images?.[0] && (
          <figure className="article__hero">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.images[0]} alt="" />
          </figure>
        )}

        <div className="article__body" dangerouslySetInnerHTML={{ __html: post.content }} />

        {post.images?.length > 1 && (
          <div className="article__gallery">
            {post.images.slice(1).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" />
            ))}
          </div>
        )}

        <footer className="article__foot">
          <button
            type="button"
            onClick={like}
            disabled={liked}
            className={`article__like ${liked ? "is-liked" : ""}`}
          >
            <i className={liked ? "bx bxs-heart" : "bx bx-heart"}></i>
            {liked ? "Liked" : "Like"}
            <span>{post.likes || 0}</span>
          </button>

          <button type="button" onClick={share} className="article__share">
            <i className="bx bx-share-alt"></i>
            {copied ? "Link copied" : "Share"}
          </button>

          <Link href="/posts" className="article__back">
            <i className="bx bx-chevron-left"></i>
            All articles
          </Link>
        </footer>
      </article>

      {more.length > 0 && (
        <section className="home-block">
          <SectionHead title="Keep reading" href="/posts" linkLabel="All articles" />
          <div className="blog-grid">
            {more.map((p) => (
              <Link key={p.id} href={`/posts/${p.slug}`} className="post-card">
                <div className="post-card__media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.images?.[0] || "/placeholder.png"} alt="" />
                </div>
                <div className="post-card__body">
                  <div className="post-card__meta">
                    <span>{formatPostDate(p.createdAt)}</span>
                    <span className="post-card__dot" />
                    <span>{readingTime(p.content)} min read</span>
                  </div>
                  <h3 className="post-card__title">{p.title}</h3>
                  <p className="post-card__excerpt">{excerptOf(p.content, 110)}</p>
                  <span className="post-card__more">
                    Read article
                    <i className="bx bx-chevron-right"></i>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// Switched off from the dashboard? Show a notice instead of the page.
export default function GuardedSinglePost(props) {
  return (
    <PageGuard page="posts" title="The blog">
      <SinglePost {...props} />
    </PageGuard>
  );
}
