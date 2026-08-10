import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  AlertTriangle,
  Boxes,
  Package,
  Receipt,
  ShoppingBasket,
  Wallet,
} from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import Card, { CardHeader } from "@/components/dashboard/ui/Card";
import StatTile from "@/components/dashboard/ui/StatTile";
import Button from "@/components/dashboard/ui/Button";
import Badge from "@/components/dashboard/ui/Badge";
import DataTable from "@/components/dashboard/ui/DataTable";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import AreaChart from "@/components/dashboard/ui/AreaChart";
import SegmentedControl from "@/components/dashboard/ui/SegmentedControl";
import { BRAND, FRESH } from "@/components/dashboard/theme";

import {
  RANGES,
  categoryBreakdown,
  formatDate,
  isCompleted,
  orderTotal,
  ordersInRange,
  revenueSeries,
  storeKpis,
} from "@/lib/analytics";
import { LOW_STOCK_THRESHOLD, formatMoney, packLabel, stockState } from "@/data/grocery";

const RANGE_OPTIONS = [
  { value: "week", label: "7 days" },
  { value: "month", label: "30 days" },
  { value: "year", label: "12 months" },
];

export default function DashboardHome() {
  const [range, setRange] = useState("week");
  const products = useSelector((s) => s.products.items);
  const orders = useSelector((s) => s.adminOrders.items);
  const loading = useSelector((s) => s.adminOrders.status === "loading");
  const categories = useSelector((s) => s.categories.items);

  const kpis = useMemo(() => storeKpis(orders, products), [orders, products]);
  const scoped = useMemo(() => ordersInRange(orders, RANGES[range].days), [orders, range]);
  const series = useMemo(() => revenueSeries(orders, range), [orders, range]);
  const categoryMix = useMemo(
    () => categoryBreakdown(orders, products, categories).slice(0, 5),
    [orders, products, categories]
  );

  const rangeRevenue = scoped.reduce((sum, o) => sum + orderTotal(o), 0);
  const recent = [...orders].slice(0, 6);
  const needsRestock = products
    .filter((p) => (Number(p.stock) || 0) <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0))
    .slice(0, 6);

  return (
    <DashboardLayout
      title="Overview"
      eyebrow="Store"
      actions={
        <Button href="/dashboard/products" size="sm" icon={Package} className="hidden sm:inline-flex">
          Manage catalogue
        </Button>
      }
    >
      {/* headline numbers */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={Wallet}
          label={`Revenue · ${RANGES[range].label}`}
          value={formatMoney(rangeRevenue)}
          hint={`${formatMoney(kpis.revenue)} all time`}
          accent={BRAND}
          delta={`${kpis.trend.percent}%`}
          up={kpis.trend.up}
        />
        <StatTile
          icon={ShoppingBasket}
          label="Orders"
          value={kpis.orders}
          hint={`${kpis.pending} awaiting fulfilment`}
          accent={FRESH}
        />
        <StatTile
          icon={Receipt}
          label="Average basket"
          value={formatMoney(kpis.averageOrder)}
          hint={`${scoped.length} in the last ${RANGES[range].label}`}
          accent="#8B5CF6"
        />
        <StatTile
          icon={AlertTriangle}
          label="Needs attention"
          value={kpis.lowStock + kpis.outOfStock}
          hint={`${kpis.outOfStock} out · ${kpis.expiring} expiring`}
          accent="#F59E0B"
          href="/dashboard/inventory"
        />
      </div>

      {/* revenue + category mix */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Sales"
            subtitle={`${formatMoney(rangeRevenue)} across ${scoped.length} order${
              scoped.length === 1 ? "" : "s"
            }`}
            action={<SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} />}
          />
          <div className="mt-6">
            {orders.length ? (
              <AreaChart
                data={series.values}
                labels={series.labels}
                color={BRAND}
                formatValue={formatMoney}
              />
            ) : (
              <EmptyState
                icon={ShoppingBasket}
                title="No orders yet"
                body="Once customers check out, daily revenue shows up here."
              />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Top categories" subtitle="Share of revenue" />
          <div className="mt-5 flex flex-col gap-4">
            {categoryMix.length ? (
              categoryMix.map((c) => (
                <div key={c.slug}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-600">{c.name}</span>
                    <span className="font-semibold text-slate-800">{formatMoney(c.revenue)}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(c.share, 3)}%`, backgroundColor: c.accent }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={Boxes}
                title="Nothing sold yet"
                body="Category performance appears after the first order."
              />
            )}
          </div>
        </Card>
      </div>

      {/* recent orders + restock list */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent orders"
            subtitle="Newest first"
            action={
              <Button href="/dashboard/orders" variant="ghost" size="sm">
                View all
              </Button>
            }
          />
          <div className="mt-4">
            <DataTable
              minWidth={620}
              loading={loading && !orders.length}
              rows={recent}
              empty={
                <EmptyState
                  icon={ShoppingBasket}
                  title="No orders yet"
                  body="New checkouts land here in real time."
                />
              }
              columns={[
                {
                  key: "customer",
                  label: "Customer",
                  render: (o) => (
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">
                        {o.user?.name || "Guest"}
                      </p>
                      <p className="truncate text-xs text-slate-400">{o.user?.city || o.user?.email}</p>
                    </div>
                  ),
                },
                {
                  key: "items",
                  label: "Items",
                  render: (o) => (
                    <span className="text-slate-500">{o.cartItems?.length || 0}</span>
                  ),
                },
                { key: "date", label: "Placed", render: (o) => (
                  <span className="text-slate-500">{formatDate(o.createdAt)}</span>
                ) },
                {
                  key: "status",
                  label: "Status",
                  render: (o) => (
                    <Badge tone={isCompleted(o) ? "success" : "warning"}>
                      {isCompleted(o) ? "Completed" : "Pending"}
                    </Badge>
                  ),
                },
                {
                  key: "total",
                  label: "Total",
                  align: "right",
                  render: (o) => (
                    <span className="font-semibold text-slate-800">{formatMoney(orderTotal(o))}</span>
                  ),
                },
              ]}
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Restock soon"
            subtitle={`${kpis.lowStock} low · ${kpis.outOfStock} out`}
            action={
              <Button href="/dashboard/inventory" variant="ghost" size="sm">
                Inventory
              </Button>
            }
          />
          <div className="mt-4 flex flex-col gap-3">
            {needsRestock.length ? (
              needsRestock.map((p) => {
                const state = stockState(p.stock);
                return (
                  <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-[#F6F8FC] p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.images?.[0] || "/placeholder.png"}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-700">{p.title}</p>
                      <p className="truncate text-xs text-slate-400">{packLabel(p)}</p>
                    </div>
                    <Badge tone={state.tone}>{state.key === "out" ? "Out" : p.stock}</Badge>
                  </div>
                );
              })
            ) : (
              <EmptyState
                icon={Boxes}
                title="Shelves are healthy"
                body="Nothing is below the low-stock threshold."
              />
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

DashboardHome.getLayout = dashboardGetLayout;
