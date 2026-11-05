import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { AlertTriangle, CheckCircle2, Clock, Copy, CopyPlus, CreditCard, Download, ExternalLink, Eye, FileCheck2, Gift, MessageCircle, Pencil, Plus, ShoppingBag, Trash2, Wallet } from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import Card, { CardHeader } from "@/components/dashboard/ui/Card";
import Badge from "@/components/dashboard/ui/Badge";
import Button from "@/components/dashboard/ui/Button";
import ConfirmDialog from "@/components/dashboard/ui/ConfirmDialog";
import DataTable from "@/components/dashboard/ui/DataTable";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import SegmentedControl from "@/components/dashboard/ui/SegmentedControl";
import StatTile from "@/components/dashboard/ui/StatTile";
import Toolbar, { SearchInput } from "@/components/dashboard/ui/Toolbar";
import Switch from "@/components/dashboard/ui/Switch";
import PaymentMethods from "@/components/dashboard/PaymentMethods";
import { BRAND, FRESH } from "@/components/dashboard/theme";

import {
  deleteOffer,
  markRewardGiven,
  saveOffer,
  fetchOffers,
  fetchPurchases,
  markCodeSent,
} from "@/redux/couponSales/couponSalesSlice";
import { timeAgo } from "@/lib/analytics";
import { formatMoney } from "@/data/grocery";
import { describeDiscount, discountStub } from "@/data/coupons";
import { whatsappNumber } from "@/data/notifications";
import {
  PURCHASE_STATUS,
  codeToSend,
  dayCountdown,
  duplicateReferences,
  couponShopIsOpen,
  longestWaiting,
  offerTotals,
  purchasesCsv,
  rewardOverdue,
  waitingTooLong,
  formatRewardDay,
  methodLacksAccount,
  offerLeft,
  offerStatus,
  paymentMethods,
  purchaseMatches,
  purchaseMessage,
  rewardDays,
  rewardList,
  rewardListCsv,
  rewardMessage,
} from "@/data/couponSales";

const LISTS = {
  pending: (p) => p.status === "pending",
  tosend: codeToSend,
  confirmed: (p) => p.status === "confirmed",
  rejected: (p) => p.status === "rejected",
  revoked: (p) => p.status === "revoked",
  all: () => true,
};

