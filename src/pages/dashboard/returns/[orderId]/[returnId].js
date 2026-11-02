import { useState } from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Ban,
  Banknote,
  CheckCircle2,
  Landmark,
  Mail,
  MapPin,
  MoreHorizontal,
  PackageCheck,
  PackageX,
  Phone,
  RotateCcw,
  ThumbsUp,
  Undo2,
  X,
} from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import { ReturnStepper, ReturnTimeline } from "@/components/dashboard/ReturnProgress";
import Card, { CardHeader } from "@/components/dashboard/ui/Card";
import Badge from "@/components/dashboard/ui/Badge";
import Button from "@/components/dashboard/ui/Button";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import ProductThumb from "@/components/dashboard/ui/ProductThumb";
import QtyStepper from "@/components/dashboard/ui/QtyStepper";
import Field, { Input, Textarea } from "@/components/dashboard/ui/Field";
import { FOCUS } from "@/components/dashboard/theme";

import { updateReturn } from "@/redux/admin/ordersSlice";
import { fetchProducts } from "@/redux/products/productsSlice";
import { formatDateTime, orderTotal } from "@/lib/analytics";
import { formatMoney } from "@/data/grocery";
import {
  REFUND_METHODS,
  RETURN_STATUS,
  methodLabel,
  orderRefunded,
  reasonLabel,
  refundableLeft,
  returnValue,
  returnsOf,
  shortOrderId,
} from "@/data/returns";

const METHOD_ICONS = { cash: Banknote, bank: Landmark, other: MoreHorizontal };
const REJECT_REASONS = ["Past the return window", "Item was used or opened", "No proof of a problem"];

/** The one thing to do at this stage; each panel moves the return on a step. */
function ReviewPanel({ busy, onAction, onReject }) {
  return (
    <Card>
      <CardHeader title="Review this request" subtitle="Approve it to go ahead, or reject it and say why." />
      <div className="mt-5 flex flex-wrap gap-3">
        <Button icon={ThumbsUp} loading={busy} onClick={() => onAction("approve", {}, "Return approved")}>
          Approve return
        </Button>
        <Button variant="softDanger" icon={X} onClick={onReject}>
          Reject
        </Button>
      </div>
    </Card>
  );
}

/**
 * Inspection. Restock starts at 0 for every line: returned food only goes back
 * on sale when someone has looked at it and said so.
 */
