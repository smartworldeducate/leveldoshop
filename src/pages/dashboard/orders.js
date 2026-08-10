import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  MapPin,
  Phone,
  ShoppingBasket,
  Trash2,
} from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import Card from "@/components/dashboard/ui/Card";
import Button from "@/components/dashboard/ui/Button";
import Badge from "@/components/dashboard/ui/Badge";
import ConfirmDialog from "@/components/dashboard/ui/ConfirmDialog";
import DataTable from "@/components/dashboard/ui/DataTable";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import StatTile from "@/components/dashboard/ui/StatTile";
import Toolbar, { SearchInput } from "@/components/dashboard/ui/Toolbar";
import SegmentedControl from "@/components/dashboard/ui/SegmentedControl";
import { BRAND, FRESH } from "@/components/dashboard/theme";

import { deleteOrder, toggleOrderStatus } from "@/redux/admin/ordersSlice";
import { fetchProducts } from "@/redux/products/productsSlice";
import { formatDateTime, isCompleted, orderTotal, orderUnits, timeAgo } from "@/lib/analytics";
import { formatMoney } from "@/data/grocery";

export default function OrdersPage() {
  const dispatch = useDispatch();
  const { items: orders, status, processingId } = useSelector((s) => s.adminOrders);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const pending = orders.filter((o) => !isCompleted(o));
  const revenue = orders.reduce((sum, o) => sum + orderTotal(o), 0);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter === "pending" && isCompleted(o)) return false;
      if (filter === "completed" && !isCompleted(o)) return false;
      if (!term) return true;
      return [o.id, o.user?.name, o.user?.email, o.user?.phone, o.user?.city]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [orders, query, filter]);

  const complete = async (order) => {
    try {
      await dispatch(toggleOrderStatus(order)).unwrap();
      toast.success("Order completed — stock adjusted");
      // The transaction decremented stock in Firestore; refresh the catalogue
      // so inventory and the low-stock badges reflect it immediately.
      dispatch(fetchProducts());
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Could not complete the order");
    }
  };

  const confirmDelete = async () => {
    try {
      const wasCompleted = isCompleted(deleteTarget);
      await dispatch(deleteOrder(deleteTarget.id)).unwrap();
      toast.success(wasCompleted ? "Order deleted — stock restored" : "Order deleted");
      // Deleting a completed order puts its stock back; re-read the catalogue.
      if (wasCompleted) dispatch(fetchProducts());
      setDeleteTarget(null);
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Could not delete the order");
    }
  };

  const exportExcel = () => {
    if (!rows.length) return toast.error("Nothing to export");
    const sheet = XLSX.utils.json_to_sheet(
      rows.map((o) => ({
        "Order ID": o.id,
        Customer: o.user?.name || "",
        Email: o.user?.email || "",
        Phone: o.user?.phone || "",
        City: o.user?.city || "",
        Address: o.user?.address || "",
        Items: orderUnits(o),
        Total: orderTotal(o),
        Status: o.status || "pending",
        Placed: formatDateTime(o.createdAt),
        Products: (o.cartItems || [])
          .map((i) => `${i.title} × ${i.quantity} @ ${formatMoney(i.price)}`)
          .join(" | "),
      }))
    );
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Orders");
    XLSX.writeFile(book, "grocery-orders.xlsx");
  };

  const columns = [
    {
      key: "id",
      label: "Order",
      render: (o) => (
        <button
          onClick={() => setExpanded(expanded === o.id ? null : o.id)}
          className="flex items-center gap-2 text-left"
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-300 transition ${
              expanded === o.id ? "rotate-180 text-[#4267B2]" : ""
            }`}
          />
          <span>
            <span className="block font-mono text-xs font-semibold text-slate-700">
              #{String(o.id).slice(0, 6).toUpperCase()}
            </span>
            <span className="block text-xs text-slate-400">{timeAgo(o.createdAt)}</span>
          </span>
        </button>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      sortable: true,
      sortValue: (o) => o.user?.name || "",
      render: (o) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-800">{o.user?.name || "Guest"}</p>
          <p className="truncate text-xs text-slate-400">{o.user?.email || "—"}</p>
        </div>
      ),
    },
    {
      key: "city",
      label: "Deliver to",
      render: (o) => <span className="text-slate-500">{o.user?.city || "—"}</span>,
    },
    {
      key: "items",
      label: "Items",
      align: "center",
      sortable: true,
      sortValue: orderUnits,
      render: (o) => <span className="text-slate-500">{orderUnits(o)}</span>,
    },
    {
      key: "total",
      label: "Total",
      align: "right",
      sortable: true,
      sortValue: orderTotal,
      render: (o) => <span className="font-semibold text-slate-800">{formatMoney(orderTotal(o))}</span>,
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      sortable: true,
      sortValue: (o) => o.status || "pending",
      render: (o) => (
        <Badge tone={isCompleted(o) ? "success" : "warning"} icon={isCompleted(o) ? CheckCircle2 : Clock}>
          {isCompleted(o) ? "Completed" : "Pending"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (o) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="success"
            size="icon"
            title="Mark completed and deduct stock"
            aria-label="Complete order"
            disabled={isCompleted(o)}
            loading={processingId === o.id}
            onClick={() => complete(o)}
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
          <Button
            variant="softDanger"
            size="icon"
            aria-label="Delete order"
            onClick={() => setDeleteTarget(o)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const renderExpanded = (o) => (
    <div className="grid grid-cols-1 gap-5 rounded-2xl bg-white p-5 lg:grid-cols-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Delivery</p>
        <p className="mt-2 font-semibold text-slate-800">{o.user?.name || "Guest"}</p>
        <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
          <Phone className="h-3.5 w-3.5" /> {o.user?.phone || "—"}
        </p>
        <p className="mt-1 flex items-start gap-2 text-sm text-slate-500">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {o.user?.address || "—"}
            {o.user?.city ? `, ${o.user.city}` : ""}
          </span>
        </p>
        <p className="mt-3 text-xs text-slate-400">Placed {formatDateTime(o.createdAt)}</p>
      </div>

      <div className="lg:col-span-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Basket</p>
        <div className="mt-2 flex flex-col gap-2">
          {(o.cartItems || []).map((item, i) => (
            <div key={`${item.productId || item.title}-${i}`} className="flex items-center gap-3 rounded-xl bg-[#F6F8FC] p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.images?.[0] || "/placeholder.png"}
                alt=""
                className="h-10 w-10 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-700">{item.title}</p>
                <p className="text-xs text-slate-400">
                  {item.quantity} × {formatMoney(item.price)}
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-800">
                {formatMoney((Number(item.quantity) || 0) * (Number(item.price) || 0))}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-sm font-semibold text-slate-500">Order total</span>
          <span className="text-lg font-bold text-slate-800">{formatMoney(orderTotal(o))}</span>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout
      title="Orders"
      eyebrow="Store"
      actions={
        <Button variant="outline" size="sm" icon={Download} onClick={exportExcel}>
          Export
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatTile icon={ShoppingBasket} label="Total orders" value={orders.length} accent={BRAND} />
        <StatTile icon={Clock} label="Awaiting fulfilment" value={pending.length} accent="#F59E0B" />
        <StatTile icon={CheckCircle2} label="Revenue booked" value={formatMoney(revenue)} accent={FRESH} />
      </div>

      <Card>
        <Toolbar>
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: orders.length },
              { value: "pending", label: "Pending", count: pending.length },
              { value: "completed", label: "Completed", count: orders.length - pending.length },
            ]}
          />
          <SearchInput value={query} onChange={setQuery} placeholder="Search name, email, city…"
            className="sm:max-w-xs"
          />
        </Toolbar>

        <div className="mt-5">
          <DataTable
            columns={columns}
            rows={rows}
            minWidth={940}
            loading={status === "loading" && !orders.length}
            expandedKey={expanded}
            renderExpanded={renderExpanded}
            empty={
              <EmptyState
                icon={ShoppingBasket}
                title={orders.length ? "No orders match" : "No orders yet"}
                body={
                  orders.length
                    ? "Try another status or search term."
                    : "Orders placed on the storefront appear here instantly."
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
        loading={processingId === deleteTarget?.id}
        icon={Trash2}
        title="Delete this order?"
        description="The order record is removed from the store for good."
        confirmLabel="Delete order"
        preview={
          deleteTarget && {
            title: deleteTarget.user?.name || "Guest",
            meta: `#${String(deleteTarget.id).slice(0, 6).toUpperCase()} · ${orderUnits(
              deleteTarget
            )} item${orderUnits(deleteTarget) === 1 ? "" : "s"} · ${formatMoney(
              orderTotal(deleteTarget)
            )}`,
          }
        }
        consequences={
          deleteTarget
            ? isCompleted(deleteTarget)
              ? [
                  "This order was completed, so the stock it consumed is returned to the shelf.",
                  "Its revenue disappears from reports and the customer's history.",
                ]
              : [
                  "The order is still pending, so no stock changes hands.",
                  "The customer is not notified — contact them if they are expecting it.",
                ]
            : []
        }
      />
    </DashboardLayout>
  );
}

OrdersPage.getLayout = dashboardGetLayout;
