import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { ExternalLink, FileText, Heart, Pencil, Plus, Trash2 } from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import Card from "@/components/dashboard/ui/Card";
import Button from "@/components/dashboard/ui/Button";
import Modal from "@/components/dashboard/ui/Modal";
import ConfirmDialog from "@/components/dashboard/ui/ConfirmDialog";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import Toolbar, { SearchInput } from "@/components/dashboard/ui/Toolbar";
import Field, { Input } from "@/components/dashboard/ui/Field";
import ImageUploader from "@/components/dashboard/ImageUploader";
import { CARD_SM } from "@/components/dashboard/theme";

import { addPost, deletePost, fetchPosts, updatePost } from "@/redux/posts/postsSlice";
import { formatDate } from "@/lib/analytics";

// TipTap touches the DOM on mount — keep it off the server render.
const RichTextEditor = dynamic(() => import("@/components/dashboard/RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-[260px] animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
  ),
});

const EMPTY_POST = { id: null, title: "", content: "", images: [], files: [] };

/** Strip tags for the card preview — the stored content is HTML. */
const excerpt = (html, length = 120) => {
  const text = String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length)}…` : text;
};

export default function PostsPage() {
  const dispatch = useDispatch();
  const { items: posts, loading } = useSelector((s) => s.posts);

  const [query, setQuery] = useState("");
  const [form, setForm] = useState(EMPTY_POST);
  const [editing, setEditing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Posts are not part of the shell bootstrap — only this page needs them.
  useEffect(() => {
    dispatch(fetchPosts());
  }, [dispatch]);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return posts;
    return posts.filter((p) => p.title?.toLowerCase().includes(term));
  }, [posts, query]);

  const openAdd = () => {
    setForm(EMPTY_POST);
    setEditing(false);
    setModalOpen(true);
  };

  const openEdit = (post) => {
    setForm({
      id: post.id,
      title: post.title || "",
      content: post.content || "",
      images: post.images || [],
      files: [],
    });
    setEditing(true);
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.images.length && !form.files.length) {
      toast.error("Add a cover image");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await dispatch(updatePost({ id: form.id, form })).unwrap();
        toast.success("Post updated");
      } else {
        await dispatch(addPost(form)).unwrap();
        toast.success("Post published");
      }
      setModalOpen(false);
      setForm(EMPTY_POST);
    } catch {
      toast.error("Could not save the post");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await dispatch(deletePost(deleteTarget.id)).unwrap();
      toast.success("Post deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Could not delete the post");
    }
  };

  return (
    <DashboardLayout
      title="Posts"
      eyebrow="Insights"
      actions={
        <Button size="sm" icon={Plus} onClick={openAdd}>
          Write post
        </Button>
      }
    >
      <Card>
        <Toolbar>
          <p className="text-sm text-slate-400">
            Recipes, seasonal notes and store news — published to the storefront blog.
          </p>
          <SearchInput value={query} onChange={setQuery} placeholder="Search posts"
            className="sm:max-w-xs"
          />
        </Toolbar>

        {rows.length ? (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((post) => (
              <article key={post.id} className={`${CARD_SM} flex flex-col overflow-hidden`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.images?.[0] || "/placeholder.png"}
                  alt=""
                  className="h-40 w-full object-cover"
                />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{formatDate(post.createdAt)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" /> {post.likes || 0}
                    </span>
                  </div>
                  <h3 className="mt-2 line-clamp-2 font-bold text-slate-800">{post.title}</h3>
                  <p className="mt-1 line-clamp-3 flex-1 text-sm text-slate-400">
                    {excerpt(post.content)}
                  </p>

                  <div className="mt-4 flex items-center gap-2">
                    <Button variant="ghost" size="sm" icon={Pencil} onClick={() => openEdit(post)}>
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      href={`/posts/${post.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="View on storefront"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="softDanger"
                      size="icon"
                      className="ml-auto"
                      onClick={() => setDeleteTarget(post)}
                      aria-label="Delete post"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title={loading ? "Loading posts…" : posts.length ? "No posts match" : "No posts yet"}
            body={
              posts.length
                ? "Try another search term."
                : "Share a recipe or a seasonal note to bring shoppers back."
            }
            action={posts.length ? null : "Write post"}
            onAction={openAdd}
          />
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="lg"
        title={editing ? "Edit post" : "Write post"}
        subtitle="Published to the storefront blog"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="post-form" loading={saving}>
              {editing ? "Save changes" : "Publish"}
            </Button>
          </>
        }
      >
        <form id="post-form" onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Title" required>
            <Input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Five ways to use up ripe tomatoes"
              required
            />
          </Field>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">Content</span>
            <RichTextEditor
              value={form.content}
              onChange={(content) => setForm((p) => ({ ...p, content }))}
            />
          </div>

          <ImageUploader
            label="Cover image"
            images={form.images}
            files={form.files}
            onChange={({ images, files }) => setForm((p) => ({ ...p, images, files }))}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        icon={Trash2}
        title="Delete this post?"
        description="It will be removed from the storefront blog straight away."
        confirmLabel="Delete post"
        preview={
          deleteTarget && {
            image: deleteTarget.images?.[0] || "/placeholder.png",
            title: deleteTarget.title,
            meta: `${deleteTarget.likes || 0} like${(deleteTarget.likes || 0) === 1 ? "" : "s"}`,
          }
        }
      />

    </DashboardLayout>
  );
}

PostsPage.getLayout = dashboardGetLayout;