function ReceivePanel({ ret, busy, onAction, onReject }) {
  const [restock, setRestock] = useState({});
  const total = ret.items.reduce((sum, i) => sum + i.quantity, 0);
  const back = ret.items.reduce((sum, i) => sum + (restock[i.line] || 0), 0);

  return (
    <Card>
      <CardHeader
        title="Inspect the returned items"
        subtitle="How many units of each item can be sold again? The rest are written off."
      />
      <div className="mt-5 flex flex-col gap-3">
        {ret.items.map((item) => (
          <div key={item.line} className="flex flex-wrap items-center gap-4 rounded-2xl bg-[#F6F8FC] p-3">
            <ProductThumb src={item.image} className="h-12 w-12" />
            <div className="min-w-[150px] flex-1">
              <p className="truncate font-semibold text-slate-800">{item.title}</p>
              <p className="text-sm text-slate-400">{item.quantity} coming back</p>
            </div>
            <QtyStepper
              label={`Units of ${item.title} to restock`}
              value={restock[item.line] || 0}
              max={item.quantity}
              onChange={(n) => setRestock((s) => ({ ...s, [item.line]: n }))}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-emerald-50 p-4 text-center">
          <p className="text-3xl font-bold tabular-nums text-emerald-600">{back}</p>
          <p className="text-xs font-medium text-emerald-700">Back to stock</p>
        </div>
        <div className="rounded-2xl bg-rose-50 p-4 text-center">
          <p className="text-3xl font-bold tabular-nums text-rose-600">{total - back}</p>
          <p className="text-xs font-medium text-rose-700">Written off</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          icon={PackageCheck}
          loading={busy}
          onClick={() => onAction("receive", { restock }, "Goods received — stock updated")}
        >
          Confirm receipt
        </Button>
        <Button variant="softDanger" icon={X} onClick={onReject}>
          Reject
        </Button>
      </div>
    </Card>
  );
}

function RefundPanel({ ret, order, busy, onAction }) {
  const cap = refundableLeft(order);
  const [amount, setAmount] = useState(Math.min(returnValue(ret), cap).toFixed(2));
  const [method, setMethod] = useState(REFUND_METHODS[0].value);
  const [reference, setReference] = useState("");

  return (
    <Card>
      <CardHeader
        title="Record the refund"
        subtitle="Pay the customer first. This records the refund; it doesn't send money."
      />
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="flex flex-col justify-center rounded-2xl bg-[linear-gradient(150deg,#5B83D6,#35528F)] p-5 text-white">
          <label className="text-xs font-medium text-white/70" htmlFor="refund-amount">
            Refund amount
          </label>
          <div className="mt-1 flex items-center gap-1 text-4xl font-bold">
            <span>$</span>
            <input
              id="refund-amount"
              type="number"
              min={0}
              max={cap}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent text-4xl font-bold text-white focus:outline-none"
            />
          </div>
          <p className="mt-3 text-xs text-white/70">
            Items returned: {formatMoney(returnValue(ret))} · up to {formatMoney(cap)} left on this order
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">Paid by</p>
            <div className="grid grid-cols-3 gap-2">
              {REFUND_METHODS.map((m) => {
                const Icon = METHOD_ICONS[m.value];
                const selected = method === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setMethod(m.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 text-xs font-semibold transition ${FOCUS} ${
                      selected ? "bg-[#E4ECFA] text-[#4267B2] ring-1 ring-[#4267B2]/40" : "bg-[#F6F8FC] text-slate-500 hover:text-[#4267B2]"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Field label="Reference" hint="Optional — transfer ID or receipt number">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
        </div>
      </div>

      <Button
        icon={Banknote}
        className="mt-5"
        loading={busy}
        onClick={() => onAction("refund", { amount, method, reference }, "Refund recorded")}
      >
        Record refund
      </Button>
    </Card>
  );
}

function RejectPanel({ busy, onAction, onCancel }) {
  const [note, setNote] = useState("");
  return (
    <Card>
      <CardHeader title="Reject this return" subtitle="The customer sees your reason on their My orders page." />
      <div className="mt-4 flex flex-wrap gap-2">
        {REJECT_REASONS.map((reason) => (
          <button
            key={reason}
            type="button"
            onClick={() => setNote(reason)}
            className="rounded-full bg-[#F2F6FC] px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:text-[#4267B2]"
          >
            {reason}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <Field label="Why?" required>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          variant="danger"
          icon={X}
          loading={busy}
          disabled={!note.trim()}
          onClick={() => onAction("reject", { note }, "Return rejected")}
        >
          Reject return
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Keep it open
        </Button>
      </div>
    </Card>
  );
}

function OutcomePanel({ ret }) {
  const rejected = ret.status === "rejected";
  const rejection = [...(ret.history || [])].reverse().find((h) => h.status === "rejected");
  const Icon = rejected ? Ban : CheckCircle2;
  return (
    <Card className="flex items-center gap-4">
      <span
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
          rejected ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-600"
        }`}
      >
        <Icon className="h-7 w-7" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold text-slate-800">{rejected ? "Return rejected" : "Return complete"}</p>
        <p className="text-sm text-slate-500">
          {rejected
            ? `Reason: ${rejection?.note || "—"}`
            : `Refunded by ${methodLabel(ret.refund?.method).toLowerCase()}${
                ret.refund?.reference ? ` · ref ${ret.refund.reference}` : ""
              }`}
        </p>
      </div>
      {!rejected && <p className="text-2xl font-bold text-emerald-600">{formatMoney(ret.refund?.amount)}</p>}
    </Card>
  );
}

export default function ReturnWorkspacePage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { items: orders, status, processingId } = useSelector((s) => s.adminOrders);
  const { orderId, returnId } = router.query;

  const order = orders.find((o) => o.id === orderId);
  const ret = returnsOf(order).find((r) => r.id === returnId);
  const [rejecting, setRejecting] = useState(false);

  const back = (
    <Button variant="outline" size="sm" icon={ArrowLeft} href="/dashboard/returns">
      All returns
    </Button>
  );

  if (!ret) {
    return (
      <DashboardLayout title="Return" eyebrow="Returns" actions={back}>
        <Card>
          {status === "loading" || status === "idle" ? (
            <p className="py-16 text-center text-sm text-slate-400">Loading the return…</p>
          ) : (
            <EmptyState icon={Undo2} title="Return not found" body="It may have been deleted with its order." />
          )}
        </Card>
      </DashboardLayout>
    );
  }

  const busy = processingId === order.id;
  const inspected = ["received", "refunded"].includes(ret.status);

  const act = async (action, payload, message) => {
    try {
      await dispatch(updateReturn({ orderId: order.id, returnId: ret.id, action, payload })).unwrap();
      toast.success(message);
      setRejecting(false);
      // Receiving wrote new stock levels; refresh the catalogue so they show.
      if (action === "receive") dispatch(fetchProducts());
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Could not update the return");
    }
  };

  const panel = (() => {
    if (rejecting) return <RejectPanel busy={busy} onAction={act} onCancel={() => setRejecting(false)} />;
    if (ret.status === "requested") return <ReviewPanel busy={busy} onAction={act} onReject={() => setRejecting(true)} />;
    if (ret.status === "approved") return <ReceivePanel ret={ret} busy={busy} onAction={act} onReject={() => setRejecting(true)} />;
    if (ret.status === "received") return <RefundPanel ret={ret} order={order} busy={busy} onAction={act} />;
    return <OutcomePanel ret={ret} />;
  })();

  return (
    <DashboardLayout title={`Return for order ${shortOrderId(order.id)}`} eyebrow="Returns" actions={back}>
      {ret.status !== "rejected" && (
        <Card>
          <ReturnStepper ret={ret} />
        </Card>
      )}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          {panel}

          <Card>
            <CardHeader
              title="Items in this return"
              subtitle={`${reasonLabel(ret.reason)} · ${
                ret.source === "customer" ? "requested by the customer" : "started by staff"
              }`}
              action={<Badge tone={RETURN_STATUS[ret.status]?.tone}>{RETURN_STATUS[ret.status]?.label}</Badge>}
            />
            <div className="mt-5 flex flex-col gap-3">
              {ret.items.map((item) => (
                <div key={item.line} className="flex flex-wrap items-center gap-4 rounded-2xl bg-[#F6F8FC] p-3">
                  <ProductThumb src={item.image} className="h-12 w-12" />
                  <div className="min-w-[150px] flex-1">
                    <p className="truncate font-semibold text-slate-800">{item.title}</p>
                    <p className="text-sm text-slate-400">
                      {item.quantity} × {formatMoney(item.price)}
                    </p>
                  </div>
                  {inspected && item.restocked > 0 && (
                    <Badge tone="success" icon={RotateCcw}>{item.restocked} restocked</Badge>
                  )}
                  {inspected && item.quantity - item.restocked > 0 && (
                    <Badge tone="danger" icon={PackageX}>{item.quantity - item.restocked} written off</Badge>
                  )}
                  <p className="font-semibold text-slate-800">{formatMoney(item.quantity * item.price)}</p>
                </div>
              ))}
            </div>
            {ret.note && (
              <p className="mt-4 rounded-2xl bg-[#FFF8E7] p-4 text-sm text-slate-600">
                <span className="font-semibold">Note: </span>
                {ret.note}
              </p>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-sm font-semibold text-slate-500">Value of this return</span>
              <span className="text-lg font-bold text-slate-800">{formatMoney(returnValue(ret))}</span>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title={order.user?.name || "Guest"} subtitle={`Ordered ${formatDateTime(order.createdAt)}`} />
            <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500">
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0" /> {order.user?.phone || "—"}
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{order.user?.email || "—"}</span>
              </p>
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {order.user?.address || "—"}
                  {order.user?.city ? `, ${order.user.city}` : ""}
                </span>
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
              <span className="text-slate-500">Order total</span>
              <span className="font-bold text-slate-800">{formatMoney(orderTotal(order))}</span>
            </div>
            {orderRefunded(order) > 0 && (
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-slate-500">Refunded so far</span>
                <span className="font-semibold text-rose-600">−{formatMoney(orderRefunded(order))}</span>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="History" />
            <div className="mt-4">
              <ReturnTimeline history={ret.history} />
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

ReturnWorkspacePage.getLayout = dashboardGetLayout;
