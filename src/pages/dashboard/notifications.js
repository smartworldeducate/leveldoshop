import { useMemo, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import {
  AlertTriangle,
  ArrowRight,
  BellOff,
  CalendarClock,
  CheckCircle2,
  Info,
  PackageX,
} from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import Card, { CardHeader } from "@/components/dashboard/ui/Card";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import SegmentedControl from "@/components/dashboard/ui/SegmentedControl";
import { tone as toneOf } from "@/components/dashboard/theme";

import { storeAlerts, timeAgo } from "@/lib/analytics";

const ICONS = {
  danger: PackageX,
  warning: AlertTriangle,
  info: Info,
};

const FILTERS = [
  { value: "all", label: "Everything" },
  { value: "danger", label: "Urgent" },
  { value: "warning", label: "Watch" },
  { value: "info", label: "Orders" },
];

export default function AlertsPage() {
  const products = useSelector((s) => s.products.items);
  const orders = useSelector((s) => s.adminOrders.items);
  const [filter, setFilter] = useState("all");

  const alerts = useMemo(() => storeAlerts(orders, products), [orders, products]);
  const rows = filter === "all" ? alerts : alerts.filter((a) => a.tone === filter);

  const counts = useMemo(
    () =>
      FILTERS.map((f) => ({
        ...f,
        count: f.value === "all" ? alerts.length : alerts.filter((a) => a.tone === f.value).length,
      })),
    [alerts]
  );

  return (
    <DashboardLayout title="Alerts" eyebrow="Insights">
      <Card>
        <CardHeader
          title="What needs you"
          subtitle="Generated live from stock levels, best-before dates and open orders"
          action={<SegmentedControl options={counts} value={filter} onChange={setFilter} />}
        />

        <div className="mt-5 flex flex-col gap-3">
          {rows.length ? (
            rows.map((a) => {
              const Icon = ICONS[a.tone] || Info;
              const t = toneOf(a.tone);
              return (
                <Link
                  key={a.id}
                  href={a.href}
                  className="group flex items-start gap-4 rounded-2xl bg-[#F6F8FC] p-4 transition hover:bg-[#EDF2FA]"
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.bg} ${t.text}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">{a.title}</p>
                    <p className="text-sm text-slate-500">{a.body}</p>
                    {a.date && <p className="mt-1 text-xs text-slate-400">{timeAgo(a.date)}</p>}
                  </div>
                  <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-[#4267B2]" />
                </Link>
              );
            })
          ) : (
            <EmptyState
              icon={alerts.length ? BellOff : CheckCircle2}
              title={alerts.length ? "Nothing in this filter" : "All clear"}
              body={
                alerts.length
                  ? "Switch filters to see the rest."
                  : "Stock is healthy, nothing is expiring and every order is fulfilled."
              }
            />
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="How alerts work" subtitle="Thresholds are shared with the storefront" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: PackageX, title: "Out of stock", body: "Stock hits zero — the item stops being sellable." },
            { icon: AlertTriangle, title: "Low stock", body: "10 units or fewer left of an item." },
            { icon: CalendarClock, title: "Expiring", body: "Best-before date within the next 7 days." },
          ].map((row) => (
            <div key={row.title} className="rounded-2xl bg-[#F6F8FC] p-4">
              <row.icon className="h-5 w-5 text-[#4267B2]" />
              <p className="mt-2 font-semibold text-slate-700">{row.title}</p>
              <p className="mt-1 text-sm text-slate-400">{row.body}</p>
            </div>
          ))}
        </div>
      </Card>
    </DashboardLayout>
  );
}

AlertsPage.getLayout = dashboardGetLayout;
