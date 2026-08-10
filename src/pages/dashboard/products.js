import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Download,
  FolderPlus,
  Pencil,
  Plus,
  Sprout,
  Trash2,
} from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import Card, { CardHeader } from "@/components/dashboard/ui/Card";
import Button from "@/components/dashboard/ui/Button";
import Badge from "@/components/dashboard/ui/Badge";
import ConfirmDialog from "@/components/dashboard/ui/ConfirmDialog";
import DataTable from "@/components/dashboard/ui/DataTable";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import Toolbar, { SearchInput } from "@/components/dashboard/ui/Toolbar";
import SegmentedControl from "@/components/dashboard/ui/SegmentedControl";
import Field, { Checkbox, Input, Select, Textarea } from "@/components/dashboard/ui/Field";
import ImageUploader from "@/components/dashboard/ImageUploader";

import { addProduct, deleteProduct, updateProduct } from "@/redux/products/productsSlice";
import {
  EMPTY_PRODUCT,
  LOW_STOCK_THRESHOLD,
  STORAGE_TYPES,
  UNITS,
  categoryLabel,
  discountPercent,
  expiryState,
  formatMoney,
  packLabel,
  stockState,
  unitPrice,
} from "@/data/grocery";

/** Firestore doc → form state (a doc has no `files`, and numbers may be missing). */
const toForm = (product) => ({
  ...EMPTY_PRODUCT,
  ...product,
  comparePrice: product.comparePrice || "",
  packSize: product.packSize || 1,
  unit: product.unit || "pc",
  storage: product.storage || "ambient",
  images: product.images || [],
  files: [],
});

