import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { ArrowRight, Banknote, Eye, PackageCheck, Search, Undo2 } from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import { ReturnProgressBar, STAGE_ICONS } from "@/components/dashboard/ReturnProgress";
import Card from "@/components/dashboard/ui/Card";
import Button from "@/components/dashboard/ui/Button";
import DataTable from "@/components/dashboard/ui/DataTable";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import ProductThumb from "@/components/dashboard/ui/ProductThumb";
import Toolbar, { SearchInput } from "@/components/dashboard/ui/Toolbar";
import SegmentedControl from "@/components/dashboard/ui/SegmentedControl";
import { FOCUS } from "@/components/dashboard/theme";

import { timeAgo } from "@/lib/analytics";
import { formatMoney } from "@/data/grocery";
import {
  RETURN_STATUS,
  RETURN_STEPS,
  allReturns,
  isOpenReturn,
  reasonLabel,
  returnValue,
  shortOrderId,
} from "@/data/returns";

const STAGE_NOTES = {
  requested: "Waiting for your decision",
  approved: "Get the items back",
  received: "Inspected, ready to refund",
  refunded: "Closed and paid",
};

/** The button a row shows: what the next person needs to do. */
const NEXT_ACTION = {
  requested: { label: "Review", icon: Search },
  approved: { label: "Receive goods", icon: PackageCheck },
  received: { label: "Refund", icon: Banknote },
};

const workspace = (r) => `/dashboard/returns/${r.order.id}/${r.id}`;

