import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { Download, Repeat, UserRound, Users, Wallet } from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import Card from "@/components/dashboard/ui/Card";
import Button from "@/components/dashboard/ui/Button";
import Badge from "@/components/dashboard/ui/Badge";
import DataTable from "@/components/dashboard/ui/DataTable";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import StatTile from "@/components/dashboard/ui/StatTile";
import Toolbar, { SearchInput } from "@/components/dashboard/ui/Toolbar";
import { BRAND, FRESH } from "@/components/dashboard/theme";

import { customersFromOrders, formatDate, timeAgo } from "@/lib/analytics";
import { formatMoney } from "@/data/grocery";

export default function CustomersPage() {
  const orders = useSelector((s) => s.adminOrders.items);
  const loading = useSelector((s) => s.adminOrders.status === "loading");
  const [query, setQuery] = useState("");

  const customers = useMemo(() => customersFromOrders(orders), [orders]);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((c) =>
      [c.name, c.email, c.phone, c.city].filter(Boolean).some((v) => v.toLowerCase().includes(term))
    );
  }, [customers, query]);

  const repeat = customers.filter((c) => c.orders > 1);
  const totalSpend = customers.reduce((sum, c) => sum + c.spend, 0);

  const exportExcel = () => {
    if (!rows.length) return toast.error("Nothing to export");
    const sheet = XLSX.utils.json_to_sheet(
      rows.map((c) => ({
        Name: c.name,
        Email: c.email,
        Phone: c.phone,
        City: c.city,
        Address: c.address,
        Orders: c.orders,
        "Total spend": c.spend,
        "Last order": c.lastOrder ? formatDate(c.lastOrder) : "",
      }))
    );
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Customers");
    XLSX.writeFile(book, "grocery-customers.xlsx");
  };

  const columns = [
    {
      key: "name",
      label: "Customer",
      sortable: true,
      render: (c) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E4ECFA] text-xs font-bold text-[#4267B2]">
            {c.name
              .split(/\s+/)
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase() || "?"}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-800">{c.name}</p>
            <p className="truncate text-xs text-slate-400">{c.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (c) => <span className="text-slate-500">{c.phone || "—"}</span>,
    },
    {
      key: "city",
      label: "City",
      sortable: true,
      render: (c) => <span className="text-slate-500">{c.city || "—"}</span>,
    },
    {
      key: "orders",
      label: "Orders",
      align: "center",
      sortable: true,
      render: (c) => (
        <Badge tone={c.orders > 1 ? "success" : "neutral"}>
          {c.orders} {c.orders > 1 ? "orders" : "order"}
        </Badge>
      ),
    },
    {
      key: "spend",
      label: "Total spend",
      align: "right",
      sortable: true,
      render: (c) => <span className="font-semibold text-slate-800">{formatMoney(c.spend)}</span>,
    },
    {
      key: "lastOrder",
      label: "Last order",
      align: "right",
      sortable: true,
      sortValue: (c) => c.lastOrder?.getTime() || 0,
      render: (c) => <span className="text-slate-500">{timeAgo(c.lastOrder)}</span>,
    },
  ];

  return (
    <DashboardLayout
      title="Customers"
      eyebrow="Store"
      actions={
        <Button variant="outline" size="sm" icon={Download} onClick={exportExcel}>
          Export
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatTile icon={Users} label="Customers" value={customers.length} accent={BRAND} />
        <StatTile
          icon={Repeat}
          label="Repeat buyers"
          value={repeat.length}
          hint={customers.length ? `${Math.round((repeat.length / customers.length) * 100)}% of all` : undefined}
          accent={FRESH}
        />
        <StatTile
          icon={Wallet}
          label="Lifetime value"
          value={formatMoney(customers.length ? totalSpend / customers.length : 0)}
          hint="Average per customer"
          accent="#8B5CF6"
        />
      </div>

      <Card>
        <Toolbar>
          <p className="text-sm text-slate-400">
            Built from order history — every checkout email is one customer.
          </p>
          <SearchInput value={query} onChange={setQuery} placeholder="Search customers"
            className="sm:max-w-xs"
          />
        </Toolbar>

        <div className="mt-5">
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(c) => c.email}
            minWidth={860}
            loading={loading && !orders.length}
            empty={
              <EmptyState
                icon={UserRound}
                title={customers.length ? "No customers match" : "No customers yet"}
                body={
                  customers.length
                    ? "Try another search term."
                    : "The first checkout creates your first customer record."
                }
              />
            }
          />
        </div>
      </Card>
    </DashboardLayout>
  );
}

CustomersPage.getLayout = dashboardGetLayout;
