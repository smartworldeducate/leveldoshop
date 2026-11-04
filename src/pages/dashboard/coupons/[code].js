import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { ArrowLeft, Save, Shuffle, TicketPercent } from "lucide-react";

import DashboardLayout, { dashboardGetLayout } from "@/components/dashboard/DashboardLayout";
import Card, { CardHeader } from "@/components/dashboard/ui/Card";
import Badge from "@/components/dashboard/ui/Badge";
import Button from "@/components/dashboard/ui/Button";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import SegmentedControl from "@/components/dashboard/ui/SegmentedControl";
import { SwitchRow } from "@/components/dashboard/ui/Switch";
import Field, { Input } from "@/components/dashboard/ui/Field";
import { FOCUS } from "@/components/dashboard/theme";

import { createCoupon, fetchCoupons, updateCoupon } from "@/redux/coupons/couponsSlice";
import { FreeTicket } from "@/components/CouponTicket";
import { formatMoney } from "@/data/grocery";
import {
  COUPON_TYPES,
  EMPTY_COUPON,
  computeDiscount,
  couponFields,
  couponFormErrors,
  couponStatus,
  normalizeCode,
} from "@/data/coupons";

/** ISO → the local "YYYY-MM-DDTHH:mm" a datetime input expects. */
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const toForm = (coupon) => ({
  ...EMPTY_COUPON,
  ...coupon,
  maxDiscount: coupon.maxDiscount || "",
  minOrder: coupon.minOrder || "",
  usageLimit: coupon.usageLimit || "",
  perCustomerLimit: coupon.perCustomerLimit || "",
  startsAt: toLocalInput(coupon.startsAt),
  endsAt: toLocalInput(coupon.endsAt),
  categorySlugs: coupon.categorySlugs || [],
});

const randomCode = () =>
  `SAVE${Array.from({ length: 5 }, () => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)]).join("")}`;

