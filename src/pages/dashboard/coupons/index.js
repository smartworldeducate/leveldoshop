import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { ArrowRight, CopyPlus, Copy, Eye, Pencil, Plus, Receipt, TicketPercent, Trash2, Users, Wallet } from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import Card from "@/components/dashboard/ui/Card";
import Badge from "@/components/dashboard/ui/Badge";
import Button from "@/components/dashboard/ui/Button";
import ConfirmDialog from "@/components/dashboard/ui/ConfirmDialog";
import DataTable from "@/components/dashboard/ui/DataTable";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import SegmentedControl from "@/components/dashboard/ui/SegmentedControl";
import StatTile from "@/components/dashboard/ui/StatTile";
import Switch from "@/components/dashboard/ui/Switch";
import Toolbar, { SearchInput } from "@/components/dashboard/ui/Toolbar";
import { BRAND, FRESH } from "@/components/dashboard/theme";

import { deleteCoupon, fetchCoupons, toggleCoupon } from "@/redux/coupons/couponsSlice";
import { formatDateTime } from "@/lib/analytics";
import { categoryLabel, formatMoney } from "@/data/grocery";
import { couponStatus, describeDiscount, endsInDays, endsInLabel } from "@/data/coupons";
import { soldCodeState } from "@/data/couponSales";
import { isCancelled } from "@/data/fulfilment";

