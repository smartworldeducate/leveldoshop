import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { AlertTriangle, ArrowLeft, Save, ShoppingBag } from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import Card, { CardHeader } from "@/components/dashboard/ui/Card";
import Button from "@/components/dashboard/ui/Button";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import SegmentedControl from "@/components/dashboard/ui/SegmentedControl";
import { SwitchRow } from "@/components/dashboard/ui/Switch";
import Field, { Input, Textarea } from "@/components/dashboard/ui/Field";
import { FOCUS } from "@/components/dashboard/theme";

import { fetchOffers, saveOffer } from "@/redux/couponSales/couponSalesSlice";
import { OfferTicket } from "@/components/CouponTicket";
import { formatMoney } from "@/data/grocery";
import { COUPON_TYPES, describeDiscount } from "@/data/coupons";
import { EMPTY_OFFER, offerErrors, offerFields } from "@/data/couponSales";

const toForm = (offer) => ({
  ...EMPTY_OFFER,
  ...offer,
  maxDiscount: offer.maxDiscount || "",
  minOrder: offer.minOrder || "",
  validDays: offer.validDays || "",
  stock: offer.stock || "",
  categorySlugs: offer.categorySlugs || [],
});

export default function OfferEditorPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { offers, offersLoaded } = useSelector((s) => s.couponSales);
  const categories = useSelector((s) => s.categories.items);

  const param = router.query.id;
  const isNew = param === "new";
  const existing = offers.find((o) => o.id === param);

  const [form, setForm] = useState(EMPTY_OFFER);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [rewarding, setRewarding] = useState(false);

  useEffect(() => {
    if (!offersLoaded) dispatch(fetchOffers());
  }, [dispatch, offersLoaded]);

  useEffect(() => {
    if (ready || !router.isReady) return;
    if (isNew) setReady(true);
    else if (existing) {
      setForm(toForm(existing));
      setRewarding(Boolean(existing.rewardText));
      setReady(true);
    }
  }, [ready, router.isReady, isNew, existing]);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };
  const field = (key) => (e) => set(key, e.target.value);
  const toggleAisle = (slug) =>
    set("categorySlugs", form.categorySlugs.includes(slug) ? form.categorySlugs.filter((s) => s !== slug) : [...form.categorySlugs, slug]);

  const toggleReward = (on) => {
    setRewarding(on);
    if (!on) setForm((f) => ({ ...f, rewardText: "", rewardDay: "" }));
    setErrors((prev) => ({ ...prev, rewardText: "", rewardDay: "" }));
  };

  const save = async (e) => {
    e.preventDefault();
    const found = offerErrors(form);
    if (rewarding && !String(form.rewardText).trim()) found.rewardText = "Say what every buyer gets";
    setErrors(found);
    const firstError = Object.keys(found)[0];
    if (firstError) {
      // The field may be off-screen, so a failed save must not look like nothing happened.
      toast.error(found[firstError]);
      document.querySelector(`[name="${firstError}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSaving(true);
    try {
      await dispatch(saveOffer({ id: isNew ? null : existing.id, form })).unwrap();
      toast.success(isNew ? "Coupon created" : "Coupon saved");
      router.push("/dashboard/coupon-sales");
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Could not save the offer");
      setSaving(false);
    }
  };

  const back = (
    <Button variant="outline" size="sm" icon={ArrowLeft} href="/dashboard/coupon-sales">
      Sell coupons
    </Button>
  );

  if (!isNew && offersLoaded && !existing) {
    return (
      <DashboardLayout title="Offer" eyebrow="Sell coupons" actions={back}>
        <Card>
          <EmptyState icon={ShoppingBag} title="Offer not found" body="It may have been deleted." />
        </Card>
      </DashboardLayout>
    );
  }

  const preview = offerFields(form);
  const payingMore = form.type === "fixed" && preview.price >= preview.value && preview.value > 0;

  return (
    <DashboardLayout title={isNew ? "New coupon to sell" : `Edit ${existing?.title || "coupon"}`} eyebrow="Sell coupons" actions={back}>
      <form onSubmit={save} noValidate className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="1. Name and price" subtitle="What customers see, and what they pay you." />
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Coupon name" required error={errors.title} hint='Use a clear name, for example "20% off voucher".'>
                <Input name="title" value={form.title} onChange={field("title")} placeholder="20% off voucher" maxLength={60} />
              </Field>
              <Field label="Price the customer pays" required error={errors.price}>
                <Input name="price" type="number" min="0" step="0.01" value={form.price} onChange={field("price")} />
              </Field>
              <Field label="Short description (optional)" span={2}>
                <Textarea rows={2} value={form.description} onChange={field("description")} placeholder="Save on your weekly shop." />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="2. What the customer gets" subtitle="The discount their code gives. It works once, on one order." />
            <div className="mt-4">
              <SegmentedControl
                value={form.type}
                onChange={(type) => set("type", type)}
                options={COUPON_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={form.type === "percent" ? "Percent off" : "Amount off"} required error={errors.value}>
                <Input name="value" type="number" min="0" step="0.01" value={form.value} onChange={field("value")} />
              </Field>
              <Field label="Days the code lasts" hint="Counted from when you confirm payment. Blank means no expiry.">
                <Input type="number" min="0" step="1" value={form.validDays} onChange={field("validDays")} />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="3. Reward day (optional)" subtitle="A gift every confirmed buyer gets on a date you choose." />
            <div className="mt-4">
              <SwitchRow title="Give buyers a reward" note="Off: this coupon only gives the discount" checked={rewarding} onChange={toggleReward} />
            </div>
            {rewarding && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="What every buyer gets" error={errors.rewardText} hint="A gift for everyone, not a prize only some people win: that would be a paid draw.">
                  <Input name="rewardText" value={form.rewardText} onChange={field("rewardText")} placeholder="A free 1L bottle of milk" maxLength={120} />
                </Field>
                <Field label="Reward day" error={errors.rewardDay} hint="This coupon stops selling after this day. Buyers already confirmed keep their reward and date.">
                  <Input name="rewardDay" type="date" value={form.rewardDay} onChange={field("rewardDay")} />
                </Field>
              </div>
            )}
          </Card>

          <Card>
            <details open={Boolean(form.maxDiscount || form.minOrder || form.stock || form.categorySlugs.length) || undefined}>
              <summary className="cursor-pointer text-base font-bold text-slate-800">More options (optional)</summary>
              <p className="mt-1 text-sm text-slate-400">Limit how much it takes off, where it works and how many you sell.</p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {form.type === "percent" && (
                  <Field label="Most it can take off" hint="Blank means no cap.">
                    <Input type="number" min="0" step="0.01" value={form.maxDiscount} onChange={field("maxDiscount")} />
                  </Field>
                )}
                <Field label="Minimum spend" hint="Blank means none.">
                  <Input type="number" min="0" step="0.01" value={form.minOrder} onChange={field("minOrder")} />
                </Field>
                <Field label="How many to sell" hint={existing ? `Sold ${existing.soldCount || 0} so far. Blank means no limit.` : "Blank means no limit."}>
                  <Input type="number" min="0" step="1" value={form.stock} onChange={field("stock")} />
                </Field>
              </div>
              {categories.length > 0 && (
                <>
                  <p className="mb-2 mt-4 text-xs font-semibold text-slate-500">Works in these aisles (none chosen means all)</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => {
                      const selected = form.categorySlugs.includes(c.slug);
                      return (
                        <button
                          key={c.slug}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleAisle(c.slug)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${FOCUS} ${
                            selected ? "bg-[linear-gradient(150deg,#5B83D6,#4267B2)] text-white" : "bg-[#F2F6FC] text-slate-500 hover:text-[#4267B2]"
                          }`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </details>
          </Card>
        </div>

        <div className="flex flex-col gap-6 xl:sticky xl:top-0">
          <Card>
            <CardHeader title="How it looks on the website" />
            <div className="ticket-preview mt-4">
              <OfferTicket offer={{ ...preview, soldCount: existing?.soldCount || 0 }} preview />
            </div>
            {preview.value > 0 && preview.price > 0 && (
              <p className="mt-3 text-sm text-slate-500">
                The customer pays <strong>{formatMoney(preview.price)}</strong> and gets <strong>{describeDiscount(preview)}</strong> on one order.
              </p>
            )}
            {payingMore && (
              <p className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Customers pay as much as, or more than, the code is worth. Check that's what you want.
              </p>
            )}
            <div className="mt-4">
              <SwitchRow title="On sale" note="Off: customers can't buy it" checked={form.enabled !== false} onChange={(on) => set("enabled", on)} />
            </div>
            <Button type="submit" icon={Save} className="mt-4 w-full" loading={saving}>
              {isNew ? "Create coupon" : "Save changes"}
            </Button>
          </Card>
        </div>
      </form>
    </DashboardLayout>
  );
}

OfferEditorPage.getLayout = dashboardGetLayout;
