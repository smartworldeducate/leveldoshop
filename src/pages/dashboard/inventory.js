import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Boxes, CalendarClock, Minus, PackageX, Plus, Warehouse } from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import Card from "@/components/dashboard/ui/Card";
import Button from "@/components/dashboard/ui/Button";
import Badge from "@/components/dashboard/ui/Badge";
import Modal from "@/components/dashboard/ui/Modal";
import DataTable from "@/components/dashboard/ui/DataTable";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import StatTile from "@/components/dashboard/ui/StatTile";
import Toolbar, { SearchInput } from "@/components/dashboard/ui/Toolbar";
import SegmentedControl from "@/components/dashboard/ui/SegmentedControl";
import Field, { Input } from "@/components/dashboard/ui/Field";
import { BRAND } from "@/components/dashboard/theme";

import { adjustStock } from "@/redux/products/productsSlice";
import { storeKpis } from "@/lib/analytics";
import {
  LOW_STOCK_THRESHOLD,
  categoryLabel,
  expiryState,
  formatMoney,
  packLabel,
  stockState,
} from "@/data/grocery";

/** One-tap restock steps — the amounts a shopkeeper actually reaches for. */
const QUICK_STEPS = [-1, +1, +10];

export default function InventoryPage() {
  const dispatch = useDispatch();
  const { items: products, loading, processingId } = useSelector((s) => s.products);
  const orders = useSelector((s) => s.adminOrders.items);
  const categories = useSelector((s) => s.categories.items);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("attention");
  const [restockTarget, setRestockTarget] = useState(null);
  const [restockValue, setRestockValue] = useState(0);

  const kpis = useMemo(() => storeKpis(orders, products), [orders, products]);

  const counts = useMemo(() => {
    const stockOf = (p) => Number(p.stock) || 0;
    return {
      all: products.length,
      attention: products.filter(
        (p) =>
          stockOf(p) <= LOW_STOCK_THRESHOLD ||
          ["soon", "expired"].includes(expiryState(p.expiry)?.key)
      ).length,
      out: products.filter((p) => stockOf(p) <= 0).length,
      expiring: products.filter((p) => ["soon", "expired"].includes(expiryState(p.expiry)?.key))
        .length,
    };
  }, [products]);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products
      .filter((p) => {
        const stock = Number(p.stock) || 0;
        const expiry = expiryState(p.expiry)?.key;
        if (filter === "attention" && !(stock <= LOW_STOCK_THRESHOLD || ["soon", "expired"].includes(expiry)))
          return false;
        if (filter === "out" && stock > 0) return false;
        if (filter === "expiring" && !["soon", "expired"].includes(expiry)) return false;
        if (!term) return true;
        return [p.title, p.brand, categoryLabel(categories, p.categorySlug)]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(term));
      })
      .sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0));
  }, [products, query, filter, categories]);

  const step = async (product, delta) => {
    const next = Math.max(0, (Number(product.stock) || 0) + delta);
    try {
      await dispatch(adjustStock({ id: product.id, stock: next })).unwrap();
    } catch {
      toast.error("Could not update stock");
    }
  };

  const openRestock = (product) => {
    setRestockTarget(product);
    setRestockValue(Number(product.stock) || 0);
  };

  const saveRestock = async () => {
    try {
      await dispatch(adjustStock({ id: restockTarget.id, stock: restockValue })).unwrap();
      toast.success(`${restockTarget.title} set to ${Math.max(0, Number(restockValue) || 0)}`);
      setRestockTarget(null);
    } catch {
      toast.error("Could not update stock");
    }
  };

  const columns = [
    {
      key: "title",
      label: "Item",
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
              {categoryLabel(categories, p.categorySlug)} · {packLabel(p)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "state",
      label: "Status",
      align: "center",
      sortable: true,
      sortValue: (p) => Number(p.stock) || 0,
      render: (p) => {
        const state = stockState(p.stock);
        return <Badge tone={state.tone}>{state.label}</Badge>;
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
        return (
          <Badge tone={state.tone}>
            {state.key === "expired" ? state.label : `${p.expiry} · ${state.label}`}
          </Badge>
        );
      },
    },
    {
      key: "value",
      label: "Stock value",
      align: "right",
      sortable: true,
      sortValue: (p) => (Number(p.price) || 0) * (Number(p.stock) || 0),
      render: (p) => (
        <span className="font-semibold text-slate-800">
          {formatMoney((Number(p.price) || 0) * (Number(p.stock) || 0))}
        </span>
      ),
    },
    {
      key: "adjust",
      label: "Adjust",
      align: "right",
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          {QUICK_STEPS.map((delta) => (
            <Button
              key={delta}
              variant="ghost"
              size="icon"
              disabled={processingId === p.id || (delta < 0 && (Number(p.stock) || 0) <= 0)}
              onClick={() => step(p, delta)}
              aria-label={`${delta > 0 ? "Add" : "Remove"} ${Math.abs(delta)}`}
              title={`${delta > 0 ? "+" : ""}${delta}`}
            >
              {delta < 0 ? (
                <Minus className="h-4 w-4" />
              ) : delta === 1 ? (
                <Plus className="h-4 w-4" />
              ) : (
                <span className="text-[11px] font-bold">+10</span>
              )}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => openRestock(p)}>
            Set
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Inventory" eyebrow="Catalogue">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Warehouse} label="Stock value" value={formatMoney(kpis.stockValue)} accent={BRAND} />
        <StatTile icon={Boxes} label="Low stock" value={kpis.lowStock} hint={`≤ ${LOW_STOCK_THRESHOLD} units`} accent="#F59E0B" />
        <StatTile icon={PackageX} label="Out of stock" value={kpis.outOfStock} accent="#E11D48" />
        <StatTile icon={CalendarClock} label="Expiring / expired" value={kpis.expiring} accent="#8B5CF6" />
      </div>

      <Card>
        <Toolbar>
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            options={[
              { value: "attention", label: "Needs attention", count: counts.attention },
              { value: "out", label: "Out of stock", count: counts.out },
              { value: "expiring", label: "Expiring", count: counts.expiring },
              { value: "all", label: "All items", count: counts.all },
            ]}
          />
          <SearchInput value={query} onChange={setQuery} placeholder="Search inventory"
            className="sm:max-w-xs"
          />
        </Toolbar>

        <div className="mt-5">
          <DataTable
            columns={columns}
            rows={rows}
            minWidth={880}
            loading={loading && !products.length}
            empty={
              <EmptyState
                icon={Boxes}
                title={filter === "attention" ? "Everything is well stocked" : "Nothing here"}
                body={
                  filter === "attention"
                    ? "No item is low, out of stock or near its best-before date."
                    : "Try another filter or search term."
                }
              />
            }
          />
        </div>
      </Card>

      <Modal
        open={Boolean(restockTarget)}
        onClose={() => setRestockTarget(null)}
        size="sm"
        title="Set stock level"
        subtitle={restockTarget?.title}
        footer={
          <>
            <Button variant="outline" onClick={() => setRestockTarget(null)}>
              Cancel
            </Button>
            <Button loading={processingId === restockTarget?.id} onClick={saveRestock}>
              Save
            </Button>
          </>
        }
      >
        <Field label="Units on hand" hint={`Currently ${restockTarget?.stock ?? 0} · sold as ${packLabel(restockTarget)}`}>
          <Input
            type="number"
            min="0"
            autoFocus
            value={restockValue}
            onChange={(e) => setRestockValue(e.target.value)}
          />
        </Field>
      </Modal>
    </DashboardLayout>
  );
}

InventoryPage.getLayout = dashboardGetLayout;
