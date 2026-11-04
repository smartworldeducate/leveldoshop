import { useState } from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { ArrowLeft, MapPin, Phone, Undo2 } from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import Card, { CardHeader } from "@/components/dashboard/ui/Card";
import Button from "@/components/dashboard/ui/Button";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import ProductThumb from "@/components/dashboard/ui/ProductThumb";
import QtyStepper from "@/components/dashboard/ui/QtyStepper";
import { Textarea } from "@/components/dashboard/ui/Field";
import { createReturn } from "@/redux/admin/ordersSlice";
import { formatDateTime, orderTotal } from "@/lib/analytics";
import { formatMoney } from "@/data/grocery";
import { RETURN_REASONS, canStartReturn, returnableQty, shortOrderId } from "@/data/returns";
import { unitPaid } from "@/data/fulfilment";

/** Records a return against a completed order: /dashboard/returns/new?order=<id>. */
export default function NewReturnPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { items: orders, status, processingId } = useSelector((s) => s.adminOrders);
  const order = orders.find((o) => o.id === router.query.order);

  const [selection, setSelection] = useState({});
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const back = (
    <Button variant="outline" size="sm" icon={ArrowLeft} href="/dashboard/orders">
      Back to orders
    </Button>
  );

  if (!order || !canStartReturn(order)) {
    return (
      <DashboardLayout title="Start a return" eyebrow="Returns" actions={back}>
        <Card>
          {status === "loading" || status === "idle" ? (
            <p className="py-16 text-center text-sm text-slate-400">Loading the order…</p>
          ) : (
            <EmptyState
              icon={Undo2}
              title="This order can't be returned"
              body="Only completed orders with items left to return can start a return."
            />
          )}
        </Card>
      </DashboardLayout>
    );
  }

  const lines = (order.cartItems || [])
    .map((item, line) => ({ item, line, max: returnableQty(order, line) }))
    .filter((row) => row.max > 0);
  const chosen = lines.filter(({ line }) => selection[line] > 0);
  const units = chosen.reduce((sum, { line }) => sum + selection[line], 0);
  const value = chosen.reduce((sum, { item, line }) => sum + selection[line] * unitPaid(item), 0);

  const submit = async () => {
    try {
      const { returns } = await dispatch(createReturn({ orderId: order.id, selection, reason, note })).unwrap();
      toast.success("Return started");
      router.replace(`/dashboard/returns/${order.id}/${returns[returns.length - 1].id}`);
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Could not start the return");
    }
  };

  return (
    <DashboardLayout title={`Start a return · ${shortOrderId(order.id)}`} eyebrow="Returns" actions={back}>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="Which items are coming back?" subtitle="Choose how many units of each item." />
            <div className="mt-5 flex flex-col gap-3">
              {lines.map(({ item, line, max }) => (
                <div
                  key={line}
                  className={`flex flex-wrap items-center gap-4 rounded-2xl p-3 transition ${
                    selection[line] ? "bg-[#E4ECFA]/60 ring-1 ring-[#4267B2]/30" : "bg-[#F6F8FC]"
                  }`}
                >
                  <ProductThumb src={item.images?.[0]} className="h-14 w-14" />
                  <div className="min-w-[150px] flex-1">
                    <p className="truncate font-semibold text-slate-800">{item.title}</p>
                    <p className="text-sm text-slate-400">
                      {formatMoney(unitPaid(item))} each · {max} returnable
                    </p>
                  </div>
                  <QtyStepper
                    label={`Units of ${item.title} to return`}
                    value={selection[line] || 0}
                    max={max}
                    onChange={(n) => setSelection((s) => ({ ...s, [line]: n }))}
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Why are they coming back?" />
            <div className="mt-4 flex flex-wrap gap-2">
              {RETURN_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  aria-pressed={reason === r.value}
                  onClick={() => setReason(r.value)}
                  className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                    reason === r.value
                      ? "bg-[linear-gradient(150deg,#5B83D6,#4267B2)] text-white shadow-[0_8px_18px_-8px_rgba(66,103,178,0.9)]"
                      : "bg-[#F2F6FC] text-slate-500 hover:text-[#4267B2]"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <label className="mt-5 block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">Note (optional)</span>
              <Textarea
                rows={3}
                value={note}
                placeholder="What the customer said, photos received, etc."
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </Card>
        </div>

        <div className="flex flex-col gap-6 xl:sticky xl:top-0">
          <Card>
            <CardHeader title="Return summary" />
            <div className="mt-4 rounded-2xl bg-[linear-gradient(150deg,#5B83D6,#35528F)] p-5 text-white">
              <p className="text-xs font-medium text-white/70">Value of returned items</p>
              <p className="mt-1 text-3xl font-bold">{formatMoney(value)}</p>
              <p className="mt-1 text-xs text-white/70">
                {units} unit{units === 1 ? "" : "s"} selected · order total {formatMoney(orderTotal(order))}
              </p>
            </div>
            <Button
              icon={Undo2}
              className="mt-4 w-full"
              loading={processingId === order.id}
              disabled={units <= 0 || !reason}
              onClick={submit}
            >
              Start return
            </Button>
            {(units <= 0 || !reason) && (
              <p className="mt-2 text-center text-xs text-slate-400">
                {units <= 0 ? "Choose at least one item" : "Choose a reason"} to continue
              </p>
            )}
          </Card>

          <Card>
            <CardHeader title={order.user?.name || "Guest"} subtitle={`Ordered ${formatDateTime(order.createdAt)}`} />
            <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500">
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0" /> {order.user?.phone || "—"}
              </p>
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {order.user?.address || "—"}
                  {order.user?.city ? `, ${order.user.city}` : ""}
                </span>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

NewReturnPage.getLayout = dashboardGetLayout;