export default function ProductsPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { items: products, loading, saving, processingId } = useSelector((s) => s.products);
  const categories = useSelector((s) => s.categories.items);
  const categoriesLoading = useSelector((s) => s.categories.loading);
  const categoriesReady = categories.length > 0;

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // The form lives at ?form=new / ?form=<id> rather than in a modal, so the
  // browser back button leaves the editor and a half-filled form survives a
  // reload of the list behind it.
  const formParam = typeof router.query.form === "string" ? router.query.form : null;
  const editing = Boolean(formParam && formParam !== "new");
  const showForm = Boolean(formParam);

  // Deep links: the header search passes ?q=, the Categories page ?category=
  useEffect(() => {
    if (typeof router.query.q === "string") setQuery(router.query.q);
    if (typeof router.query.category === "string") setCategory(router.query.category);
  }, [router.query.q, router.query.category]);

  // Load the product being edited once the catalogue has arrived.
  useEffect(() => {
    if (!formParam) return;
    if (formParam === "new") {
      setForm((prev) => (prev.id ? EMPTY_PRODUCT : prev));
      return;
    }
    const product = products.find((p) => p.id === formParam);
    if (product) setForm((prev) => (prev.id === product.id ? prev : toForm(product)));
  }, [formParam, products]);

  const goTo = (value) =>
    router.push(
      { pathname: "/dashboard/products", query: value ? { form: value } : {} },
      undefined,
      { shallow: true }
    );

  const openAdd = () => {
    setForm(EMPTY_PRODUCT);
    goTo("new");
  };

  const openEdit = (product) => {
    setForm(toForm(product));
    goTo(product.id);
  };

  const backToList = () => {
    setForm(EMPTY_PRODUCT);
    goTo(null);
  };

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((p) => {
      const stock = Number(p.stock) || 0;
      if (category !== "all" && p.categorySlug !== category) return false;
      if (status === "low" && !(stock > 0 && stock <= LOW_STOCK_THRESHOLD)) return false;
      if (status === "out" && stock > 0) return false;
      if (status === "offer" && !discountPercent(p)) return false;
      if (status === "expiring" && !["soon", "expired"].includes(expiryState(p.expiry)?.key)) {
        return false;
      }
      if (!term) return true;
      return [p.title, p.brand, p.slug, categoryLabel(categories, p.categorySlug)]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(term));
    });
  }, [products, query, category, status, categories]);

  const counts = useMemo(() => {
    const stockOf = (p) => Number(p.stock) || 0;
    return {
      all: products.length,
      low: products.filter((p) => stockOf(p) > 0 && stockOf(p) <= LOW_STOCK_THRESHOLD).length,
      out: products.filter((p) => stockOf(p) <= 0).length,
      offer: products.filter((p) => discountPercent(p)).length,
      expiring: products.filter((p) => ["soon", "expired"].includes(expiryState(p.expiry)?.key))
        .length,
    };
  }, [products]);

  const setField = (name) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.images.length && !form.files.length) {
      toast.error("Add at least one product photo");
      return;
    }

    try {
      if (editing) {
        await dispatch(updateProduct({ id: form.id, form })).unwrap();
        toast.success(`${form.title} updated`);
      } else {
        await dispatch(addProduct(form)).unwrap();
        toast.success(`${form.title} added to the catalogue`);
      }
      backToList();
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Could not save the product");
    }
  };

  const confirmDelete = async () => {
    try {
      await dispatch(deleteProduct(deleteTarget.id)).unwrap();
      toast.success(`${deleteTarget.title} removed`);
      setDeleteTarget(null);
    } catch {
      toast.error("Could not delete the product");
    }
  };

  const exportExcel = () => {
    if (!rows.length) return toast.error("Nothing to export");
    const sheet = XLSX.utils.json_to_sheet(
      rows.map((p) => ({
        Title: p.title,
        Brand: p.brand || "",
        Category: categoryLabel(categories, p.categorySlug),
        Price: Number(p.price) || 0,
        "Compare at": Number(p.comparePrice) || 0,
        Pack: packLabel(p),
        Stock: Number(p.stock) || 0,
        Storage: p.storage || "",
        Organic: p.organic ? "Yes" : "No",
        "Best before": p.expiry || "",
        Slug: p.slug,
      }))
    );
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Products");
    XLSX.writeFile(book, "grocery-products.xlsx");
  };

  const columns = [
    {
      key: "title",
      label: "Product",
      sortable: true,
      sortValue: (p) => p.title,
      render: (p) => (
        <div className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.images?.[0] || "/placeholder.png"}
            alt=""
            className="h-11 w-11 shrink-0 rounded-xl object-cover"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-800">{p.title}</p>
            <p className="truncate text-xs text-slate-400">
              {p.brand ? `${p.brand} · ` : ""}
              {packLabel(p)}
              {p.organic ? " · Organic" : ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "categorySlug",
      label: "Category",
      sortable: true,
      render: (p) => (
        <span className="text-slate-500">{categoryLabel(categories, p.categorySlug)}</span>
      ),
    },
    {
      key: "price",
      label: "Price",
      align: "right",
      sortable: true,
      sortValue: (p) => Number(p.price) || 0,
      render: (p) => {
        const off = discountPercent(p);
        return (
          <div>
            <p className="font-semibold text-slate-800">{formatMoney(p.price)}</p>
            <p className="text-xs text-slate-400">
              {off ? (
                <span className="text-rose-500">
                  −{off}% off {formatMoney(p.comparePrice)}
                </span>
              ) : (
                unitPrice(p) || packLabel(p)
              )}
            </p>
          </div>
        );
      },
    },
    {
      key: "stock",
      label: "Stock",
      align: "center",
      sortable: true,
      sortValue: (p) => Number(p.stock) || 0,
      render: (p) => {
        const state = stockState(p.stock);
        return <Badge tone={state.tone}>{state.key === "out" ? "Out" : p.stock}</Badge>;
      },
    },
    {
      key: "expiry",
      label: "Best before",
      align: "center",
      sortable: true,
      sortValue: (p) => p.expiry || "",
      render: (p) => {
        const state = expiryState(p.expiry);
        if (!state) return <span className="text-xs text-slate-300">—</span>;
        return <Badge tone={state.tone}>{state.label}</Badge>;
      },
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (p) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="softDanger"
            size="icon"
            loading={processingId === p.id}
            onClick={() => setDeleteTarget(p)}
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // ---------------------------------------------------------------- form view
  if (showForm) {
    return (
      <DashboardLayout
        title={editing ? form.title || "Edit product" : "Add product"}
        eyebrow="Catalogue · Products"
        actions={
          <>
            <Button variant="outline" size="sm" icon={ArrowLeft} onClick={backToList}>
              Back
            </Button>
            <Button type="submit" form="product-form" size="sm" loading={saving}>
              {editing ? "Save changes" : "Add to catalogue"}
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={submit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="flex flex-col gap-5 xl:col-span-2">
              <Card>
                <CardHeader title="Product details" subtitle="What the shopper sees first" />
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Product name" required span={2}>
                    <Input
                      name="title"
                      value={form.title}
                      onChange={setField("title")}
                      placeholder="Organic Bananas"
                      autoFocus
                      required
                    />
                  </Field>

                  <Field label="Brand / farm">
                    <Input
                      name="brand"
                      value={form.brand}
                      onChange={setField("brand")}
                      placeholder="Valley Fresh"
                    />
                  </Field>

                  {/* An empty dropdown reads as "broken" — say why and offer the fix. */}
                  <Field
                    label="Aisle"
                    required={categoriesReady}
                    hint={categoriesLoading ? "Loading aisles…" : undefined}
                  >
                    {categoriesReady ? (
                      <Select
                        name="categorySlug"
                        value={form.categorySlug}
                        onChange={setField("categorySlug")}
                        required
                      >
                        <option value="">Choose an aisle…</option>
                        {categories.map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3">
                        <p className="text-xs text-amber-700">
                          {categoriesLoading
                            ? "Loading your aisles…"
                            : "No aisles exist yet, so there is nothing to choose from."}
                        </p>
                        {!categoriesLoading && (
                          <Button
                            href="/dashboard/categories"
                            variant="outline"
                            size="sm"
                            icon={FolderPlus}
                            className="mt-2"
                          >
                            Create aisles
                          </Button>
                        )}
                      </div>
                    )}
                  </Field>

                  <Field label="Description" span={2}>
                    <Textarea
                      name="description"
                      value={form.description}
                      onChange={setField("description")}
                      placeholder="Origin, taste, storage advice…"
                      rows={5}
                    />
                  </Field>
                </div>
              </Card>

              <Card>
                <CardHeader
                  title="Photos"
                  subtitle="The first image is the one shoppers see in the grid"
                />
                <div className="mt-5">
                  <ImageUploader
                    label="Product photos"
                    images={form.images}
                    files={form.files}
                    onChange={({ images, files }) => setForm((prev) => ({ ...prev, images, files }))}
                  />
                </div>
              </Card>
            </div>

            <div className="flex flex-col gap-5">
              <Card>
                <CardHeader title="Pricing" subtitle="Per pack, as sold" />
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <Field label="Price" required>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      name="price"
                      value={form.price}
                      onChange={setField("price")}
                      required
                    />
                  </Field>

                  <Field label="Compare at" hint="Shows a strike-through discount">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      name="comparePrice"
                      value={form.comparePrice}
                      onChange={setField("comparePrice")}
                    />
                  </Field>
                </div>

                {Number(form.price) > 0 && (
                  <p className="mt-4 rounded-xl bg-[#F6F8FC] p-3 text-xs text-slate-500">
                    Shoppers see <strong className="text-slate-700">{formatMoney(form.price)}</strong>{" "}
                    for {packLabel(form)}
                    {unitPrice(form) ? ` · ${unitPrice(form)}` : ""}
                    {discountPercent(form) ? ` · −${discountPercent(form)}%` : ""}
                  </p>
                )}
              </Card>

              <Card>
                <CardHeader title="Pack & stock" subtitle="How it is measured and counted" />
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <Field label="Sold by" required>
                    <Select name="unit" value={form.unit} onChange={setField("unit")} required>
                      {UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Pack size" required hint={`e.g. 500 with unit "g"`}>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      name="packSize"
                      value={form.packSize}
                      onChange={setField("packSize")}
                      required
                    />
                  </Field>

                  <Field label="Stock on hand" required>
                    <Input
                      type="number"
                      min="0"
                      name="stock"
                      value={form.stock}
                      onChange={setField("stock")}
                      required
                    />
                  </Field>
                </div>
              </Card>

              <Card>
                <CardHeader title="Freshness" subtitle="Drives the storefront and stock alerts" />
                <div className="mt-5 flex flex-col gap-4">
                  <Field label="Storage">
                    <Select name="storage" value={form.storage} onChange={setField("storage")}>
                      {STORAGE_TYPES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Best before" hint="Leave empty for non-perishables">
                    <Input
                      type="date"
                      name="expiry"
                      value={form.expiry}
                      onChange={setField("expiry")}
                    />
                  </Field>

                  <Checkbox
                    label="Certified organic"
                    name="organic"
                    checked={Boolean(form.organic)}
                    onChange={setField("organic")}
                  />
                </div>
              </Card>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={backToList}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? "Save changes" : "Add to catalogue"}
            </Button>
          </div>
        </form>
      </DashboardLayout>
    );
  }

  // ---------------------------------------------------------------- list view
  return (
    <DashboardLayout
      title="Products"
      eyebrow="Catalogue"
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={exportExcel}
            className="hidden sm:inline-flex"
          >
            Export
          </Button>
          <Button size="sm" icon={Plus} onClick={openAdd}>
            Add product
          </Button>
        </>
      }
    >
      {!categoriesReady && !categoriesLoading && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <FolderPlus className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">No aisles yet</p>
              <p className="text-sm text-amber-700">
                Products need an aisle before shoppers can browse to them — the category dropdown
                stays empty until you create one.
              </p>
            </div>
          </div>
          <Button href="/dashboard/categories" size="sm" variant="outline">
            Set up aisles
          </Button>
        </div>
      )}

      <Card>
        <Toolbar>
          <SegmentedControl
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "low", label: "Low stock", count: counts.low },
              { value: "out", label: "Out", count: counts.out },
              { value: "expiring", label: "Expiring", count: counts.expiring },
              { value: "offer", label: "On offer", count: counts.offer },
            ]}
          />
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-1 sm:flex-row sm:items-center sm:justify-end">
            {/* Nothing to filter by until aisles exist — hide it rather than
                show a dropdown with one dead option. */}
            {categoriesReady && (
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 rounded-full border-transparent bg-[#F6F8FC] sm:w-auto sm:min-w-[180px]"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search products"
              className="sm:max-w-xs"
            />
          </div>
        </Toolbar>

        <div className="mt-5">
          <DataTable
            columns={columns}
            rows={rows}
            loading={loading && !products.length}
            minWidth={900}
            empty={
              <EmptyState
                icon={Sprout}
                title={products.length ? "No products match" : "Your shelves are empty"}
                body={
                  products.length
                    ? "Try a different category, status or search term."
                    : "Add your first grocery item to start selling."
                }
                action={products.length ? null : "Add product"}
                onAction={openAdd}
              />
            }
          />
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={processingId === deleteTarget?.id}
        icon={Trash2}
        title="Delete this product?"
        description="It will be removed from the catalogue and disappear from the storefront immediately."
        confirmLabel="Delete product"
        preview={
          deleteTarget && {
            image: deleteTarget.images?.[0] || "/placeholder.png",
            title: deleteTarget.title,
            meta: `${categoryLabel(categories, deleteTarget.categorySlug)} · ${packLabel(
              deleteTarget
            )} · ${formatMoney(deleteTarget.price)}`,
          }
        }
        consequences={
          deleteTarget
            ? [
                `${deleteTarget.stock || 0} unit${
                  (deleteTarget.stock || 0) === 1 ? "" : "s"
                } of stock will stop being tracked.`,
                "Past orders keep their record of this item.",
              ]
            : []
        }
      />
    </DashboardLayout>
  );
}

ProductsPage.getLayout = dashboardGetLayout;
