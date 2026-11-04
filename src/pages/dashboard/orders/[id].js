import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Ban,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  PackageMinus,
  Phone,
  RotateCcw,
  ShoppingBasket,
  Undo2,
  X,
} from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import OrderStepper from "@/components/dashboard/OrderProgress";
import Card, { CardHeader } from "@/components/dashboard/ui/Card";
import Badge from "@/components/dashboard/ui/Badge";
import Button from "@/components/dashboard/ui/Button";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import ProductThumb from "@/components/dashboard/ui/ProductThumb";
import QtyStepper from "@/components/dashboard/ui/QtyStepper";
import Field, { Textarea } from "@/components/dashboard/ui/Field";
import { FOCUS } from "@/components/dashboard/theme";

import {
  advanceOrderStage,
  notifyCustomer,
  recordWhatsappUpdate,
  reportOrderIssue,
  resolveOrderIssue,
} from "@/redux/admin/ordersSlice";
import { fetchProducts } from "@/redux/products/productsSlice";
import { formatDateTime, orderNet, orderTotal } from "@/lib/analytics";
import { formatMoney } from "@/data/grocery";
import { canStartReturn, orderRefunded, shortOrderId } from "@/data/returns";
import { eventMessage, eventsOf, latestEvent, whatsappLink } from "@/data/notifications";
import {
  ISSUE_TYPES,
  STEP_INFO,
  deliveredQty,
  isCancelled,
  issuesOf,
  openIssue,
  orderStatusView,
  shortByLine,
  shortValue,
  stageHistory,
  stageOf,
} from "@/data/fulfilment";

const EMAIL_FAILURES = {
  no_email: "No valid email on this order",
  not_staff: "Your account can't send email",
  not_signed_in: "Sign in again to send email",
};

const ordersUrl = () => (typeof window === "undefined" ? "/orders" : `${window.location.origin}/orders`);

/**
 * The prompt after each step. WhatsApp only lets a person press send, so this
 * keeps the newest update in front of staff until they have opened it.
 */
