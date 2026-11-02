import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { AlertTriangle, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import Card, { CardHeader } from "@/components/dashboard/ui/Card";
import Badge from "@/components/dashboard/ui/Badge";
import Button from "@/components/dashboard/ui/Button";
import DataTable from "@/components/dashboard/ui/DataTable";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import Toolbar, { SearchInput } from "@/components/dashboard/ui/Toolbar";
import SegmentedControl from "@/components/dashboard/ui/SegmentedControl";
import { FOCUS } from "@/components/dashboard/theme";

import { timeAgo } from "@/lib/analytics";
import { shortOrderId } from "@/data/returns";
import { FULFILMENT_STEPS, ISSUE_TYPES, RESOLUTIONS, STEP_INFO, allIssues } from "@/data/fulfilment";

// Problems are only ever reported before delivery.
const STEPS = FULFILMENT_STEPS.filter((s) => s !== "delivered");

/** Which step problems happen at. One measure, so one hue; the title names it. */
function StepBreakdown({ issues, active, onSelect }) {
  const max = Math.max(1, ...STEPS.map((s) => issues.filter((i) => i.step === s).length));
  return (
    <Card>
      <CardHeader
        title="Where orders go wrong"
        subtitle="Problems reported at each step. Choose a step to see its problems."
      />
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STEPS.map((step) => {
          const rows = issues.filter((i) => i.step === step);
          const open = rows.filter((i) => i.status === "open").length;
          const selected = active === step;
          return (
            <button
              key={step}
              type="button"
              aria-pressed={selected}
              title={`${STEP_INFO[step].label}: ${rows.length} problem${rows.length === 1 ? "" : "s"}, ${open} open`}
              onClick={() => onSelect(selected ? null : step)}
              className={`rounded-2xl p-4 text-left transition ${FOCUS} ${
                selected ? "bg-[#E4ECFA] ring-2 ring-[#4267B2]" : "bg-[#F6F8FC] hover:bg-[#EEF2FA]"
              }`}
            >
              <span className="block text-sm font-bold text-slate-700">{STEP_INFO[step].label}</span>
              <span className="mt-1 block text-3xl font-bold tabular-nums text-slate-800">{rows.length}</span>
              <span className="mt-3 block h-2 rounded-full bg-white">
                <span
                  className="block h-2 rounded-full bg-[#4267B2]"
                  style={{ width: `${(rows.length / max) * 100}%` }}
                />
              </span>
              <span className="mt-2 flex items-center gap-1 text-xs font-medium text-slate-500">
                {open > 0 && <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />}
                {open} open
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function TypeBreakdown({ issues }) {
  const rows = Object.entries(ISSUE_TYPES)
    .map(([key, info]) => ({ key, label: info.label, count: issues.filter((i) => i.type === key).length }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <Card>
      <CardHeader title="What goes wrong" subtitle="Problems by type, most common first." />
      {rows.length ? (
        <ul className="mt-5 flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.key} title={`${r.label}: ${r.count}`}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">{r.label}</span>
                <span className="font-bold tabular-nums text-slate-800">{r.count}</span>
              </div>
              <span className="mt-1 block h-2 rounded-full bg-[#F2F6FC]">
                <span className="block h-2 rounded-full bg-[#4267B2]" style={{ width: `${(r.count / max) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-slate-400">Nothing reported yet.</p>
      )}
    </Card>
  );
}

export default function DeliveryProblemsPage() {
  const { items: orders, status } = useSelector((s) => s.adminOrders);
  const [filter, setFilter] = useState("open");
  const [step, setStep] = useState(null);
  const [query, setQuery] = useState("");

  const issues = useMemo(() => allIssues(orders), [orders]);
  const open = issues.filter((i) => i.status === "open");

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase().replace(/^#/, "");
    return issues.filter((i) => {
      if (filter !== "all" && i.status !== filter) return false;
      if (step && i.step !== step) return false;
      if (!term) return true;
      return [i.order.id, i.order.user?.name, i.order.user?.email, i.order.user?.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [issues, filter, step, query]);

  const columns = [
    {
      key: "order",
      label: "Order",
      render: (i) => (
        <span>
          <span className="block font-mono text-xs font-semibold text-slate-700">{shortOrderId(i.order.id)}</span>
          <span className="block text-xs text-slate-400">{timeAgo(i.reportedAt)}</span>
        </span>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      sortable: true,
      sortValue: (i) => i.order.user?.name || "",
      render: (i) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-800">{i.order.user?.name || "Guest"}</p>
          <p className="truncate text-xs text-slate-400">{i.order.user?.phone || i.order.user?.email || "—"}</p>
        </div>
      ),
    },
    {
      key: "step",
      label: "Failed at",
      sortable: true,
      sortValue: (i) => FULFILMENT_STEPS.indexOf(i.step),
      render: (i) => <span className="font-semibold text-slate-700">{STEP_INFO[i.step]?.label}</span>,
    },
    {
      key: "type",
      label: "Problem",
      render: (i) => (
        <div className="min-w-0">
          <p className="text-slate-600">{ISSUE_TYPES[i.type]?.label}</p>
          {i.items?.length > 0 && (
            <p className="truncate text-xs text-slate-400">
              {i.items.map((x) => `${x.quantity} × ${x.title}`).join(", ")}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      render: (i) =>
        i.status === "open" ? (
          <Badge tone="danger" icon={AlertTriangle}>Open</Badge>
        ) : (
          <Badge tone={i.resolution === "cancel" ? "neutral" : "success"} icon={CheckCircle2}>
            {RESOLUTIONS[i.resolution]?.label}
          </Badge>
        ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (i) => (
        <Button
          size="sm"
          variant={i.status === "open" ? "primary" : "outline"}
          icon={ArrowRight}
          href={`/dashboard/orders/${i.order.id}`}
        >
          {i.status === "open" ? "Resolve" : "View"}
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout title="Delivery problems" eyebrow="Store">
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <StepBreakdown issues={issues} active={step} onSelect={setStep} />
        <TypeBreakdown issues={issues} />
      </div>

      <Card>
        <Toolbar>
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            options={[
              { value: "open", label: "Open", count: open.length },
              { value: "resolved", label: "Resolved", count: issues.length - open.length },
              { value: "all", label: "All", count: issues.length },
            ]}
          />
          <SearchInput value={query} onChange={setQuery} placeholder="Search order, name, phone…" className="sm:max-w-xs" />
        </Toolbar>
        <div className="mt-5">
          <DataTable
            columns={columns}
            rows={rows}
            minWidth={980}
            loading={status === "loading" && !orders.length}
            empty={
              <EmptyState
                icon={ShieldCheck}
                title={issues.length ? "Nothing here" : "No delivery problems"}
                body={
                  issues.length
                    ? "Try another filter or step."
                    : "Report one from any order that hasn't been delivered yet."
                }
              />
            }
          />
        </div>
      </Card>
    </DashboardLayout>
  );
}

DeliveryProblemsPage.getLayout = dashboardGetLayout;
