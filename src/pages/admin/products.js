import { useState, useEffect } from "react";
import { db } from "../../lib/firebaseClient";
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { uploadToCloudinary } from "../../lib/cloudinary";
import slugify from "slugify";
import "../../styles/_admin.scss";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    title: "",
    price: "",
    category: "",
    colors: [],
    sizes: [],
    description: "",
    file: null,
    id: null // for update
  });
  const [message, setMessage] = useState("");

  const allColors = ["white", "red", "blue", "orange", "yellow", "black", "pink"];
  const allSizes = ["s", "m", "l", "xl", "xxl"];

  // fetch products
  const fetchProducts = async () => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      if (name === "colors") {
        setForm(prev => ({
          ...prev,
          colors: checked ? [...prev.colors, value] : prev.colors.filter(c => c !== value)
        }));
      } else if (name === "sizes") {
        setForm(prev => ({
          ...prev,
          sizes: checked ? [...prev.sizes, value] : prev.sizes.filter(s => s !== value)
        }));
      }
    } else if (type === "file") {
      setForm(prev => ({ ...prev, file: e.target.files[0] }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let imageUrl = form.file ? await uploadToCloudinary(form.file) : null;
    if (!imageUrl && !form.id) return alert("Please upload an image");

    try {
      if (form.id) {
        // Update existing product
        const productRef = doc(db, "products", form.id);
        await updateDoc(productRef, {
          ...form,
          price: Number(form.price),
          image01: imageUrl || form.image01,
          slug: slugify(form.title, { lower: true })
        });
        setMessage("Product updated successfully!");
      } else {
        // Add new product
        const docRef = await addDoc(collection(db, "products"), {
          title: form.title,
          price: Number(form.price),
          categorySlug: form.category,
          colors: form.colors,
          size: form.sizes,
          description: form.description,
          slug: slugify(form.title, { lower: true }),
          image01: imageUrl,
          image02: imageUrl,
          createdAt: serverTimestamp()
        });
        setMessage("Product added successfully!");
      }

      setForm({
        title: "",
        price: "",
        category: "",
        colors: [],
        sizes: [],
        description: "",
        file: null,
        id: null
      });

      fetchProducts();
    } catch (err) {
      console.error(err);
      setMessage("Error saving product");
    }
  };

  const handleEdit = (p) => {
    setForm({ ...p, file: null, id: p.id });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure to delete this product?")) return;
    await deleteDoc(doc(db, "products", id));
    setMessage("Product deleted successfully!");
    fetchProducts();
  };

  return (
    <div className="admin-page">
      <h1>Product Management</h1>

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="input-group">
          <label>Title</label>
          <input name="title" type="text" value={form.title} onChange={handleChange} required />
        </div>

        <div className="input-group">
          <label>Price</label>
          <input name="price" type="number" value={form.price} onChange={handleChange} required />
        </div>

        <div className="input-group">
          <label>Category</label>
          <input name="category" type="text" value={form.category} onChange={handleChange} required />
        </div>

        <div className="input-group">
          <label>Colors</label>
          <div className="color-checkboxes">
            {allColors.map(c => (
              <label key={c}>
                <input type="checkbox" name="colors" value={c} checked={form.colors.includes(c)} onChange={handleChange} />
                {c}
              </label>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label>Sizes</label>
          <div className="size-checkboxes">
            {allSizes.map(s => (
              <label key={s}>
                <input type="checkbox" name="sizes" value={s} checked={form.sizes.includes(s)} onChange={handleChange} />
                {s}
              </label>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label>Description</label>
          <textarea name="description" value={form.description} onChange={handleChange}></textarea>
        </div>

        <div className="input-group">
          <label>Image</label>
          <input type="file" name="file" onChange={handleChange} />
          {form.id && !form.file && <small>Keep existing image if not uploading new one</small>}
        </div>

        <button type="submit">{form.id ? "Update Product" : "Add Product"}</button>
      </form>

      {message && <div className="message">{message}</div>}

      <h2>All Products</h2>
      <div className="product-list">
        {products.map(p => (
          <div className="product-card" key={p.id}>
            <img src={p.image01} alt={p.title} />
            <div className="product-info">
              <h3>{p.title}</h3>
              <p>Price: <span>{p.price}</span></p>
              <p>Category: {p.categorySlug}</p>
              <div className="actions">
                <button onClick={() => handleEdit(p)}>Edit</button>
                <button onClick={() => handleDelete(p.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
