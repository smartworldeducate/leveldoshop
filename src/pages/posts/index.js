import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Head from "next/head";
import Link from "next/link";

import PageGuard from "../../components/PageGuard";
import SectionHead from "../../components/SectionHead";
import { fetchPosts } from "../../redux/posts/postsSlice";
import { excerptOf, formatPostDate, readingTime } from "../../utils/post";

function PostCard({ post, featured = false }) {
  return (
    <Link href={`/posts/${post.slug}`} className={`post-card ${featured ? "is-featured" : ""}`}>
      <div className="post-card__media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.images?.[0] || "/placeholder.png"} alt="" />
        {featured && <span className="post-card__flag">Latest</span>}
      </div>

      <div className="post-card__body">
        <div className="post-card__meta">
          <span>{formatPostDate(post.createdAt)}</span>
          <span className="post-card__dot" />
          <span>{readingTime(post.content)} min read</span>
        </div>

        <h3 className="post-card__title">{post.title}</h3>
        <p className="post-card__excerpt">{excerptOf(post.content, featured ? 220 : 120)}</p>

        <span className="post-card__more">
          Read article
          <i className="bx bx-chevron-right"></i>
        </span>
      </div>
    </Link>
  );
}

function Posts() {
  const dispatch = useDispatch();
  const posts = useSelector((state) => state.posts.items);
  const loading = useSelector((state) => state.posts.loading);
  const [query, setQuery] = useState("");

  useEffect(() => {
    dispatch(fetchPosts());
  }, [dispatch]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return posts;
    return posts.filter((p) =>
      `${p.title} ${excerptOf(p.content, 400)}`.toLowerCase().includes(term)
    );
  }, [posts, query]);

  const [featured, ...rest] = results;
  const listed = query ? results : rest;

  return (
    <>
      <Head>
        <title>Recipes & store news</title>
        <meta name="description" content="Recipes, seasonal notes and news from the shop." />
      </Head>

      <section className="home-block">
        <div className="blog-hero">
          <div>
            <span className="blog-hero__eyebrow">Journal</span>
            <h1 className="blog-hero__title">Recipes & store news</h1>
            <p className="blog-hero__lead">
              What is in season, what to do with it, and what is happening in the shop.
            </p>
          </div>

          <label className="blog-hero__search">
            <i className="bx bx-search"></i>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles"
              aria-label="Search articles"
            />
          </label>
        </div>
      </section>

      {loading && !posts.length ? (
        <section className="home-block">
          <div className="blog-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="post-card is-skeleton" />
            ))}
          </div>
        </section>
      ) : !results.length ? (
        <section className="home-block">
          <div className="catalog__empty">
            <i className="bx bx-news"></i>
            <p>{posts.length ? "No articles match that search." : "No articles published yet."}</p>
            {posts.length > 0 && (
              <button type="button" className="catalog__filter__clear" onClick={() => setQuery("")}>
                Clear search
              </button>
            )}
          </div>
        </section>
      ) : (
        <>
          {!query && featured && (
            <section className="home-block">
              <PostCard post={featured} featured />
            </section>
          )}

          {listed.length > 0 && (
            <section className="home-block">
              <SectionHead
                title={query ? "Search results" : "More reading"}
                note={`${listed.length} article${listed.length === 1 ? "" : "s"}`}
              />
              <div className="blog-grid">
                {listed.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}

// Switched off from the dashboard? Show a notice instead of the page.
export default function GuardedPosts(props) {
  return (
    <PageGuard page="posts" title="The blog">
      <Posts {...props} />
    </PageGuard>
  );
}
