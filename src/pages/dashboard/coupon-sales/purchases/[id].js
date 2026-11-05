import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Copy, MessageCircle, ShoppingBag, X } from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import Card, { CardHeader } from "@/components/dashboard/ui/Card";
import Badge from "@/components/dashboard/ui/Badge";
import Button from "@/components/dashboard/ui/Button";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import Field, { Textarea } from "@/components/dashboard/ui/Field";
import PrivateReceipt from "@/components/PrivateReceipt";
import PayPalCheck from "@/components/dashboard/PayPalCheck";

import { confirmPurchase, fetchPurchases, markCodeSent, rejectPurchase, revokePurchase } from "@/redux/couponSales/couponSalesSlice";
import { fetchCoupons } from "@/redux/coupons/couponsSlice";
import { fetchDraws } from "@/redux/rewards/rewardsSlice";
import { formatDateTime, timeAgo } from "@/lib/analytics";
import { formatMoney } from "@/data/grocery";
import { describeDiscount } from "@/data/coupons";
import { whatsappNumber } from "@/data/notifications";
import { shortOrderId } from "@/data/returns";
import {
  PURCHASE_STATUS,
  REJECT_REASONS,
  buyerHistory,
  duplicateReferences,
  formatRewardDay,
  nextToCheck,
  purchaseList,
  purchaseMessage,
  receivedMessage,
  rejectedMessage,
  revokedMessage,
  soldCodeState,
} from "@/data/couponSales";
import { drawStatus, formatDrawDate } from "@/data/rewards";

const whatsappLink = (phone, text) => {
  const number = whatsappNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
};

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <dt className="text-sm text-slate-400">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-semibold text-slate-700">{children}</dd>
    </div>
  );
}

function WhatsAppLink({ href, children, solid = false, onClick }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={onClick}
      className={`flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
        solid ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      }`}
    >
      <MessageCircle className="h-4 w-4" /> {children}
    </a>
  );
}