function WhatsappPrompt({ order, onWhatsapp }) {
  const event = latestEvent(order);
  if (!event || order.notifications?.[event.key]?.whatsapp) return null;

  const link = whatsappLink(order, event, ordersUrl());
  const name = order.user?.name?.trim() || "the customer";

  return (
    <Card className="flex flex-wrap items-center gap-4 ring-1 ring-emerald-200">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <MessageCircle className="h-6 w-6" />
      </span>
      <div className="min-w-[220px] flex-1">
        <p className="font-bold text-slate-800">Tell {name} about this update</p>
        <p className="mt-0.5 text-sm text-slate-500">“{eventMessage(order, event).body}”</p>
      </div>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          onClick={() => onWhatsapp(event.key)}
          className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 ${FOCUS}`}
        >
          <MessageCircle className="h-[18px] w-[18px]" />
          Send on WhatsApp
        </a>
      ) : (
        <p className="text-sm font-semibold text-rose-600">No valid phone number on this order</p>
      )}
    </Card>
  );
}

/** What the customer has been told at each step, and a way to tell them if not. */
function CustomerUpdates({ order, sending, onRetry, onWhatsapp }) {
  const events = [...eventsOf(order)].reverse();

  return (
    <Card>
      <CardHeader title="Customer updates" subtitle={order.user?.phone || "No phone on this order"} />
      {events.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">Updates start from the moment you confirm this order.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {events.map((event) => {
            const record = order.notifications?.[event.key];
            const email = record?.email;
            const emailOff = email?.reason === "not_configured";
            const busy = sending.includes(event.key);
            const whatsapp = whatsappLink(order, event, ordersUrl());
            return (
              <li key={event.key} className="rounded-2xl bg-[#F6F8FC] p-3">
                <p className="text-sm font-semibold text-slate-700">{eventMessage(order, event).label}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {record?.whatsapp ? (
                    <Badge tone="success" icon={MessageCircle}>WhatsApp opened</Badge>
                  ) : (
                    <Badge tone="warning" icon={MessageCircle}>Not sent yet</Badge>
                  )}
                  {email?.status === "sent" && <Badge tone="success" icon={Mail}>Emailed</Badge>}
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" aria-label="Sending email" />}
                  {!busy && email?.status === "failed" && !emailOff && (
                    <Badge tone="danger" icon={Mail}>{EMAIL_FAILURES[email.reason] || "Email not sent"}</Badge>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                  {whatsapp && (
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#4267B2] hover:underline"
                      onClick={() => onWhatsapp(event.key)}
                    >
                      {record?.whatsapp ? "Send again" : "Send on WhatsApp"}
                    </a>
                  )}
                  {!busy && email?.status === "failed" && !emailOff && (
                    <button type="button" className="text-[#4267B2] hover:underline" onClick={() => onRetry(event.key)}>
                      Retry email
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function ItemList({ items }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.line} className="flex items-center gap-3 rounded-2xl bg-rose-50/60 p-2.5">
          <ProductThumb src={item.image} className="h-10 w-10" />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{item.title}</p>
          <p className="text-sm font-semibold text-slate-500">× {item.quantity}</p>
        </div>
      ))}
    </div>
  );
}

function AdvancePanel({ order, busy, onAdvance, onReport }) {
  const info = STEP_INFO[stageOf(order)];
  return (
    <Card>
      <CardHeader title={`Next step: ${info.action}`} subtitle={info.hint} />
      <div className="mt-5 flex flex-wrap gap-3">
        <Button icon={ArrowRight} loading={busy} onClick={onAdvance}>
          {info.action}
        </Button>
        <Button variant="softDanger" icon={AlertTriangle} onClick={onReport}>
          Report a problem
        </Button>
      </div>
    </Card>
  );
}

function ReportPanel({ order, busy, onSubmit, onCancel }) {
  const [type, setType] = useState("");
  const [selection, setSelection] = useState({});
  const [note, setNote] = useState("");

  const needsItems = Boolean(ISSUE_TYPES[type]?.items);
  const units = Object.values(selection).reduce((sum, n) => sum + n, 0);
  const missing = !type || (needsItems && units <= 0) || (type === "other" && !note.trim());

  return (
    <Card>
      <CardHeader
        title="Report a problem"
        subtitle={`This is recorded against the ${STEP_INFO[stageOf(order)].label} step and holds the order there.`}
      />
      <p className="mt-5 text-xs font-semibold text-slate-500">
        What went wrong?<span className="ml-0.5 text-rose-500">*</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {Object.entries(ISSUE_TYPES).map(([key, info]) => (
          <button
            key={key}
            type="button"
            aria-pressed={type === key}
            onClick={() => setType(key)}
            className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${FOCUS} ${
              type === key
                ? "bg-rose-600 text-white shadow-[0_8px_18px_-8px_rgba(225,29,72,0.9)]"
                : "bg-[#F2F6FC] text-slate-500 hover:text-[#4267B2]"
            }`}
          >
            {info.label}
          </button>
        ))}
      </div>

      {needsItems && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold text-slate-500">
            Which items?<span className="ml-0.5 text-rose-500">*</span>
          </p>
          <div className="flex flex-col gap-2">
            {(order.cartItems || []).map((item, line) => {
              const max = deliveredQty(order, line);
              if (max <= 0) return null;
              return (
                <div key={line} className="flex flex-wrap items-center gap-4 rounded-2xl bg-[#F6F8FC] p-3">
                  <ProductThumb src={item.images?.[0]} className="h-11 w-11" />
                  <div className="min-w-[150px] flex-1">
                    <p className="truncate font-semibold text-slate-800">{item.title}</p>
                    <p className="text-sm text-slate-400">{max} on this order</p>
                  </div>
                  <QtyStepper
                    label={`Affected units of ${item.title}`}
                    value={selection[line] || 0}
                    max={max}
                    onChange={(n) => setSelection((s) => ({ ...s, [line]: n }))}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5">
        <Field label="Details" hint="For staff only. The customer sees a plain update, not this note." required={type === "other"}>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          variant="danger"
          icon={AlertTriangle}
          loading={busy}
          disabled={missing}
          onClick={() => onSubmit({ type, note, selection: needsItems ? selection : {} })}
        >
          Report problem
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Back
        </Button>
      </div>
    </Card>
  );
}

function ResolvePanel({ order, issue, busy, onSubmit }) {
  const [resolution, setResolution] = useState("");
  const [note, setNote] = useState("");

  const hasItems = issue.items?.length > 0;
  const value = (issue.items || []).reduce((sum, i) => sum + i.quantity * i.price, 0);
  const damagedUnits = issue.type === "damaged" ? issue.items.reduce((sum, i) => sum + i.quantity, 0) : 0;
  const affected = Object.fromEntries((issue.items || []).map((i) => [i.line, i.quantity]));
  const unitsLeft = (order.cartItems || []).reduce(
    (sum, _, line) => sum + deliveredQty(order, line) - (affected[line] || 0),
    0
  );

  const options = [
    {
      key: "retry",
      icon: RotateCcw,
      title: "Fixed, carry on",
      body: hasItems
        ? `Replacements are ready. The order continues from ${STEP_INFO[issue.step].label} in full.`
        : `The problem is sorted. The order continues from ${STEP_INFO[issue.step].label}.`,
    },
    ...(hasItems
      ? [
          {
            key: "short",
            icon: PackageMinus,
            title: "Deliver without these items",
            body: `The customer pays ${formatMoney(value)} less and is told what's missing.`,
            disabled: unitsLeft <= 0,
            disabledNote: "Nothing would be left to deliver, so cancel instead.",
          },
        ]
      : []),
    {
      key: "cancel",
      icon: Ban,
      title: "Cancel the order",
      body: "The order stops here and no revenue is counted. Tell the customer.",
      danger: true,
    },
  ];

  return (
    <Card className="ring-1 ring-rose-200">
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-800">
            {ISSUE_TYPES[issue.type]?.label} at the {STEP_INFO[issue.step]?.label} step
          </h2>
          <p className="text-sm text-slate-400">
            Reported {formatDateTime(issue.reportedAt)}
            {issue.reportedBy ? ` by ${issue.reportedBy}` : ""}
          </p>
          {issue.note && <p className="mt-2 text-sm text-slate-600">“{issue.note}”</p>}
        </div>
      </div>

      {hasItems && (
        <div className="mt-4">
          <ItemList items={issue.items} />
        </div>
      )}

      <p className="mt-5 text-xs font-semibold text-slate-500">How do you want to resolve it?</p>
      <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {options.map(({ key, icon: Icon, title, body, danger, disabled, disabledNote }) => {
          const selected = resolution === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => setResolution(key)}
              className={`rounded-2xl p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS} ${
                selected
                  ? danger
                    ? "bg-rose-50 ring-2 ring-rose-500"
                    : "bg-[#E4ECFA] ring-2 ring-[#4267B2]"
                  : "bg-[#F6F8FC] hover:bg-[#EEF2FA]"
              }`}
            >
              <Icon className={`h-5 w-5 ${danger ? "text-rose-600" : "text-[#4267B2]"}`} />
              <span className="mt-2 block text-sm font-bold text-slate-800">{title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                {disabled ? disabledNote : body}
              </span>
            </button>
          );
        })}
      </div>

      {damagedUnits > 0 && (
        <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
          However you resolve this, {damagedUnits} damaged unit{damagedUnits === 1 ? "" : "s"} will be taken out of stock.
        </p>
      )}

      <div className="mt-4">
        <Field label="Note" hint="Optional, for staff only.">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>

      <Button
        className="mt-5"
        variant={resolution === "cancel" ? "danger" : "primary"}
        icon={CheckCircle2}
        loading={busy}
        disabled={!resolution}
        onClick={() => onSubmit({ resolution, note })}
      >
        {resolution === "cancel" ? "Cancel order" : "Resolve problem"}
      </Button>
    </Card>
  );
}

function OutcomePanel({ order }) {
  const cancelled = isCancelled(order);
  const Icon = cancelled ? Ban : CheckCircle2;
  return (
    <Card className="flex flex-wrap items-center gap-4">
      <span
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
          cancelled ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-600"
        }`}
      >
        <Icon className="h-7 w-7" />
      </span>
      <div className="min-w-[200px] flex-1">
        <p className="text-lg font-bold text-slate-800">{cancelled ? "Order cancelled" : "Order delivered"}</p>
        <p className="text-sm text-slate-500">
          {cancelled
            ? `Stopped at ${formatDateTime(order.cancelledAt)}. No stock was taken for delivery.`
            : "Anything wrong with it now is handled as a return."}
        </p>
      </div>
      {canStartReturn(order) && (
        <Button variant="outline" icon={Undo2} href={`/dashboard/returns/new?order=${order.id}`}>
          Start a return
        </Button>
      )}
    </Card>
  );
}

/** Everything that happened to the order, newest first. */
function activityOf(order) {
  const rows = [{ key: "placed", at: order.createdAt, title: "Order placed", tone: "brand" }];
  stageHistory(order).forEach((h) =>
    rows.push({ key: `stage-${h.stage}`, at: h.at, by: h.by, title: STEP_INFO[h.stage]?.label, tone: "brand" })
  );
  issuesOf(order).forEach((i) => {
    rows.push({
      key: `issue-${i.id}`,
      at: i.reportedAt,
      by: i.reportedBy,
      title: `${ISSUE_TYPES[i.type]?.label} at ${STEP_INFO[i.step]?.label}`,
      note: i.note,
      tone: "danger",
    });
    if (i.status === "resolved") {
      const titles = { retry: "Problem fixed, carried on", short: "Delivering without the items", cancel: "Order cancelled" };
      rows.push({
        key: `resolved-${i.id}`,
        at: i.resolvedAt,
        by: i.resolvedBy,
        title: titles[i.resolution],
        note: i.resolutionNote,
        tone: i.resolution === "cancel" ? "danger" : "success",
      });
    }
  });
  const millis = (v) => (v?.toDate ? v.toDate().getTime() : v?.seconds ? v.seconds * 1000 : new Date(v).getTime()) || 0;
  return rows.sort((a, b) => millis(b.at) - millis(a.at));
}

export default function OrderWorkspacePage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { items: orders, status, processingId } = useSelector((s) => s.adminOrders);
  const order = orders.find((o) => o.id === router.query.id);
  const [reporting, setReporting] = useState(false);
  const [sending, setSending] = useState([]);

  const back = (
    <Button variant="outline" size="sm" icon={ArrowLeft} href="/dashboard/orders">
      All orders
    </Button>
  );

  if (!order) {
    return (
      <DashboardLayout title="Order" eyebrow="Orders" actions={back}>
        <Card>
          {status === "loading" || status === "idle" ? (
            <p className="py-16 text-center text-sm text-slate-400">Loading the order…</p>
          ) : (
            <EmptyState icon={ShoppingBasket} title="Order not found" body="It may have been deleted." />
          )}
        </Card>
      </DashboardLayout>
    );
  }

  const busy = processingId === order.id;
  const issue = openIssue(order);
  const stage = stageOf(order);
  const view = orderStatusView(order);
  const short = shortByLine(order);

  // Email in the background, if the store has set it up. The step has already
  // happened, whatever this does.
  const sendUpdate = async (eventKey) => {
    setSending((keys) => [...keys, eventKey]);
    await dispatch(notifyCustomer({ orderId: order.id, eventKey }));
    setSending((keys) => keys.filter((k) => k !== eventKey));
  };

  const sendWhatsapp = (eventKey) => dispatch(recordWhatsappUpdate({ orderId: order.id, eventKey }));

  const tellCustomer = ({ patch }) => {
    const event = latestEvent({ ...order, ...patch });
    if (event) sendUpdate(event.key);
  };

  const advance = async () => {
    try {
      tellCustomer(await dispatch(advanceOrderStage({ orderId: order.id })).unwrap());
      toast.success(stage === "on_the_way" ? "Delivered, stock updated" : "Order updated");
      if (stage === "on_the_way") dispatch(fetchProducts());
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Could not update the order");
    }
  };

  const report = async (payload) => {
    try {
      tellCustomer(await dispatch(reportOrderIssue({ orderId: order.id, ...payload })).unwrap());
      toast.success("Problem recorded");
      setReporting(false);
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Could not record the problem");
    }
  };

  const resolve = async (payload) => {
    try {
      tellCustomer(await dispatch(resolveOrderIssue({ orderId: order.id, issueId: issue.id, ...payload })).unwrap());
      toast.success(payload.resolution === "cancel" ? "Order cancelled" : "Problem resolved");
      if (issue.type === "damaged") dispatch(fetchProducts());
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Could not resolve the problem");
    }
  };

  const panel = (() => {
    if (issue) return <ResolvePanel order={order} issue={issue} busy={busy} onSubmit={resolve} />;
    if (isCancelled(order) || stage === "delivered") return <OutcomePanel order={order} />;
    if (reporting) return <ReportPanel order={order} busy={busy} onSubmit={report} onCancel={() => setReporting(false)} />;
    return <AdvancePanel order={order} busy={busy} onAdvance={advance} onReport={() => setReporting(true)} />;
  })();

  return (
    <DashboardLayout title={`Order ${shortOrderId(order.id)}`} eyebrow="Orders" actions={back}>
      <Card>
        <OrderStepper order={order} />
      </Card>

      <WhatsappPrompt order={order} onWhatsapp={sendWhatsapp} />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          {panel}

          <Card>
            <CardHeader title="Basket" action={<Badge tone={view.tone}>{view.label}</Badge>} />
            <div className="mt-5 flex flex-col gap-3">
              {(order.cartItems || []).map((item, line) => (
                <div
                  key={`${item.productId || item.title}-${line}`}
                  className="flex flex-wrap items-center gap-4 rounded-2xl bg-[#F6F8FC] p-3"
                >
                  <ProductThumb src={item.images?.[0]} className="h-12 w-12" />
                  <div className="min-w-[150px] flex-1">
                    <p className="truncate font-semibold text-slate-800">{item.title}</p>
                    <p className="text-sm text-slate-400">
                      {item.quantity} × {formatMoney(item.price)}
                    </p>
                  </div>
                  {short[line] > 0 && (
                    <Badge tone="danger" icon={X}>
                      {short[line]} not delivered
                    </Badge>
                  )}
                  <p className="font-semibold text-slate-800">
                    {formatMoney((Number(item.quantity) || 0) * (Number(item.price) || 0))}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-1 border-t border-slate-100 pt-4 text-sm">
              {order.discount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Items</span>
                  <span className="font-semibold text-slate-800">{formatMoney(order.subtotal)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Coupon {order.coupon.code}</span>
                  <span className="font-semibold text-emerald-600">−{formatMoney(order.discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Order total</span>
                <span className="font-semibold text-slate-800">{formatMoney(orderTotal(order))}</span>
              </div>
              {shortValue(order) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Not delivered</span>
                  <span className="font-semibold text-rose-600">−{formatMoney(shortValue(order))}</span>
                </div>
              )}
              {orderRefunded(order) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Refunded</span>
                  <span className="font-semibold text-rose-600">−{formatMoney(orderRefunded(order))}</span>
                </div>
              )}
              <div className="mt-1 flex items-center justify-between">
                <span className="font-semibold text-slate-600">Store keeps</span>
                <span className="text-lg font-bold text-slate-800">{formatMoney(orderNet(order))}</span>
              </div>
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
          </Card>

          <CustomerUpdates
            order={order}
            sending={sending}
            onRetry={sendUpdate}
            onWhatsapp={sendWhatsapp}
          />

          <Card>
            <CardHeader title="Activity" />
            <ol className="mt-4 flex flex-col">
              {activityOf(order).map((row, i, rows) => (
                <li key={row.key} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < rows.length - 1 && (
                    <span className="absolute bottom-0 left-[6px] top-4 w-0.5 bg-[#E4ECFA]" aria-hidden="true" />
                  )}
                  <span
                    className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full ${
                      row.tone === "danger" ? "bg-rose-500" : row.tone === "success" ? "bg-emerald-500" : "bg-[#4267B2]"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700">{row.title}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(row.at)}</p>
                    {row.by && <p className="truncate text-xs text-slate-400">by {row.by}</p>}
                    {row.note && <p className="mt-1 text-xs italic text-slate-500">“{row.note}”</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

OrderWorkspacePage.getLayout = dashboardGetLayout;