/** The return process at a glance. Each stage is also the filter for its rows. */
function Pipeline({ returns, active, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch lg:gap-2">
      {RETURN_STEPS.map((step, i) => {
        const Icon = STAGE_ICONS[step];
        const rows = returns.filter((r) => r.status === step);
        const selected = active === step;
        const value = rows.reduce(
          (sum, r) => sum + (step === "refunded" ? Number(r.refund?.amount) || 0 : returnValue(r)),
          0
        );
        return (
          <Fragment key={step}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(selected ? "open" : step)}
              className={`rounded-[22px] p-5 text-left transition hover:-translate-y-0.5 ${FOCUS} ${
                selected
                  ? "bg-[linear-gradient(150deg,#5B83D6,#35528F)] text-white shadow-[0_22px_40px_-22px_rgba(66,103,178,0.95)]"
                  : "bg-white text-slate-800 shadow-[0_20px_45px_-30px_rgba(80,70,150,0.55)]"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                    selected ? "bg-white/20 text-white" : step === "refunded" ? "bg-emerald-50 text-emerald-600" : "bg-[#E4ECFA] text-[#4267B2]"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-3xl font-bold tabular-nums">{rows.length}</span>
              </span>
              <span className="mt-4 block text-sm font-bold">{RETURN_STATUS[step].label}</span>
              <span className={`mt-0.5 block text-xs ${selected ? "text-white/70" : "text-slate-400"}`}>
                {STAGE_NOTES[step]}
              </span>
              <span className={`mt-3 block border-t pt-3 text-sm font-semibold ${selected ? "border-white/20" : "border-slate-100 text-slate-600"}`}>
                {formatMoney(value)}
              </span>
            </button>
            {i < RETURN_STEPS.length - 1 && (
              <span className="hidden items-center text-[#B9C7E4] lg:flex" aria-hidden="true">
                <ArrowRight className="h-5 w-5" />
              </span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function ItemThumbs({ items }) {
  const units = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex -space-x-2.5">
        {items.slice(0, 3).map((item) => (
          <ProductThumb key={item.line} src={item.image} className="h-9 w-9 ring-2 ring-white" />
        ))}
      </span>
      <span className="whitespace-nowrap text-xs font-medium text-slate-500">
        {units} unit{units === 1 ? "" : "s"}
      </span>
    </div>
  );
}

export default function ReturnsPage() {
  const { items: orders, status } = useSelector((s) => s.adminOrders);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("open");

  const returns = useMemo(() => allReturns(orders), [orders]);
  const open = returns.filter(isOpenReturn);
  const rejected = returns.filter((r) => r.status === "rejected");

  const restocked = returns.flatMap((r) => r.items).reduce((sum, i) => sum + (Number(i.restocked) || 0), 0);
  const writtenOff = returns
    .filter((r) => ["received", "refunded"].includes(r.status))
    .flatMap((r) => r.items)
    .reduce((sum, i) => sum + (Number(i.quantity) || 0) - (Number(i.restocked) || 0), 0);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase().replace(/^#/, "");
    return returns.filter((r) => {
      if (filter === "open" && !isOpenReturn(r)) return false;
      if (filter !== "open" && filter !== "all" && r.status !== filter) return false;
      if (!term) return true;
      return [r.id, r.order.id, r.order.user?.name, r.order.user?.email, r.order.user?.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [returns, query, filter]);

  const columns = [
    {
      key: "order",
      label: "Order",
      render: (r) => (
        <Link href={workspace(r)} className="block">
          <span className="block font-mono text-xs font-semibold text-[#4267B2]">{shortOrderId(r.order.id)}</span>
          <span className="block text-xs text-slate-400">{timeAgo(r.createdAt)}</span>
        </Link>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      sortable: true,
      sortValue: (r) => r.order.user?.name || "",
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-800">{r.order.user?.name || "Guest"}</p>
          <p className="truncate text-xs text-slate-400">
            {r.source === "customer" ? "Requested by customer" : "Started by staff"}
          </p>
        </div>
      ),
    },
    {
      key: "items",
      label: "Items",
      render: (r) => <ItemThumbs items={r.items} />,
    },
    {
      key: "reason",
      label: "Reason",
      render: (r) => <span className="text-slate-500">{reasonLabel(r.reason)}</span>,
    },
    {
      key: "value",
      label: "Value",
      align: "right",
      sortable: true,
      sortValue: returnValue,
      render: (r) => <span className="font-semibold text-slate-800">{formatMoney(returnValue(r))}</span>,
    },
    {
      key: "status",
      label: "Progress",
      align: "center",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => <ReturnProgressBar status={r.status} />,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (r) => {
        const next = NEXT_ACTION[r.status];
        return next ? (
          <Button size="sm" icon={next.icon} href={workspace(r)}>
            {next.label}
          </Button>
        ) : (
          <Button variant="outline" size="sm" icon={Eye} href={workspace(r)}>
            View
          </Button>
        );
      },
    },
  ];

  return (
    <DashboardLayout title="Returns" eyebrow="Store">
      <Pipeline returns={returns} active={filter} onSelect={setFilter} />

      <Card>
        <Toolbar>
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            options={[
              { value: "open", label: "Open", count: open.length },
              { value: "rejected", label: "Rejected", count: rejected.length },
              { value: "all", label: "All", count: returns.length },
            ]}
          />
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
            <span>
              <span className="font-bold text-emerald-600">{restocked}</span> units restocked
            </span>
            <span>
              <span className="font-bold text-rose-600">{writtenOff}</span> written off
            </span>
          </p>
          <SearchInput value={query} onChange={setQuery} placeholder="Search order, name, phone…" className="sm:max-w-xs" />
        </Toolbar>

        <div className="mt-5">
          <DataTable
            columns={columns}
            rows={rows}
            minWidth={1040}
            loading={status === "loading" && !orders.length}
            empty={
              <EmptyState
                icon={Undo2}
                title={returns.length ? "No returns here" : "No returns yet"}
                body={
                  returns.length
                    ? "Try another stage or search term."
                    : "Customers can request one from My orders, or start one from a completed order."
                }
              />
            }
          />
        </div>
      </Card>
    </DashboardLayout>
  );
}

ReturnsPage.getLayout = dashboardGetLayout;