export default function CouponEditorPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { items: coupons, loaded, saving } = useSelector((s) => s.coupons);
  const categories = useSelector((s) => s.categories.items);

  const param = router.query.code;
  const isNew = param === "new";
  const existing = coupons.find((c) => c.code === param);

  const [form, setForm] = useState(EMPTY_COUPON);
  const [errors, setErrors] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loaded) dispatch(fetchCoupons());
  }, [dispatch, loaded]);

  useEffect(() => {
    if (ready || !router.isReady) return;
    if (isNew) setReady(true);
    else if (existing) {
      setForm(toForm(existing));
      setReady(true);
    }
  }, [ready, router.isReady, isNew, existing]);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };
  const field = (key) => (e) => set(key, e.target.value);

  const toggleAisle = (slug) =>
    set(
      "categorySlugs",
      form.categorySlugs.includes(slug)
        ? form.categorySlugs.filter((s) => s !== slug)
        : [...form.categorySlugs, slug]
    );

  const save = async (e) => {
    e.preventDefault();
    const found = couponFormErrors(form, { isNew });
    setErrors(found);
    const firstError = Object.keys(found)[0];
    if (firstError) {
      // The field may be off-screen, so a failed save must not look like nothing happened.
      toast.error(found[firstError]);
      document.querySelector(`[name="${firstError}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    try {
      if (isNew) {
        await dispatch(createCoupon(form)).unwrap();
        toast.success(`${normalizeCode(form.code)} created`);
      } else {
        await dispatch(updateCoupon({ code: existing.code, form })).unwrap();
        toast.success(`${existing.code} saved`);
      }
      router.push("/dashboard/coupons");
    } catch (err) {
      if (String(err).includes("already exists")) setErrors({ code: "A coupon with that code already exists" });
      else toast.error(typeof err === "string" ? err : "Could not save the coupon");
    }
  };

  const back = (
    <Button variant="outline" size="sm" icon={ArrowLeft} href="/dashboard/coupons">
      All codes
    </Button>
  );

  if (!isNew && loaded && !existing) {
    return (
      <DashboardLayout title="Coupon" eyebrow="Discount codes" actions={back}>
        <Card>
          <EmptyState icon={TicketPercent} title="Coupon not found" body="It may have been deleted." />
        </Card>
      </DashboardLayout>
    );
  }

  const preview = { ...couponFields(form), usedCount: existing?.usedCount || 0 };
  const hasValue = Number(form.value) > 0;
  const status = couponStatus(preview);
  const code = isNew ? normalizeCode(form.code) : existing?.code;
  const sample = Math.max(50, preview.minOrder);
  const sampleOff = computeDiscount({ ...preview, categorySlugs: [] }, [{ price: sample, quantity: 1 }]).amount;
  const endIn = (days) => set("endsAt", toLocalInput(new Date(Date.now() + days * 86_400_000).toISOString()));

  return (
    <DashboardLayout title={isNew ? "New discount code" : `Edit ${code || "code"}`} eyebrow="Discount codes" actions={back}>
      <form onSubmit={save} noValidate className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="1. The code" subtitle="What customers type in their basket." />
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Coupon code"
                required={isNew}
                error={errors.code}
                hint={isNew ? "Letters, numbers, hyphens. Not case sensitive." : "A code can't be changed once created."}
              >
                <div className="flex gap-2">
                  <Input
                    name="code"
                    value={isNew ? form.code : existing?.code || ""}
                    disabled={!isNew}
                    placeholder="WELCOME10"
                    autoComplete="off"
                    className="font-mono uppercase"
                    onChange={(e) => set("code", normalizeCode(e.target.value))}
                  />
                  {isNew && (
                    <Button
                      type="button"
                      variant="outline"
                      size="iconLg"
                      title="Make up a code"
                      aria-label="Make up a code"
                      onClick={() => set("code", randomCode())}
                    >
                      <Shuffle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Field>
              <Field label="Name" hint="Shown to customers on the ticket.">
                <Input value={form.label} onChange={field("label")} placeholder="10% off your first basket" maxLength={80} />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="2. The discount" />
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
            </div>
          </Card>

          <Card>
            <CardHeader title="3. When it works" subtitle="It starts and stops by itself. Leave both blank to run until you switch it off." />
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Starts" hint="Blank means straight away.">
                <Input type="datetime-local" value={form.startsAt} onChange={field("startsAt")} />
              </Field>
              <Field label="Ends" hint="Blank means no end date." error={errors.endsAt}>
                <Input name="endsAt" type="datetime-local" value={form.endsAt} onChange={field("endsAt")} />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">End in:</span>
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => endIn(days)}
                  className={`rounded-full bg-[#F2F6FC] px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:text-[#4267B2] ${FOCUS}`}
                >
                  {days} days
                </button>
              ))}
              <button
                type="button"
                onClick={() => set("endsAt", "")}
                className={`rounded-full bg-[#F2F6FC] px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:text-[#4267B2] ${FOCUS}`}
              >
                No end date
              </button>
            </div>
          </Card>

          <Card>
            <details open={Boolean(form.maxDiscount || form.minOrder || form.usageLimit || form.categorySlugs.length) || undefined}>
              <summary className="cursor-pointer text-base font-bold text-slate-800">More options (optional)</summary>
              <p className="mt-1 text-sm text-slate-400">Limit how much it takes off, how often it's used and where it works.</p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {form.type === "percent" && (
                  <Field label="Most it can take off" hint="Blank means no cap.">
                    <Input type="number" min="0" step="0.01" value={form.maxDiscount} onChange={field("maxDiscount")} />
                  </Field>
                )}
                <Field label="Minimum spend" hint="Blank means none.">
                  <Input type="number" min="0" step="0.01" value={form.minOrder} onChange={field("minOrder")} />
                </Field>
                <Field
                  label="Total uses"
                  hint={existing ? `Used ${existing.usedCount || 0} so far. Blank means no limit.` : "Blank means no limit."}
                >
                  <Input type="number" min="0" step="1" value={form.usageLimit} onChange={field("usageLimit")} />
                </Field>
                <Field label="Uses per customer" hint="Counted by email and phone. Blank means no limit.">
                  <Input type="number" min="0" step="1" value={form.perCustomerLimit} onChange={field("perCustomerLimit")} />
                </Field>
              </div>
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
                        selected
                          ? "bg-[linear-gradient(150deg,#5B83D6,#4267B2)] text-white"
                          : "bg-[#F2F6FC] text-slate-500 hover:text-[#4267B2]"
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </details>
          </Card>
        </div>

        <div className="flex flex-col gap-6 xl:sticky xl:top-0">
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-800">How it looks on the website</h2>
              <Badge tone={status.tone}>{status.label}</Badge>
            </div>
            <div className="ticket-preview mt-4">
              <FreeTicket coupon={preview} code={code} preview />
            </div>
            {hasValue && (
              <p className="mt-3 text-sm text-slate-500">
                On a {formatMoney(sample)} basket, this takes off {formatMoney(sampleOff)}.
              </p>
            )}
            <div className="mt-4 flex flex-col gap-3">
              <SwitchRow
                title="Code is on"
                note="Off: the code stops working"
                checked={form.enabled !== false}
                onChange={(on) => set("enabled", on)}
              />
              <SwitchRow
                title="Show on the website"
                note="Off: only people who know the code can use it"
                checked={Boolean(form.showOnSite)}
                onChange={(on) => set("showOnSite", on)}
              />
            </div>
            <Button type="submit" icon={Save} className="mt-4 w-full" loading={saving}>
              {isNew ? "Create code" : "Save changes"}
            </Button>
          </Card>
        </div>
      </form>
    </DashboardLayout>
  );
}

CouponEditorPage.getLayout = dashboardGetLayout;
