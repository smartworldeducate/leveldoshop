import { useEffect, useState, useContext } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import slugify from "slugify";
import { db } from "../../lib/firebaseClient";
import { uploadToCloudinary } from "../../lib/cloudinary";
import { LoadingContext } from "../../context/LoadingContext";
import AdminLayout from "../../components/admin/AdminLayout";

export default function AddProduct() {
  const emptyForm = {
    id: null,
    title: "",
    price: "",
    stock: 0,
    categorySlug: "",
    colors: [],
    size: [],
    description: "",
    images: [],
    files: [],
    slug: "",
  };

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { setLoading } = useContext(LoadingContext);

  const colors = ["white", "red", "blue", "orange", "black"];
  const sizes = ["s", "m", "l", "xl", "xxl"];

  // 🔹 FETCH PRODUCTS
  const fetchProducts = async () => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 🔹 FORM HANDLER
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === "checkbox") {
      setForm(prev => ({
        ...prev,
        [name]: checked ? [...prev[name], value] : prev[name].filter(v => v !== value),
      }));
    } else if (type === "file") {
      setForm(prev => ({ ...prev, files: [...prev.files, ...Array.from(files)] }));
    } else {
      setForm(prev => ({ ...prev, [name]: type === "number" ? Number(value) : value }));
    }
  };

  const openAdd = () => { setForm(emptyForm); setIsEdit(false); setModalOpen(true); };
  const openEdit = (p) => { setForm({ ...p, files: [] }); setIsEdit(true); setModalOpen(true); };

  const removeImage = (index) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  // 🔹 SUBMIT
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrls = [...form.images];

      if (form.files.length > 0) {
        const uploaded = await Promise.all(form.files.map(f => uploadToCloudinary(f)));
        imageUrls = [...imageUrls, ...uploaded];
      }

      if (imageUrls.length === 0) {
        alert("At least one image is required");
        setLoading(false);
        return;
      }

      const payload = {
        title: form.title,
        price: Number(form.price),
        stock: Number(form.stock),
        categorySlug: form.categorySlug,
        colors: form.colors,
        size: form.size,
        description: form.description,
        images: imageUrls,
        slug: slugify(form.title, { lower: true }),
      };

      if (isEdit) {
        await updateDoc(doc(db, "products", form.id), payload);
      } else {
        await addDoc(collection(db, "products"), { ...payload, createdAt: serverTimestamp() });
      }

      setModalOpen(false);
      setForm(emptyForm);
      fetchProducts();
    } catch (err) {
      console.error("Firestore error:", err);
      alert("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, "products", deleteId));
      setDeleteId(null);
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert("Delete failed!");
    }
  };

  return (
    <div className="admin container">
      <div className="admin__header">
        <h2>Products</h2>
        <button className="btn-main" onClick={openAdd}>Add Product</button>
      </div>

      {/* TABLE */}
      <div className="admin__table">
        <div className="table-head">
          <span>Image</span>
          <span>Title</span>
          <span>Price</span>
          <span>Stock</span>
          <span>Category</span>
          <span>Actions</span>
        </div>

        {products.map(p => (
          <div className="table-row" key={p.id}>
            <img src={p.images?.[0] || "/placeholder.png"} alt={p.title} />
            <span>{p.title}</span>
            <span>${p.price}</span>
            <span>{p.stock ?? 0}</span>
            <span>{p.categorySlug}</span>
            <span className="actions">
              <button className="btn-edit" onClick={() => openEdit(p)}>Edit</button>
              <button className="btn-delete" onClick={() => setDeleteId(p.id)}>Delete</button>
            </span>
          </div>
        ))}
      </div>

      {/* DELETE MODAL */}
      {deleteId && (
        <div className="admin-modal" onClick={() => setDeleteId(null)}>
          <div className="modal-box small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header danger">
              <h3>Delete Product</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this product?<br /><strong>This action cannot be undone.</strong></p>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT MODAL */}
      {modalOpen && (
        <div className="admin-modal" onClick={() => setModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isEdit ? "Edit Product" : "Add Product"}</h3>
              <p>Fill the product details below</p>
            </div>

            <form onSubmit={submit}>
              <div className="modal-body">
                <div className="form-grid">
                  {/* Inputs */}
                  <div className="field"><label>Product Title</label><input name="title" value={form.title} onChange={handleChange} required /></div>
                  <div className="field"><label>Price</label><input type="number" name="price" value={form.price} onChange={handleChange} required /></div>
                  <div className="field"><label>Stock</label><input type="number" name="stock" value={form.stock} onChange={handleChange} required min={0} /></div>
                  <div className="field"><label>Category</label><input name="categorySlug" value={form.categorySlug} onChange={handleChange} required /></div>
                  <div className="field full"><label>Description</label><textarea name="description" value={form.description} onChange={handleChange} /></div>

                  {/* Colors & Sizes */}
                  <div className="field full"><label>Colors</label>
                    <div className="check-group">{colors.map(c => (
                      <label key={c}><input type="checkbox" name="colors" value={c} checked={form.colors.includes(c)} onChange={handleChange} />{c}</label>
                    ))}</div>
                  </div>
                  <div className="field full"><label>Sizes</label>
                    <div className="check-group">{sizes.map(s => (
                      <label key={s}><input type="checkbox" name="size" value={s} checked={form.size.includes(s)} onChange={handleChange} />{s}</label>
                    ))}</div>
                  </div>

                  {/* Multiple Image Upload */}
                  <div className="field full">
                    <label>Product Images</label>
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

                    <label className="image-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
                      e.preventDefault();
                      setForm(prev => ({ ...prev, files: [...prev.files, ...Array.from(e.dataTransfer.files)] }));
                    }}>
                      <input type="file" hidden multiple onChange={(e) => setForm(prev => ({ ...prev, files: [...prev.files, ...Array.from(e.target.files)] }))} />
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
                <button className="btn-main">{isEdit ? "Update Product" : "Create Product"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

AddProduct.getLayout = page => <AdminLayout>{page}</AdminLayout>;
