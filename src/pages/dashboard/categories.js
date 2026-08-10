import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  ArrowDown,
  ArrowUp,
  CopyX,
  Eye,
  EyeOff,
  LayoutGrid,
  Pencil,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import Card, { CardHeader } from "@/components/dashboard/ui/Card";
import Button from "@/components/dashboard/ui/Button";
import Badge from "@/components/dashboard/ui/Badge";
import ConfirmDialog from "@/components/dashboard/ui/ConfirmDialog";
import DataTable from "@/components/dashboard/ui/DataTable";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import Switch from "@/components/dashboard/ui/Switch";
import SegmentedControl from "@/components/dashboard/ui/SegmentedControl";
import Field, { Input, Textarea } from "@/components/dashboard/ui/Field";

import {
  addCategory,
  deleteCategory,
  removeDuplicateCategories,
  reorderCategories,
  seedCategories,
  toggleCategoryVisible,
  updateCategory,
} from "@/redux/categories/categoriesSlice";
import { categoryStats } from "@/lib/analytics";
import { CATEGORY_COLORS, formatMoney } from "@/data/grocery";

const EMPTY_FORM = {
  id: null,
  name: "",
  slug: "",
  accent: CATEGORY_COLORS[0],
  description: "",
  visible: true,
  order: 0,
};

