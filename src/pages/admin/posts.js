import { useEffect, useState, useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import slugify from "slugify";
import AdminLayout from "../../components/admin/AdminLayout";
import { LoadingContext } from "../../context/LoadingContext";
import { uploadToCloudinary } from "../../lib/cloudinary";
import { fetchPosts, addPost, updatePost, deletePost } from "../../redux/posts/postsSlice";
import RichTextEditor from "@/components/admin/RichTextEditor";

export default function AdminPosts() {
  const dispatch = useDispatch();
  const { setLoading } = useContext(LoadingContext);
  const posts = useSelector((state) => state.posts.items);

  const emptyForm = { id: null, title: "", content: "", images: [], files: [] };

  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      await dispatch(fetchPosts());
      setLoading(false);
    };
    loadPosts();
  }, [dispatch]);

  // ✅ Submit (Create / Update)
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (form.images.length === 0 && form.files.length === 0) {
        alert("At least one image is required");
        setLoading(false);
        return;
      }

      if (isEdit) {
        await dispatch(updatePost({ id: form.id, form }));
      } else {
        await dispatch(addPost(form));
      }

      setForm(emptyForm);
      setModalOpen(false);
      setIsEdit(false);
    } catch (err) {
      console.error("Error saving post:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete Post
  const confirmDelete = async () => {
    setLoading(true);
    try {
      await dispatch(deletePost(deleteId));
      setDeleteId(null);
    } catch (err) {
      console.error("Error deleting post:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Open Edit
  const handleEdit = (post) => {
    setForm({ id: post.id, title: post.title || "", content: post.content || "", images: post.images || [], files: [] });
    setIsEdit(true);
    setModalOpen(true);
  };

  // ✅ Image Resize
  const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

  const resizeImage = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        let width = img.width;
        let height = img.height;
        const MAX_DIMENSION = 1600;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) { height = (height * MAX_DIMENSION) / width; width = MAX_DIMENSION; }
          else { width = (width * MAX_DIMENSION) / height; height = MAX_DIMENSION; }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.9;

        const compress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject("Compression failed");

              if (blob.size <= MAX_IMAGE_SIZE || quality <= 0.4) {
                resolve(new File([blob], file.name, { type: file.type, lastModified: Date.now() }));
              } else {
                quality -= 0.1;
                compress();
              }
            },
            file.type === "image/png" ? "image/png" : "image/jpeg",
            quality
          );
        };

        compress();
      };

      img.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="admin container">
      {/* HEADER */}
      <div className="admin__header">
        <h2>Posts</h2>
        <button
          className="btn-main"
          onClick={() => { setForm(emptyForm); setIsEdit(false); setModalOpen(true); }}
        >
          Add Post
        </button>
      </div>

      {/* TABLE */}
      <div className="admin__table">
        <div className="table-head">
          <span>Image</span>
          <span>Title</span>
          <span>Likes</span>
          <span>Actions</span>
        </div>

        {posts.map((p) => (
          <div className="table-row" key={p.id}>
            <img src={p.images?.[0] || "/placeholder.png"} alt={p.title} />
            <span>{p.title}</span>
            <span>{p.likes || 0}</span>
            <span className="actions">
              <button className="btn-edit" onClick={() => handleEdit(p)}>Edit</button>
              <button className="btn-delete" onClick={() => setDeleteId(p.id)}>Delete</button>
            </span>
          </div>
        ))}
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="admin-modal" onClick={() => setModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isEdit ? "Edit Post" : "Create New Post"}</h3>
              <p>Fill the information below</p>
            </div>

            <form onSubmit={submit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="field full">
                    <label>Post Title</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="field full">
                    <label>Post Content</label>
                    {/* <textarea
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      required
                    /> */}
                    <RichTextEditor
                      value={form.content}
                      onChange={(value) => setForm({ ...form, content: value })}
                    />
                  </div>

                  {/* Multiple Image Upload */}
                  <div className="field full">
                    <label>Post Images</label>

                    <div className="image-preview-grid">
                      {form.images.map((img, i) => (
                        <div key={i} className="image-preview">
                          <img src={img} alt={`preview ${i}`} />
                          <button type="button" className="btn-remove" onClick={() => removeImage(i)}>✖</button>
                        </div>
                      ))}

                      {form.files.map((file, i) => (
                        <div key={i + form.images.length} className="image-preview">
                          <img src={URL.createObjectURL(file)} alt={`preview ${i}`} />
                          <button type="button" className="btn-remove" onClick={() => removeImage(i)}>✖</button>
                        </div>
                      ))}
                    </div>

                    <label
                      className="image-drop"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={async (e) => {
                        e.preventDefault();
                        const droppedFiles = Array.from(e.dataTransfer.files);
                        const resizedFiles = await Promise.all(droppedFiles.map((file) => resizeImage(file)));
                        setForm((prev) => ({ ...prev, files: [...prev.files, ...resizedFiles] }));
                      }}
                    >
                      <input
                        type="file"
                        hidden
                        multiple
                        accept="image/*"
                        onChange={async (e) => {
                          const selectedFiles = Array.from(e.target.files);
                          const resizedFiles = await Promise.all(selectedFiles.map((file) => resizeImage(file)));
                          setForm((prev) => ({ ...prev, files: [...prev.files, ...resizedFiles] }));
                        }}
                      />

                      <div className="image-drop__content">
                        <span className="image-drop__icon">📷</span>
                        <p>Drag & drop images here</p>
                        <span className="image-drop__btn">Browse files</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-main">{isEdit ? "Update Post" : "Create Post"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteId && (
        <div className="admin-modal" onClick={() => setDeleteId(null)}>
          <div className="modal-box small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header danger">
              <h3>Delete Post</h3>
              <p>This action cannot be undone.</p>
            </div>

            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn-danger" onClick={confirmDelete}>Confirm Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ Layout wrapper
AdminPosts.getLayout = (page) => <AdminLayout>{page}</AdminLayout>;