function downloadCsv(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function Purchases({ filter, onFilter }) {
  const dispatch = useDispatch();
  const { purchases, purchasesLoaded } = useSelector((s) => s.couponSales);
  const [query, setQuery] = useState("");

  const duplicates = useMemo(() => duplicateReferences(purchases), [purchases]);
  const count = (list) => purchases.filter(LISTS[list]).length;
  const rows = purchases.filter((p) => LISTS[filter](p) && purchaseMatches(p, query));
  // The people who've waited longest get checked first.
  if (filter === "pending") rows.sort(longestWaiting);

  const sent = (p) => {
    if (!p.codeSentAt) dispatch(markCodeSent(p.id));
  };

  const whatsappFor = (p) => {
    const number = whatsappNumber(p.buyer?.phone);
    if (!number || !p.couponCode) return null;
    const url = typeof window === "undefined" ? "/coupons/mine" : `${window.location.origin}/coupons/mine`;
    return `https://wa.me/${number}?text=${encodeURIComponent(purchaseMessage(p, url))}`;
  };

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`${code} copied`);
    } catch {
      toast.error("Could not copy");
    }
  };

  const columns = [
    {
      key: "buyer",
      label: "Customer",
      render: (p) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-800">{p.buyer?.name || "Customer"}</p>
          <p className="truncate text-xs text-slate-400">{p.buyer?.phone}</p>
          <p className="truncate text-xs text-slate-400">{p.buyer?.email}</p>
        </div>
      ),
    },
    {
      key: "offer",
      label: "Coupon",
      render: (p) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-700">{p.offerTitle}</p>
          <p className={`text-xs ${waitingTooLong(p) ? "font-semibold text-rose-600" : "text-slate-400"}`}>
            {waitingTooLong(p) && <AlertTriangle className="mr-1 inline h-3 w-3" />}
            {timeAgo(p.createdAt)}
          </p>
        </div>
      ),
    },
    {
      key: "price",
      label: "Amount",
      render: (p) => <span className="font-semibold text-slate-800">{formatMoney(p.price)}</span>,
    },
    {
      key: "receipt",
      label: "Receipt",
      render: (p) =>
        p.paypalOrderId ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <CreditCard className="h-4 w-4 text-[#4267B2]" /> Paid by PayPal
          </span>
        ) : p.hasReceipt || p.screenshot ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <FileCheck2 className="h-4 w-4 text-emerald-600" /> Attached
          </span>
        ) : (
          <span className="text-xs text-slate-400">None</span>
        ),
    },
    {
      key: "reference",
      label: "Payment",
      render: (p) => (
        <div>
          {p.token && <p className="font-mono text-xs font-semibold text-slate-700">{p.token}</p>}
          {p.paymentMethod && <p className="text-xs text-slate-500">{p.paymentMethod}</p>}
          {p.reference && <p className="font-mono text-xs text-slate-400">{p.reference}</p>}
          {duplicates.has(String(p.reference || "").trim().toLowerCase()) && (
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-rose-600">
              <AlertTriangle className="h-3.5 w-3.5" /> Used on another purchase
            </p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      render: (p) => (
        <div className="flex flex-col items-center gap-1">
          <Badge tone={PURCHASE_STATUS[p.status]?.tone}>{PURCHASE_STATUS[p.status]?.label}</Badge>
          {p.couponCode && (
            <button
              type="button"
              aria-label={`Copy code ${p.couponCode}`}
              onClick={() => copy(p.couponCode)}
              className="flex items-center gap-1 font-mono text-xs font-bold text-[#4267B2]"
            >
              {p.couponCode} <Copy className="h-3 w-3" />
            </button>
          )}
          {p.status === "confirmed" && (
            <p className="text-xs text-slate-400">{p.codeSentAt ? `Sent ${timeAgo(p.codeSentAt)}` : "Not sent yet"}</p>
          )}
          {p.rejectNote && <p className="text-xs text-slate-400">“{p.rejectNote}”</p>}
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (p) => (
        <div className="ml-auto flex w-[190px] flex-wrap justify-end gap-2">
          {p.status === "confirmed" && whatsappFor(p) && (
            <a
              href={whatsappFor(p)}
              target="_blank"
              rel="noreferrer"
              onClick={() => sent(p)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition ${
                p.codeSentAt ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              <MessageCircle className="h-4 w-4" /> {p.codeSentAt ? "Send again" : "Send code"}
            </a>
          )}
          <Button
            variant={p.status === "pending" ? "primary" : "outline"}
            size="sm"
            icon={p.status === "pending" ? CheckCircle2 : Eye}
            href={`/dashboard/coupon-sales/purchases/${p.id}`}
          >
            {p.status === "pending" ? "Review" : "Open"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <Toolbar>
        <SegmentedControl
          value={filter}
          onChange={onFilter}
          options={[
            { value: "pending", label: "To check", count: count("pending") },
            { value: "tosend", label: "Code to send", count: count("tosend") },
            { value: "confirmed", label: "Confirmed", count: count("confirmed") },
            { value: "rejected", label: "Rejected", count: count("rejected") },
            { value: "revoked", label: "Cancelled", count: count("revoked") },
            { value: "all", label: "All", count: purchases.length },
          ]}
        />
        <div className="flex items-center gap-2 sm:max-w-sm">
          <SearchInput value={query} onChange={setQuery} placeholder="Search name, phone or code" />
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            disabled={!rows.length}
            onClick={() => downloadCsv(purchasesCsv(rows), `coupon-payments-${filter}.csv`)}
          >
            Download
          </Button>
        </div>
      </Toolbar>
      <div className="mt-5">
        <DataTable
          columns={columns}
          rows={rows}
          minWidth={1040}
          loading={!purchasesLoaded}
          empty={
            <EmptyState
              icon={ShoppingBag}
              title={purchases.length ? "Nothing here" : "No purchases yet"}
              body={purchases.length ? "Try another filter or search." : "When a customer pays for a coupon, it appears here for you to check."}
            />
          }
        />
      </div>
    </Card>
  );
}

function RewardDay() {
  const dispatch = useDispatch();
  const { purchases, purchasesLoaded } = useSelector((s) => s.couponSales);
  const [filter, setFilter] = useState("waiting");
  const [day, setDay] = useState("");

  const list = useMemo(() => rewardList(purchases), [purchases]);
  const days = useMemo(() => rewardDays(list), [list]);
  const onDay = list.filter((p) => !day || p.reward.day === day);
  const waiting = onDay.filter((p) => !p.rewardGivenAt);
  const rows = filter === "waiting" ? waiting : filter === "given" ? onDay.filter((p) => p.rewardGivenAt) : onDay;

  const download = () => downloadCsv(rewardListCsv(onDay), `reward-day-${day || "all"}.csv`);

  const toggle = async (p, given) => {
    try {
      await dispatch(markRewardGiven({ id: p.id, given })).unwrap();
      toast.success(given ? "Marked as given" : "Marked as not given");
    } catch {
      toast.error("Could not update the reward");
    }
  };

  const columns = [
    {
      key: "buyer",
      label: "Buyer",
      render: (p) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-800">{p.buyer?.name || "Customer"}</p>
          <p className="truncate text-xs text-slate-400">{p.buyer?.phone}</p>
        </div>
      ),
    },
    { key: "reward", label: "Reward", render: (p) => <span className="text-slate-700">{p.reward.text}</span> },
    { key: "offer", label: "Bought", render: (p) => <span className="text-slate-500">{p.offerTitle}</span> },
    { key: "day", label: "Reward day", render: (p) => (
        <div>
          <p className="font-semibold text-slate-700">{formatRewardDay(p.reward.day)}</p>
          {rewardOverdue(p) ? (
            <p className="text-xs font-semibold text-rose-600">Day has passed</p>
          ) : (
            !p.rewardGivenAt && <p className="text-xs text-slate-400">{dayCountdown(p.reward.day)}</p>
          )}
        </div>
      ) },
    {
      key: "state",
      label: "Status",
      align: "center",
      render: (p) => (p.rewardGivenAt ? <Badge tone="success" icon={CheckCircle2}>Given</Badge> : <Badge tone="warning" icon={Clock}>To give</Badge>),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (p) => {
        const number = whatsappNumber(p.buyer?.phone);
        return (
          <div className="flex justify-end gap-2">
            {number && !p.rewardGivenAt && (
              <a
                href={`https://wa.me/${number}?text=${encodeURIComponent(rewardMessage(p))}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" /> Tell buyer
              </a>
            )}
            <Button variant={p.rewardGivenAt ? "ghost" : "outline"} size="sm" onClick={() => toggle(p, !p.rewardGivenAt)}>
              {p.rewardGivenAt ? "Undo" : "Mark given"}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Reward-day list"
        subtitle="Everyone whose payment you've confirmed on an offer with a reward. Every one of them gets it."
        action={
          <Button variant="outline" size="sm" icon={Download} disabled={!onDay.length} onClick={download}>
            Download list
          </Button>
        }
      />
      {days.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {[{ day: "", waiting: list.filter((p) => !p.rewardGivenAt).length }, ...days].map((row) => (
            <button
              key={row.day || "all"}
              type="button"
              aria-pressed={day === row.day}
              onClick={() => setDay(row.day)}
              className={`rounded-2xl px-4 py-2 text-left text-sm font-semibold transition ${
                day === row.day ? "bg-[linear-gradient(150deg,#5B83D6,#4267B2)] text-white" : "bg-[#F2F6FC] text-slate-600 hover:text-[#4267B2]"
              }`}
            >
              {row.day ? formatRewardDay(row.day) : "All days"}
              <span className="ml-2 font-normal opacity-80">{row.waiting} to give</span>
            </button>
          ))}
        </div>
      )}
      <div className="mt-4">
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { value: "waiting", label: "To give", count: waiting.length },
            { value: "given", label: "Given", count: onDay.length - waiting.length },
            { value: "all", label: "All", count: onDay.length },
          ]}
        />
      </div>
      <div className="mt-5">
        <DataTable
          columns={columns}
          rows={rows}
          minWidth={960}
          loading={!purchasesLoaded}
          empty={<EmptyState icon={Gift} title={list.length ? "Nothing here" : "Nobody on the list yet"} body={list.length ? "Try another filter." : "Buyers join when you confirm a payment on an offer with a reward."} />}
        />
      </div>
    </Card>
  );
}

function Offers({ onDelete }) {
  const dispatch = useDispatch();
  const { offers, offersLoaded, purchases } = useSelector((s) => s.couponSales);

  const toggle = async (offer, enabled) => {
    try {
      await dispatch(saveOffer({ id: offer.id, form: { ...offer, enabled } })).unwrap();
      toast.success(`${offer.title} ${enabled ? "is on sale" : "is off sale"}`);
    } catch {
      toast.error("Could not update the coupon");
    }
  };

  return (
    <Card>
      <CardHeader
        title="Coupons you sell"
        subtitle="Each buyer gets their own single-use code once you confirm their payment."
        action={
          <Button size="sm" icon={Plus} href="/dashboard/coupon-sales/offers/new">
            Create a coupon
          </Button>
        }
      />
      {offersLoaded && !offers.length ? (
        <div className="mt-5">
          <EmptyState icon={ShoppingBag} title="Nothing on sale yet" body="Create a coupon with its price and discount." />
        </div>
      ) : (
        <ul className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {offers.map((o) => {
            const left = offerLeft(o);
            const sold = o.soldCount || 0;
            const { waiting, earned } = offerTotals(o.id, purchases);
            const onSale = offerStatus(o).key === "on_sale";
            return (
              <li key={o.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-[#F6F8FC] p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(150deg,#5B83D6,#35528F)] text-sm font-bold text-white">
                    {discountStub(o).big}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-800">{o.title}</p>
                    <p className="text-sm text-slate-500">
                      Sells for <strong className="text-slate-700">{formatMoney(o.price)}</strong>, gives {describeDiscount(o)}
                    </p>
                  </div>
                  <Badge tone={offerStatus(o).tone}>{offerStatus(o).label}</Badge>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>
                      {sold} sold · {formatMoney(earned)} earned
                      {waiting > 0 && <strong className="text-amber-700"> · {waiting} to check</strong>}
                    </span>
                    <span>{left === null ? "No limit" : `${left} left`}</span>
                  </div>
                  {o.stock > 0 && (
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-[#4267B2]" style={{ width: `${Math.min(100, (sold / o.stock) * 100)}%` }} />
                    </div>
                  )}
                </div>

                {o.rewardText && (
                  <p className="flex items-start gap-2 text-sm text-amber-800">
                    <Gift className="mt-0.5 h-4 w-4 shrink-0" /> {o.rewardText}, {formatRewardDay(o.rewardDay)}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <Switch checked={o.enabled !== false} label={`Sell ${o.title}`} onChange={(on) => toggle(o, on)} />
                    On sale
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" aria-label={`See ${o.title} on the website`} href={onSale ? `/coupons/${o.id}` : "/coupons"} target="_blank">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Copy into a new coupon" aria-label={`Copy ${o.title} into a new coupon`} href={`/dashboard/coupon-sales/offers/new?from=${o.id}`}>
                      <CopyPlus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Edit ${o.title}`} href={`/dashboard/coupon-sales/offers/${o.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="softDanger" size="icon" aria-label={`Delete ${o.title}`} onClick={() => onDelete(o)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** The three things a shop needs before anyone can buy. Goes away once they're done. */
function SetupGuide({ onOpen }) {
  const { offers } = useSelector((s) => s.couponSales);
  const shop = useSelector((s) => s.settings.values.couponShop);
  const methods = paymentMethods(shop);

  const steps = [
    { title: "Add how customers pay", note: "JazzCash, Easypaisa or a bank account", done: methods.some((m) => !methodLacksAccount(m)), tab: "payment", action: "Add payment method" },
    { title: "Create a coupon to sell", note: "Its price and what it gives", done: offers.some((o) => offerStatus(o).key === "on_sale"), href: "/dashboard/coupon-sales/offers/new", action: "Create a coupon" },
    { title: "Open the shop", note: "Customers can then buy", done: couponShopIsOpen(shop), tab: "payment", action: "Open it" },
  ];
  if (steps.every((step) => step.done)) return null;
  const current = steps.findIndex((step) => !step.done);

  return (
    <Card>
      <CardHeader title="Get your coupon shop ready" subtitle="Follow these steps. This goes away once they're done." />
      <ol className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.title} className={`flex flex-col gap-3 rounded-2xl p-4 ${i === current ? "bg-[#EEF3FC]" : "bg-[#F6F8FC]"}`}>
            <div className="flex items-start gap-3">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${step.done ? "bg-emerald-600 text-white" : "bg-white text-[#35528F]"}`}>
                {step.done ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
              </span>
              <div>
                <p className="font-bold text-slate-800">{step.title}</p>
                <p className="text-sm text-slate-500">{step.note}</p>
              </div>
            </div>
            {i === current && (
              step.href ? (
                <Button size="sm" href={step.href}>{step.action}</Button>
              ) : (
                <Button size="sm" onClick={() => onOpen(step.tab)}>{step.action}</Button>
              )
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

const TABS = ["purchases", "offers", "reward", "payment"];

export default function CouponSalesPage() {
  const dispatch = useDispatch();
  const { purchases, offers } = useSelector((s) => s.couponSales);
  const shop = useSelector((s) => s.settings.values.couponShop);
  const open = couponShopIsOpen(shop);
  // With no usable method at all, the setup guide already says so.
  const methods = paymentMethods(shop);
  const lacking = methods.some(methodLacksAccount) && !methods.every(methodLacksAccount);

  // In the address, so coming back from a coupon or a payment returns to the same place.
  const router = useRouter();
  const tab = TABS.includes(router.query.tab) ? router.query.tab : "purchases";
  const show = LISTS[router.query.show] ? router.query.show : "pending";
  const setQuery = (next) => {
    router.replace({ pathname: router.pathname, query: next }, undefined, { shallow: true, scroll: false });
  };
  const setTab = (value) => setQuery(value === "purchases" ? {} : { tab: value });
  const setShow = (value) => setQuery(value === "pending" ? {} : { show: value });

  const [deleting, setDeleting] = useState(null);
  const deletingWaiting = deleting ? offerTotals(deleting.id, purchases).waiting : 0;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    dispatch(fetchOffers());
    dispatch(fetchPurchases());
  }, [dispatch]);

  const confirmed = purchases.filter((p) => p.status === "confirmed");
  const pending = purchases.filter((p) => p.status === "pending");
  const onSaleCount = offers.filter((o) => offerStatus(o).key === "on_sale").length;
  const sales = confirmed.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

  const act = async (thunk, message, done) => {
    setBusy(true);
    try {
      await dispatch(thunk).unwrap();
      toast.success(message);
      done();
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout title="Sell coupons" eyebrow="Storefront">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatTile icon={Clock} label="Payments to check" value={pending.length} accent="#F59E0B" />
        <StatTile icon={CheckCircle2} label="Coupons sold" value={confirmed.length} hint={`${onSaleCount} on sale now`} accent={FRESH} />
        <StatTile icon={Wallet} label="Money from coupons" value={formatMoney(sales)} hint="Not included in Reports revenue" accent={BRAND} />
      </div>

      <SetupGuide onOpen={setTab} />

      {!open && (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          The coupon shop is closed, so customers can't see it.
        </div>
      )}

      {lacking && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1">A payment method has no account number, so customers can't tell where to send money.</span>
          <Button variant="outline" size="sm" onClick={() => setTab("payment")}>Fix it</Button>
        </div>
      )}

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: "purchases", label: "Payments", count: pending.length },
          { value: "offers", label: "Coupons", count: offers.length },
          { value: "reward", label: "Reward day", count: rewardList(purchases).filter((p) => !p.rewardGivenAt).length },
          { value: "payment", label: "Payment methods" },
        ]}
      />

      {tab === "purchases" && <Purchases filter={show} onFilter={setShow} />}
      {tab === "offers" && <Offers onDelete={setDeleting} />}
      {tab === "reward" && <RewardDay />}
      {tab === "payment" && <PaymentMethods />}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deletingWaiting > 0
            ? (setDeleting(null), setQuery({}))
            : act(deleteOffer(deleting.id), "Offer deleted", () => setDeleting(null))
        }
        loading={busy}
        icon={deletingWaiting > 0 ? AlertTriangle : Trash2}
        tone={deletingWaiting > 0 ? "warning" : "danger"}
        title={deletingWaiting > 0 ? "Check its payments first" : "Delete this offer?"}
        description={
          deletingWaiting > 0
            ? `${deletingWaiting} ${deletingWaiting === 1 ? "customer has" : "customers have"} paid for this and ${deletingWaiting === 1 ? "is" : "are"} waiting. Once it's deleted, no code can be issued for them.`
            : undefined
        }
        confirmLabel={deletingWaiting > 0 ? "See payments" : "Delete offer"}
        irreversible={deletingWaiting === 0}
        preview={deleting && { title: deleting.title, meta: formatMoney(deleting.price) }}
        consequences={
          deletingWaiting > 0
            ? ["To stop new sales now, switch it off instead."]
            : ["Customers can't buy it any more. To pause it instead, switch it off.", "Codes already sold keep working."]
        }
      />
    </DashboardLayout>
  );
}

CouponSalesPage.getLayout = dashboardGetLayout;