export default function CategoriesPage() {
  const dispatch = useDispatch();
  const { items: categories, loading, saving, processingId } = useSelector((s) => s.categories);
  const products = useSelector((s) => s.products.items);

  const [tab, setTab] = useState("list");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const stats = useMemo(() => categoryStats(products, categories), [products, categories]);
  const statBySlug = useMemo(() => Object.fromEntries(stats.map((s) => [s.slug, s])), [stats]);

  // Products pointing at an aisle that no longer exists — worth surfacing,
  // because they are invisible on the storefront until reassigned.
  const orphans = useMemo(() => {
    const known = new Set(categories.map((c) => c.slug));
    const counts = {};
    products.forEach((p) => {
      if (p.categorySlug && !known.has(p.categorySlug)) {
        counts[p.categorySlug] = (counts[p.categorySlug] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([slug, count]) => ({ slug, count }));
  }, [products, categories]);

  const openAdd = () => {
    setForm({
      ...EMPTY_FORM,
      accent: CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length],
      order: categories.length,
    });
    setEditing(false);
    setTab("form");
  };

  const openEdit = (category) => {
    setForm({ ...EMPTY_FORM, ...category });
    setEditing(true);
    setTab("form");
  };

  const backToList = () => {
    setTab("list");
    setEditing(false);
    setForm(EMPTY_FORM);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await dispatch(updateCategory({ id: form.id, form })).unwrap();
        toast.success(`${form.name} updated`);
      } else {
        await dispatch(addCategory(form)).unwrap();
        toast.success(`${form.name} added — it is live on the storefront`);
      }
      backToList();
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Could not save the aisle");
    }
  };

  const toggleVisible = async (category, visible) => {
    try {
      await dispatch(toggleCategoryVisible({ id: category.id, visible })).unwrap();
      toast.success(`${category.name} ${visible ? "is now visible" : "hidden from the storefront"}`);
    } catch {
      toast.error("Could not update visibility");
    }
  };

  const move = async (index, delta) => {
    const next = [...categories];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await dispatch(reorderCategories(next)).unwrap();
    } catch {
      toast.error("Could not reorder aisles");
    }
  };

  const confirmDelete = async () => {
    try {
      await dispatch(deleteCategory(deleteTarget.id)).unwrap();
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
    } catch {
      toast.error("Could not delete the aisle");
    }
  };

  const seed = async () => {
    try {
      const created = await dispatch(seedCategories()).unwrap();
      toast.success(`${created.length} aisle${created.length === 1 ? "" : "s"} created`);
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Could not create the default aisles");
    }
  };

  const dedupe = async () => {
    try {
      const removed = await dispatch(removeDuplicateCategories()).unwrap();
      toast.success(`${removed.length} duplicate aisle${removed.length === 1 ? "" : "s"} removed`);
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Could not remove duplicates");
    }
  };

  const productCount = deleteTarget ? statBySlug[deleteTarget.slug]?.count || 0 : 0;

  // Two aisles with the same slug are indistinguishable to shoppers and make
  // the storefront list the same door twice.
  const duplicateSlugs = useMemo(() => {
    const counts = {};
    categories.forEach((c) => {
      counts[c.slug] = (counts[c.slug] || 0) + 1;
    });
    return Object.entries(counts).filter(([, n]) => n > 1);
  }, [categories]);

  const duplicateTotal = duplicateSlugs.reduce((sum, [, n]) => sum + (n - 1), 0);

  const columns = [
    {
      key: "name",
      label: "Aisle",
      render: (c) => (
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="h-8 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: c.accent }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-800">{c.name}</p>
            <p className="truncate font-mono text-xs text-slate-400">/{c.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "count",
      label: "Products",
      align: "center",
      render: (c) => <span className="text-slate-500">{statBySlug[c.slug]?.count ?? 0}</span>,
    },
    {
      key: "stock",
      label: "Stock health",
      align: "center",
      render: (c) => {
        const s = statBySlug[c.slug];
        if (!s?.count) return <span className="text-xs text-slate-300">Empty</span>;
        if (s.outOfStock) return <Badge tone="danger">{s.outOfStock} out</Badge>;
        if (s.lowStock) return <Badge tone="warning">{s.lowStock} low</Badge>;
        return <Badge tone="success">Fully stocked</Badge>;
      },
    },
    {
      key: "value",
      label: "Stock value",
      align: "right",
      render: (c) => (
        <span className="font-semibold text-slate-800">
          {formatMoney(statBySlug[c.slug]?.stockValue || 0)}
        </span>
      ),
    },
    {
      key: "visible",
      label: "On storefront",
      align: "center",
      render: (c) => (
        <div className="flex items-center justify-center gap-2">
          <Switch
            checked={c.visible !== false}
            disabled={processingId === c.id}
            onChange={(v) => toggleVisible(c, v)}
            label={`Show ${c.name} on the storefront`}
          />
          {c.visible === false ? (
            <EyeOff className="h-4 w-4 text-slate-300" />
          ) : (
            <Eye className="h-4 w-4 text-emerald-500" />
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (c) => {
        const index = categories.findIndex((x) => x.id === c.id);
        return (
          <div className="flex justify-end gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Move up"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Move down"
              disabled={index === categories.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(c)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="softDanger"
              size="icon"
              aria-label="Delete"
              loading={processingId === c.id}
              onClick={() => setDeleteTarget(c)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <DashboardLayout
      title="Categories"
      eyebrow="Catalogue"
      actions={
        tab === "list" ? (
          <Button size="sm" icon={Plus} onClick={openAdd}>
            Add aisle
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={backToList}>
            Back to aisles
          </Button>
        )
      }
    >
      <SegmentedControl
        value={tab}
        onChange={(v) => (v === "form" ? openAdd() : backToList())}
        options={[
          { value: "list", label: "Aisles", count: categories.length },
          { value: "form", label: editing ? "Edit aisle" : "Add aisle" },
        ]}
      />

      {tab === "list" ? (
        <>
          {duplicateTotal > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <CopyX className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-800">
                    {duplicateTotal} duplicate aisle{duplicateTotal === 1 ? "" : "s"}
                  </p>
                  <p className="text-sm text-amber-700">
                    {duplicateSlugs.map(([slug]) => slug).join(", ")} appear more than once, so
                    shoppers see the same aisle twice. Cleaning up keeps the oldest of each.
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" loading={saving} onClick={dedupe}>
                Remove duplicates
              </Button>
            </div>
          )}

          <Card>
            <CardHeader
              title="Aisles"
              subtitle="The order here is the order shoppers see. Switch one off to hide the aisle and its products from the storefront."
              action={
                categories.length === 0 && !loading ? (
                  <Button size="sm" variant="outline" icon={Wand2} loading={saving} onClick={seed}>
                    Create 10 defaults
                  </Button>
                ) : null
              }
            />

            <div className="mt-5">
              <DataTable
                columns={columns}
                rows={categories}
                minWidth={940}
                loading={loading && !categories.length}
                empty={
                  <EmptyState
                    icon={LayoutGrid}
                    title="No aisles yet"
                    body="Products cannot be categorised until at least one aisle exists — that is why the category dropdown in Products is empty."
                    action="Create the 10 standard aisles"
                    onAction={seed}
                  />
                }
              />
            </div>

            {!categories.length && !loading && (
              <p className="mt-3 text-center text-xs text-slate-400">
                Or use <span className="font-semibold text-slate-500">Add aisle</span> to create your
                own. Either way you can rename, recolour, reorder and delete them afterwards.
              </p>
            )}
          </Card>

          {orphans.length > 0 && (
            <Card>
              <CardHeader
                title="Products without a valid aisle"
                subtitle="These reference an aisle that does not exist, so shoppers cannot browse to them"
              />
              <div className="mt-4 flex flex-wrap gap-3">
                {orphans.map((o) => (
                  <span
                    key={o.slug}
                    className="inline-flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-sm text-amber-700"
                  >
                    <span className="font-mono text-xs">{o.slug}</span>
                    <Badge tone="warning">
                      {o.count} product{o.count === 1 ? "" : "s"}
                    </Badge>
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Fix by creating an aisle with that exact slug, or by editing the products in Products.
              </p>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardHeader
            title={editing ? `Edit ${form.name || "aisle"}` : "Add a new aisle"}
            subtitle="Aisles drive the storefront navigation, the catalogue filters and the product form"
          />

          <form id="category-form" onSubmit={submit} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Field label="Name" required>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Fruits & Vegetables"
                autoFocus
                required
              />
            </Field>

            <Field
              label="URL slug"
              hint={
                editing
                  ? "Changing this unlinks products already filed under the old slug"
                  : "Left empty, it is generated from the name"
              }
            >
              <Input
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                placeholder="fruits-vegetables"
              />
            </Field>

            <div className="lg:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">Colour</span>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Use ${color}`}
                    onClick={() => setForm((p) => ({ ...p, accent: color }))}
                    className={`h-9 w-9 rounded-xl transition ${
                      form.accent === color
                        ? "ring-2 ring-slate-800 ring-offset-2"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Shown as the aisle dot on the storefront and the bar in reports — aisles carry a
                colour, not an icon.
              </p>
            </div>

            <Field label="Description" hint="Internal note — not shown to shoppers" span={2}>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </Field>

            <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#F6F8FC] px-4 py-3 lg:col-span-2">
              <div>
                <p className="text-sm font-semibold text-slate-700">Show on storefront</p>
                <p className="text-xs text-slate-400">Hiding an aisle also hides its products</p>
              </div>
              <Switch
                checked={form.visible !== false}
                onChange={(v) => setForm((p) => ({ ...p, visible: v }))}
                label="Show on storefront"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-3 lg:col-span-2">
              <Button type="button" variant="outline" onClick={backToList}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {editing ? "Save changes" : "Add aisle"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={processingId === deleteTarget?.id}
        icon={Trash2}
        title="Delete this aisle?"
        description="Shoppers will no longer see it in the navigation or the catalogue filters."
        confirmLabel="Delete aisle"
        preview={
          deleteTarget && {
            swatch: deleteTarget.accent,
            title: deleteTarget.name,
            meta: `/${deleteTarget.slug}`,
          }
        }
        consequences={
          productCount > 0
            ? [
                `${productCount} product${productCount === 1 ? "" : "s"} still point here. They are not deleted, but shoppers cannot browse to them until you give them another aisle.`,
                "Switching the aisle off instead keeps those products linked.",
              ]
            : ["No products use this aisle, so nothing else changes."]
        }
      />

    </DashboardLayout>
  );
}

CategoriesPage.getLayout = dashboardGetLayout;
