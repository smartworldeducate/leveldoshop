import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { Download, PieChart, Receipt, ShoppingBasket, TrendingUp } from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import Card, { CardHeader } from "@/components/dashboard/ui/Card";
import Button from "@/components/dashboard/ui/Button";
import StatTile from "@/components/dashboard/ui/StatTile";
import DataTable from "@/components/dashboard/ui/DataTable";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import BarChart from "@/components/dashboard/ui/BarChart";
import SegmentedControl from "@/components/dashboard/ui/SegmentedControl";
import { BRAND, FRESH } from "@/components/dashboard/theme";

import {
  RANGES,
  categoryBreakdown,
  formatDate,
  isCompleted,
  orderTotal,
  orderUnits,
  ordersInRange,
  revenueSeries,
  topProducts,
} from "@/lib/analytics";
import { categoryLabel, formatMoney } from "@/data/grocery";

const RANGE_OPTIONS = [
  { value: "week", label: "7 days" },
  { value: "month", label: "30 days" },
  { value: "year", label: "12 months" },
];

export default function ReportsPage() {
  const [range, setRange] = useState("month");
  const products = useSelector((s) => s.products.items);
  const orders = useSelector((s) => s.adminOrders.items);
  const loading = useSelector((s) => s.adminOrders.status === "loading");
  const categories = useSelector((s) => s.categories.items);

  const scoped = useMemo(() => ordersInRange(orders, RANGES[range].days), [orders, range]);
  const series = useMemo(() => revenueSeries(orders, range), [orders, range]);
  const best = useMemo(() => topProducts(scoped, products, 8), [scoped, products]);
  const categoryMix = useMemo(
    () => categoryBreakdown(scoped, products, categories),
    [scoped, products, categories]
  );

  const revenue = scoped.reduce((sum, o) => sum + orderTotal(o), 0);
  const units = scoped.reduce((sum, o) => sum + orderUnits(o), 0);
  const completed = scoped.filter(isCompleted).length;

  const exportReport = () => {
    if (!scoped.length) return toast.error("No orders in this period");
    const book = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet(
        scoped.map((o) => ({
          "Order ID": o.id,
          Date: formatDate(o.createdAt),
          Customer: o.user?.name || "",
          City: o.user?.city || "",
          Items: orderUnits(o),
          Total: orderTotal(o),
          Status: o.status || "pending",
        }))
      ),
      "Orders"
    );

    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet(
        best.map((p) => ({
          Product: p.title,
          Category: p.categorySlug ? categoryLabel(categories, p.categorySlug) : "",
          "Units sold": p.units,
          Revenue: p.revenue,
        }))
      ),
      "Top products"
    );

    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet(
        categoryMix.map((c) => ({ Category: c.name, Revenue: c.revenue, "Share %": c.share }))
      ),
      "Categories"
    );

    XLSX.writeFile(book, `grocery-report-${range}.xlsx`);
  };

  return (
    <DashboardLayout
      title="Reports"
      eyebrow="Insights"
      actions={
        <>
          <SegmentedControl
            options={RANGE_OPTIONS}
            value={range}
            onChange={setRange}
            className="hidden sm:inline-flex"
          />
          <Button variant="outline" size="sm" icon={Download} onClick={exportReport}>
            Export
          </Button>
        </>
      }
    >
      <div className="sm:hidden">
        <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={TrendingUp} label={`Revenue · ${RANGES[range].label}`} value={formatMoney(revenue)} accent={BRAND} />
        <StatTile icon={ShoppingBasket} label="Orders" value={scoped.length} hint={`${completed} completed`} accent={FRESH} />
        <StatTile icon={Receipt} label="Items sold" value={units} accent="#8B5CF6" />
        <StatTile
          icon={PieChart}
          label="Average basket"
          value={formatMoney(scoped.length ? revenue / scoped.length : 0)}
          accent="#F59E0B"
        />
      </div>

      <Card>
        <CardHeader title="Revenue" subtitle={`Per ${range === "year" ? "month" : "day"}`} />
        <div className="mt-6">
          {scoped.length ? (
            <BarChart data={series.values} labels={series.labels} formatValue={formatMoney} />
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="No sales in this period"
              body="Pick a longer range, or wait for the next order."
            />
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Best sellers" subtitle={`Top items in the last ${RANGES[range].label}`} />
          <div className="mt-4">
            <DataTable
              minWidth={560}
              rowKey={(p) => p.key}
              loading={loading && !orders.length}
              rows={best}
              empty={<EmptyState icon={ShoppingBasket} title="Nothing sold yet" />}
              columns={[
                {
                  key: "title",
                  label: "Product",
                  render: (p) => (
                    <div className="flex min-w-0 items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.image || "/placeholder.png"}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800">{p.title}</p>
                        <p className="truncate text-xs text-slate-400">
                          {p.categorySlug ? categoryLabel(categories, p.categorySlug) : "Removed from catalogue"}
                        </p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "units",
                  label: "Units",
                  align: "center",
                  sortable: true,
                  render: (p) => <span className="font-semibold text-slate-600">{p.units}</span>,
                },
                {
                  key: "revenue",
                  label: "Revenue",
                  align: "right",
                  sortable: true,
                  render: (p) => (
                    <span className="font-semibold text-slate-800">{formatMoney(p.revenue)}</span>
                  ),
                },
              ]}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Category mix" subtitle="Share of revenue" />
          <div className="mt-5 flex flex-col gap-4">
            {categoryMix.length ? (
              categoryMix.map((c) => (
                <div key={c.slug}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-600">{c.name}</span>
                    <span className="text-xs font-semibold text-slate-400">{c.share}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(c.share, 3)}%`, backgroundColor: c.accent }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{formatMoney(c.revenue)}</p>
                </div>
              ))
            ) : (
              <EmptyState icon={PieChart} title="No category data" />
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

ReportsPage.getLayout = dashboardGetLayout;