export default function CouponsPage() {
  const dispatch = useDispatch();
  const { items: coupons, loading, loaded } = useSelector((s) => s.coupons);
  const orders = useSelector((s) => s.adminOrders.items);
  const categories = useSelector((s) => s.categories.items);
  const purchases = useSelector((s) => s.couponSales.purchases);

  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchCoupons());
  }, [dispatch]);

  // Discount handed out per code, from real orders. Cancelled ones don't count.
  const givenByCode = useMemo(() => {
    const totals = {};
    orders
      .filter((o) => o.coupon?.code && !isCancelled(o))
      .forEach((o) => {
        totals[o.coupon.code] = (totals[o.coupon.code] || 0) + (Number(o.discount) || 0);
      });
    return totals;
  }, [orders]);

  // Codes issued for a paid coupon are one customer's, so they're kept apart from yours.
  const own = useMemo(() => coupons.filter((c) => !c.purchaseId), [coupons]);
  const sold = coupons.length - own.length;
  const statusOf = (c) => couponStatus(c).key;
  const countOf = (key) => own.filter((c) => statusOf(c) === key).length;
  const ended = (c) => ["expired", "used_up"].includes(statusOf(c));

  const buyerOf = (c) => purchases.find((p) => p.id === c.purchaseId)?.buyer?.name;

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (filter === "sold" ? coupons.filter((c) => c.purchaseId) : own).filter((c) => {
      if (filter === "ended" && !ended(c)) return false;
      if (!["all", "ended", "sold"].includes(filter) && statusOf(c) !== filter) return false;
      if (!term) return true;
      return [c.code, c.label, buyerOf(c)].filter(Boolean).some((v) => v.toLowerCase().includes(term));
    });
  }, [coupons, own, filter, query, purchases]);

  const endingSoon = own.filter((c) => endsInDays(c) !== null).length;
  const totalUses = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);
  const totalGiven = Object.values(givenByCode).reduce((sum, v) => sum + v, 0);

  const toggle = async (coupon, enabled) => {
    try {
      await dispatch(toggleCoupon({ code: coupon.code, enabled })).unwrap();
      toast.success(`${coupon.code} ${enabled ? "switched on" : "switched off"}`);
    } catch {
      toast.error("Could not update the coupon");
    }
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`${code} copied`);
    } catch {
      toast.error("Could not copy");
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await dispatch(deleteCoupon(deleteTarget.code)).unwrap();
      toast.success(`${deleteTarget.code} deleted`);
      setDeleteTarget(null);
    } catch {
      toast.error("Could not delete the coupon");
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "code",
      label: "Coupon",
      sortable: true,
      sortValue: (c) => c.code,
      render: (c) => (
        <div className="min-w-0">
          <button
            type="button"
            aria-label={`Copy code ${c.code}`}
            onClick={() => copyCode(c.code)}
            className="flex items-center gap-1.5 font-mono text-sm font-bold text-[#4267B2]"
          >
            {c.code} <Copy className="h-3.5 w-3.5" />
          </button>
          <p className="truncate text-xs text-slate-400">{c.label || "No description"}</p>
          {c.purchaseId && <p className="truncate text-xs font-semibold text-slate-500">Bought by {buyerOf(c) || "a customer"}</p>}
        </div>
      ),
    },
    {
      key: "discount",
      label: "Discount",
      render: (c) => (
        <div className="min-w-0">
          <p className="font-semibold text-slate-800">{describeDiscount(c)}</p>
          <p className="truncate text-xs text-slate-400">
            {[
              c.minOrder > 0 && `Spend ${formatMoney(c.minOrder)}+`,
              c.categorySlugs?.length
                ? c.categorySlugs.map((slug) => categoryLabel(categories, slug)).join(", ")
                : "All aisles",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      ),
    },
    {
      key: "dates",
      label: "Runs",
      render: (c) => {
        const days = endsInDays(c);
        return (
          <div className="text-xs text-slate-500">
            <p>{c.startsAt ? `From ${formatDateTime(c.startsAt)}` : "From now"}</p>
            <p>{c.endsAt ? `Until ${formatDateTime(c.endsAt)}` : "No end date"}</p>
            {days !== null && <p className="mt-0.5 font-semibold text-amber-700">{endsInLabel(days)}</p>}
          </div>
        );
      },
    },
    {
      key: "used",
      label: "Used",
      align: "center",
      sortable: true,
      sortValue: (c) => c.usedCount || 0,
      render: (c) => (
        <div>
          <p className="font-semibold text-slate-800">
            {c.usedCount || 0}
            {c.usageLimit ? ` / ${c.usageLimit}` : ""}
          </p>
          <p className="text-xs text-slate-400">{formatMoney(givenByCode[c.code] || 0)} given</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      render: (c) => {
        // A paid code is one customer's, so what matters is whether they've spent it.
        const status = c.purchaseId ? soldCodeState(c) : couponStatus(c);
        return (
          <div className="flex flex-col items-center gap-1">
            <Badge tone={status.tone}>{status.label}</Badge>
            {c.showOnSite && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <Eye className="h-3.5 w-3.5" /> On website
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (c) => c.purchaseId ? (
        // A customer paid for this code. Changing it happens on their purchase, where a refund is explained.
        <div className="flex justify-end">
          <Button variant="outline" size="sm" icon={ArrowRight} href={`/dashboard/coupon-sales/purchases/${c.purchaseId}`}>
            Open purchase
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-2">
          <Switch
            checked={c.enabled !== false}
            label={`Switch ${c.code} on or off`}
            onChange={(on) => toggle(c, on)}
          />
          <Button variant="ghost" size="icon" aria-label={`Edit ${c.code}`} href={`/dashboard/coupons/${c.code}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Copy into a new code" aria-label={`Copy ${c.code} into a new code`} href={`/dashboard/coupons/new?from=${c.code}`}>
            <CopyPlus className="h-4 w-4" />
          </Button>
          <Button variant="softDanger" size="icon" aria-label={`Delete ${c.code}`} onClick={() => setDeleteTarget(c)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Discount codes"
      eyebrow="Storefront"
      actions={
        <Button size="sm" icon={Plus} href="/dashboard/coupons/new">
          New code
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatTile icon={TicketPercent} label="Active now" value={countOf("active")} hint={[`${countOf("scheduled")} scheduled`, endingSoon > 0 && `${endingSoon} ending soon`].filter(Boolean).join(" · ")} accent={BRAND} />
        <StatTile icon={Users} label="Times used" value={totalUses} accent={FRESH} />
        <StatTile icon={Wallet} label="Discount given" value={formatMoney(totalGiven)} hint="Not counting cancelled orders" accent="#F59E0B" />
      </div>

      <Card>
        <p className="mb-4 text-sm text-slate-500">
          Codes customers type in their basket, for free. To charge for a coupon, use{" "}
          <Link href="/dashboard/coupon-sales" className="font-semibold text-[#4267B2] underline">Sell coupons</Link>.
        </p>
        <Toolbar>
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: own.length },
              { value: "active", label: "Active", count: countOf("active") },
              { value: "scheduled", label: "Scheduled", count: countOf("scheduled") },
              { value: "ended", label: "Ended", count: own.filter(ended).length },
              { value: "off", label: "Off", count: countOf("off") },
              { value: "sold", label: "Sold to customers", count: sold },
            ]}
          />
          <SearchInput value={query} onChange={setQuery} placeholder="Search code, name or buyer" className="sm:max-w-xs" />
        </Toolbar>

        <div className="mt-5">
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(c) => c.code}
            minWidth={1020}
            loading={loading && !loaded}
            empty={
              <EmptyState
                icon={Receipt}
                title={coupons.length ? "No codes here" : "No codes yet"}
                body={
                  coupons.length
                    ? "Try another filter or search term."
                    : "Create a code with its discount, dates and limits."
                }
              />
            }
          />
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        icon={Trash2}
        title="Delete this coupon?"
        confirmLabel="Delete coupon"
        preview={deleteTarget && { title: deleteTarget.code, meta: describeDiscount(deleteTarget) }}
        consequences={[
          "Customers can't use this code any more.",
          "Past orders keep the discount they received.",
          "Its usage counts are removed. To keep them, switch the coupon off instead.",
        ]}
      />
    </DashboardLayout>
  );
}

CouponsPage.getLayout = dashboardGetLayout;