/** One payment to check, on a page of its own: the receipt has to be big enough to read. */
export default function PurchaseReviewPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { purchases, purchasesLoaded } = useSelector((s) => s.couponSales);
  const shop = useSelector((s) => s.settings.values.couponShop);
  const draws = useSelector((s) => s.rewards.draws);
  const coupons = useSelector((s) => s.coupons);
  const orders = useSelector((s) => s.adminOrders.items);

  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [revoking, setRevoking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paypal, setPaypal] = useState(null);

  const purchase = purchases.find((p) => p.id === router.query.id);

  useEffect(() => {
    if (!purchasesLoaded) dispatch(fetchPurchases());
    dispatch(fetchDraws());
    dispatch(fetchCoupons());
  }, [dispatch, purchasesLoaded]);

  // The same page is reused when moving on to the next payment.
  useEffect(() => {
    setPaypal(null);
    setRejecting(false);
    setRevoking(false);
    setNote("");
  }, [router.query.id]);

  const act = async (thunk, message) => {
    setBusy(true);
    try {
      await dispatch(thunk).unwrap();
      toast.success(message);
      setRejecting(false);
      setRevoking(false);
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${text} copied`);
    } catch {
      toast.error("Could not copy");
    }
  };

  // Back to the list this purchase is in, not always the first one.
  const back = (
    <Button variant="outline" size="sm" icon={ArrowLeft} href={purchase ? `/dashboard/coupon-sales?show=${purchaseList(purchase)}` : "/dashboard/coupon-sales"}>
      Sell coupons
    </Button>
  );

  if (purchasesLoaded && !purchase) {
    return (
      <DashboardLayout title="Payment" eyebrow="Sell coupons" actions={back}>
        <Card>
          <EmptyState icon={ShoppingBag} title="Purchase not found" body="It may have been deleted." />
        </Card>
      </DashboardLayout>
    );
  }

  if (!purchase) {
    return (
      <DashboardLayout title="Payment" eyebrow="Sell coupons" actions={back}>
        <Card><p className="text-sm text-slate-400" aria-busy="true">Loading…</p></Card>
      </DashboardLayout>
    );
  }

  const status = PURCHASE_STATUS[purchase.status];
  const next = nextToCheck(purchases, purchase.id);
  const reused = duplicateReferences(purchases).has(String(purchase.reference || "").trim().toLowerCase());
  const openDraw = draws.find((d) => drawStatus(d).key === "open");
  const ordersUrl = typeof window === "undefined" ? "/coupons/mine" : `${window.location.origin}/coupons/mine`;

  const receivedLink = whatsappLink(
    purchase.buyer?.phone,
    receivedMessage(purchase, { checkTime: shop?.checkTime, draw: openDraw, drawDate: openDraw && formatDrawDate(openDraw.resultsAt) })
  );
  const codeLink = purchase.couponCode ? whatsappLink(purchase.buyer?.phone, purchaseMessage(purchase, ordersUrl)) : null;
  const history = buyerHistory(purchases, purchase);

  const soldCode = coupons.items.find((c) => c.code === purchase.couponCode);
  const codeState = coupons.loaded && purchase.couponCode ? soldCodeState(soldCode) : null;
  const usedOn = purchase.couponCode ? orders.find((o) => o.coupon?.code === purchase.couponCode) : null;

  const sent = () => {
    if (!purchase.codeSentAt) dispatch(markCodeSent(purchase.id));
  };
  const toldLink = whatsappLink(
    purchase.buyer?.phone,
    purchase.status === "rejected" ? rejectedMessage(purchase) : purchase.status === "revoked" ? revokedMessage(purchase) : ""
  );

  return (
    <DashboardLayout title={purchase.token || "Payment"} eyebrow="Sell coupons" actions={back}>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card>
          <CardHeader
            title={purchase.paypalOrderId ? "PayPal payment" : "Payment receipt"}
            subtitle={purchase.paypalOrderId ? "This answer comes directly from PayPal." : "Check your account as well: a screenshot can be faked."}
          />
          <div className="mt-5">
            {purchase.paypalOrderId ? (
              <PayPalCheck key={purchase.id} purchase={purchase} onResult={setPaypal} />
            ) : (
              <PrivateReceipt purchase={purchase} className="max-h-[72vh] max-w-full rounded-xl object-contain" />
            )}
          </div>
          {purchase.screenshot && (
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> This older receipt is at a public image link. Delete it from Cloudinary once you've checked it.
            </p>
          )}
        </Card>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title={formatMoney(purchase.price)} subtitle={purchase.offerTitle} action={<Badge tone={status?.tone}>{status?.label}</Badge>} />
            <dl className="mt-3">
              <Row label="Paid by">{purchase.paymentMethod || "Not given"}</Row>
              <Row label="Transaction ID">{purchase.reference || "Not given"}</Row>
              <Row label="Sent">{formatDateTime(purchase.createdAt)}</Row>
              <Row label="Customer">{purchase.buyer?.name || "Customer"}</Row>
              <Row label="WhatsApp">{purchase.buyer?.phone}</Row>
              <Row label="Email">{purchase.buyer?.email || "Not given"}</Row>
              <Row label="Earlier purchases">
                {history.total === 0 ? (
                  "First purchase"
                ) : (
                  <>
                    {history.confirmed} confirmed
                    {history.rejected > 0 && <span className="text-rose-600">, {history.rejected} rejected</span>}
                  </>
                )}
              </Row>
              {purchase.coupon && <Row label="Gives">{describeDiscount(purchase.coupon)}</Row>}
              {purchase.reward?.text && <Row label="Reward">{purchase.reward.text}, {formatRewardDay(purchase.reward.day)}</Row>}
              {purchase.rejectNote && <Row label="Why rejected">{purchase.rejectNote}</Row>}
            </dl>
            {reused && (
              <p className="mt-3 flex items-start gap-2 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> This transaction ID is on another purchase too. Check it isn't being used twice.
              </p>
            )}
          </Card>

          {purchase.status === "pending" && (
            <Card>
              {rejecting ? (
                <>
                  <CardHeader title="Reject this purchase" />
                  {purchase.paypalOrderId && (
                    <p className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> If PayPal took their money, refund it at paypal.com. Rejecting here doesn't send it back.
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {REJECT_REASONS.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        aria-pressed={note === reason}
                        onClick={() => setNote(reason)}
                        className={`rounded-full px-3 py-1.5 text-left text-xs font-semibold transition ${
                          note === reason ? "bg-[#4267B2] text-white" : "bg-[#F2F6FC] text-slate-600 hover:text-[#4267B2]"
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Field label="Why?" required hint="The customer sees this on their My coupons page.">
                      <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                    </Field>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setRejecting(false)}>Keep it</Button>
                    <Button
                      variant="danger"
                      className="flex-1"
                      loading={busy}
                      disabled={!note.trim()}
                      onClick={() => act(rejectPurchase({ id: purchase.id, note }), "Purchase rejected")}
                    >
                      Reject purchase
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <CardHeader title="Have you received this money?" subtitle="Confirming creates a working code straight away." />
                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      icon={CheckCircle2}
                      loading={busy}
                      disabled={Boolean(purchase.paypalOrderId) && !paypal?.paid}
                      onClick={() => act(confirmPurchase(purchase.id), "Payment confirmed. The code is ready to send.")}
                    >
                      Yes, confirm payment
                    </Button>
                    <Button variant="softDanger" icon={X} onClick={() => setRejecting(true)}>Reject</Button>
                    {receivedLink && <WhatsAppLink href={receivedLink}>Tell customer we're checking</WhatsAppLink>}
                  </div>
                </>
              )}
            </Card>
          )}

          {purchase.status === "confirmed" && (
            <Card>
              <CardHeader
                title="The code is ready"
                subtitle={
                  purchase.codeSentAt
                    ? `Sent ${timeAgo(purchase.codeSentAt)}. It's also on their My coupons page.`
                    : "Send it to the customer on WhatsApp. It's also on their My coupons page."
                }
                action={codeState && <Badge tone={codeState.tone}>{codeState.label}</Badge>}
              />
              <button
                type="button"
                aria-label={`Copy code ${purchase.couponCode}`}
                onClick={() => copy(purchase.couponCode)}
                className="mt-4 flex w-full items-center justify-between gap-2 rounded-2xl border border-dashed border-[#5B83D6] bg-[#F2F6FC] p-3 font-mono text-sm font-bold text-[#35528F]"
              >
                {purchase.couponCode} <Copy className="h-4 w-4 shrink-0" />
              </button>
              {soldCode?.endsAt && codeState?.key === "unused" && (
                <p className="mt-2 text-xs text-slate-400">Works until {formatDateTime(soldCode.endsAt)}</p>
              )}
              {usedOn && (
                <p className="mt-2 text-sm text-slate-500">
                  Used on order{" "}
                  <Link href={`/dashboard/orders/${usedOn.id}`} className="font-semibold text-[#4267B2] underline">{shortOrderId(usedOn.id)}</Link>
                </p>
              )}
              <div className="mt-3 flex flex-col gap-2">
                {codeLink && codeState?.key !== "used" && (
                  <WhatsAppLink href={codeLink} solid={!purchase.codeSentAt} onClick={sent}>
                    {purchase.codeSentAt ? "Send code again" : "Send code on WhatsApp"}
                  </WhatsAppLink>
                )}
                {!purchase.codeSentAt && codeState?.key !== "used" && (
                  <Button variant="outline" onClick={sent}>I've already sent it</Button>
                )}
                {codeState?.key === "used" ? (
                  <p className="text-center text-xs text-slate-400">This code has been spent, so it can't be cancelled.</p>
                ) : revoking ? (
                  <div className="rounded-2xl bg-rose-50 p-3">
                    <p className="text-sm text-rose-800">
                      Use this after refunding the customer: the app doesn't send the money back. The code stops working straight away, the sale leaves your totals, and the buyer comes off the reward-day list.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setRevoking(false)}>Keep it</Button>
                      <Button variant="danger" size="sm" className="flex-1" loading={busy} onClick={() => act(revokePurchase(purchase.id), "Code cancelled")}>
                        Cancel the code
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="ghost" onClick={() => setRevoking(true)}>Cancel code</Button>
                )}
              </div>
            </Card>
          )}

          {["rejected", "revoked"].includes(purchase.status) && toldLink && (
            <Card>
              <CardHeader
                title="Tell the customer"
                subtitle={purchase.status === "rejected" ? "They can see the reason on their My coupons page, but they may not look." : "Let them know their code no longer works."}
              />
              <div className="mt-4">
                <WhatsAppLink href={toldLink} solid>Send message on WhatsApp</WhatsAppLink>
              </div>
            </Card>
          )}

          {next && (
            <Button variant="outline" icon={ArrowRight} href={`/dashboard/coupon-sales/purchases/${next.id}`}>
              Next payment to check
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

PurchaseReviewPage.getLayout = dashboardGetLayout;
