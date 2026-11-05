import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { AlertTriangle, ArrowLeft, Check, CreditCard, Landmark, Pencil, Plus, Save, Smartphone, Trash2, Wallet } from "lucide-react";

import Card, { CardHeader } from "./ui/Card";
import Button from "./ui/Button";
import Field, { Input, Select, Textarea } from "./ui/Field";
import { SwitchRow } from "./ui/Switch";

import { saveSettings } from "@/redux/settings/settingsSlice";
import {
  ALL_COUNTRIES,
  COUNTRIES,
  EMPTY_METHOD,
  countryName,
  generateToken,
  methodCountry,
  methodErrors,
  methodFields,
  methodLacksAccount,
  methodToForm,
  paymentMethods,
  typesForCountry,
} from "@/data/couponSales";

const ICONS = { jazzcash: Smartphone, easypaisa: Smartphone, bank: Landmark, other: Wallet, paypal: CreditCard };
const CHECK_TIMES = ["1 hour", "6 hours", "24 hours", "2 days"];

/** Exactly what a customer reads once they choose this method. */
function CustomerPreview({ form }) {
  const method = methodFields(form);
  return (
    <div className="rounded-2xl bg-[#F6F8FC] p-4">
      <p className="text-xs font-semibold text-slate-400">What customers will see</p>
      <p className="mt-2 text-xs font-semibold text-[#35528F]">
        {method.country === ALL_COUNTRIES ? "For customers in any country" : `For customers in ${countryName(method.country)}`}
      </p>
      <p className="mt-1 text-base font-bold text-slate-800">{method.name || "Payment method"}</p>
      {method.accountName && <p className="mt-2 text-xs text-slate-400">Account name</p>}
      {method.accountName && <p className="text-sm font-semibold text-slate-700">{method.accountName}</p>}
      {method.accountNumber && <p className="mt-2 text-xs text-slate-400">Send to</p>}
      {method.accountNumber && <p className="break-words text-lg font-bold text-[#35528F]">{method.accountNumber}</p>}
      {method.note && <p className="mt-2 whitespace-pre-line text-sm text-slate-500">{method.note}</p>}
    </div>
  );
}

/** Add or change one method. Pick the kind first, so only its own questions show. */
function MethodForm({ initial, saving, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  // Offered only once the shop's PayPal keys are in place.
  const available = typesForCountry(form.country).filter((t) => t.value !== "paypal" || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID);
  const type = available.find((t) => t.value === form.type);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const submit = (e) => {
    e.preventDefault();
    const found = methodErrors(form);
    setErrors(found);
    if (!Object.keys(found).length) onSave(form);
  };

  return (
    <Card>
      <CardHeader
        title={form.id ? "Change payment method" : "Add a payment method"}
        subtitle={type ? "Fill this in, then save. Customers see it straight away." : "Choose the country, then how customers there send you money."}
        action={
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onCancel}>
            Back
          </Button>
        }
      />

      <div className="mt-5 max-w-sm">
        <Field label="Customers in which country?" hint="They only see methods for the country they choose.">
          <Select
            name="country"
            value={form.country}
            onChange={(e) => {
              const country = e.target.value;
              // A local wallet can't move to a country it doesn't operate in.
              setForm((f) => ({ ...f, country, type: typesForCountry(country).some((t) => t.value === f.type) ? f.type : "" }));
              setErrors({});
            }}
          >
            <option value={ALL_COUNTRIES}>{countryName(ALL_COUNTRIES)}</option>
            {COUNTRIES.map((code) => (
              <option key={code} value={code}>{countryName(code)}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {available.map((t) => {
          const Icon = ICONS[t.value];
          const selected = form.type === t.value;
          return (
            <button
              key={t.value}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setForm((f) => ({ ...f, type: t.value }));
                setErrors({});
              }}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-sm font-semibold transition ${
                selected ? "border-[#4267B2] bg-[#EEF3FC] text-[#35528F]" : "border-slate-100 bg-white text-slate-600 hover:border-[#5B83D6]"
              }`}
            >
              <Icon className="h-6 w-6" />
              {t.label}
            </button>
          );
        })}
      </div>

      {type && (
        <form onSubmit={submit} noValidate className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-4">
            {type.online && (
              <p className="text-sm text-slate-500">
                Customers pay online with PayPal or a card, with no receipt to upload. You'll see PayPal's confirmation before you issue their code.
              </p>
            )}
            {form.type === "other" && (
              <Field label="Name of the method" required error={errors.name}>
                <Input name="name" value={form.name} onChange={set("name")} placeholder="NayaPay" maxLength={40} />
              </Field>
            )}
            {form.type === "bank" && (
              <Field label="Bank name" required error={errors.bankName}>
                <Input name="bankName" value={form.bankName} onChange={set("bankName")} placeholder="Meezan Bank" maxLength={40} />
              </Field>
            )}
            {!type.online && (
              <>
                <Field label="Name on the account" required={form.type !== "other"} error={errors.accountName} hint="Customers check this before sending money.">
                  <Input name="accountName" value={form.accountName} onChange={set("accountName")} placeholder="A-one Grocery" maxLength={60} />
                </Field>
                <Field label={type.numberLabel} required={form.type !== "other"} error={errors.accountNumber}>
                  <Input name="accountNumber" value={form.accountNumber} onChange={set("accountNumber")} placeholder={type.placeholder} maxLength={40} />
                </Field>
                <Field label={form.type === "other" ? "Instructions" : "Extra instructions (optional)"} error={errors.note}>
                  <Textarea name="note" rows={2} value={form.note} onChange={set("note")} placeholder="Please send the exact amount." />
                </Field>
              </>
            )}
            <div>
              <Button type="submit" icon={Save} loading={saving}>
                Save payment method
              </Button>
            </div>
          </div>
          <CustomerPreview form={form} />
        </form>
      )}
    </Card>
  );
}

/** Everything saves as soon as it's done: there's no separate Save to forget. */
export default function PaymentMethods() {
  const dispatch = useDispatch();
  const { values, saving } = useSelector((s) => s.settings);
  const shop = values.couponShop;
  const methods = paymentMethods(shop);
  const usable = methods.filter((m) => !methodLacksAccount(m));
  // Adding another usually means the same country as the last one.
  const newMethodCountry = methods.length ? methodCountry(methods[methods.length - 1]) : EMPTY_METHOD.country;

  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [checkTime, setCheckTime] = useState(null);
  const shownTime = checkTime ?? shop?.checkTime ?? "";

  const save = async (patch, message) => {
    try {
      await dispatch(saveSettings({ ...values, couponShop: { enabled: false, checkTime: "", ...shop, methods, instructions: "", ...patch } })).unwrap();
      toast.success(message);
      return true;
    } catch {
      toast.error("Could not save");
      return false;
    }
  };

  const saveMethod = async (form) => {
    const method = methodFields({ ...form, id: form.id || generateToken() });
    const known = methods.some((m) => m.id === method.id);
    const list = known ? methods.map((m) => (m.id === method.id ? method : m)) : [...methods, method];
    if (await save({ methods: list }, `${method.name} saved`)) setEditing(null);
  };

  const removeMethod = async (method) => {
    const list = methods.filter((m) => m.id !== method.id);
    // With nothing to pay into, the shop has to close.
    if (await save({ methods: list, enabled: list.length ? shop?.enabled === true : false }, `${method.name} removed`)) setRemoving(null);
  };

  const saveTime = (value) => {
    setCheckTime(value);
    save({ checkTime: value.trim() }, "Saved");
  };

  if (editing) {
    return <MethodForm initial={editing} saving={saving} onSave={saveMethod} onCancel={() => setEditing(null)} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader
          title="Payment methods"
          subtitle="Where customers send money for a coupon. They choose their country, then see only its methods."
          action={
            <Button size="sm" icon={Plus} onClick={() => setEditing({ ...EMPTY_METHOD, country: newMethodCountry })}>
              Add payment method
            </Button>
          }
        />

        {methods.length === 0 ? (
          <button
            type="button"
            onClick={() => setEditing({ ...EMPTY_METHOD, country: newMethodCountry })}
            className="mt-5 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-slate-500 transition hover:border-[#5B83D6] hover:text-[#4267B2]"
          >
            <Wallet className="h-8 w-8" />
            <span className="text-sm font-semibold">Add your first payment method, such as JazzCash or a bank account</span>
          </button>
        ) : (
          <ul className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {methods.map((m) => {
              const Icon = ICONS[methodToForm(m).type] || Wallet;
              const lacking = methodLacksAccount(m);
              return (
                <li key={m.id} className={`rounded-2xl border p-4 ${lacking ? "border-amber-300 bg-amber-50" : "border-slate-100 bg-[#F6F8FC]"}`}>
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#4267B2]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800">{m.name}</p>
                      <p className="mt-0.5 text-xs font-semibold text-[#35528F]">{countryName(methodCountry(m))}</p>
                      <p className="mt-0.5 whitespace-pre-line break-words text-sm text-slate-500">{m.details}</p>
                    </div>
                  </div>
                  {lacking && (
                    <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-amber-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> No account number. Customers can't tell where to send money.
                    </p>
                  )}
                  {removing === m.id ? (
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <span className="mr-auto text-sm font-semibold text-slate-600">Remove {m.name}?</span>
                      <Button variant="outline" size="sm" onClick={() => setRemoving(null)}>Keep it</Button>
                      <Button variant="danger" size="sm" loading={saving} onClick={() => removeMethod(m)}>Yes, remove</Button>
                    </div>
                  ) : (
                    <div className="mt-3 flex justify-end gap-2">
                      <Button variant={lacking ? "primary" : "outline"} size="sm" icon={Pencil} onClick={() => setEditing(methodToForm(m))}>
                        {lacking ? "Add the number" : "Change"}
                      </Button>
                      <Button variant="softDanger" size="sm" icon={Trash2} onClick={() => setRemoving(m.id)}>Remove</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Coupon shop" subtitle="Customers can only buy coupons while this is on." />
        <div className="mt-4 flex flex-col gap-4">
          <SwitchRow
            title="Open the coupon shop"
            note={usable.length ? "Adds Coupons to the website menu" : "Add a payment method with an account number first"}
            checked={shop?.enabled === true && methods.length > 0}
            disabled={!methods.length}
            onChange={(on) => save({ enabled: on }, on ? "Your coupon shop is open" : "Your coupon shop is closed")}
          />
          {/* Not a Field: that's a <label>, and clicking its words would press the first button. */}
          <div>
            <p className="text-sm font-semibold text-slate-700">How long you take to check a payment</p>
            <p className="mb-2 mt-0.5 text-xs text-slate-400">Shown to customers, so only promise what you can keep.</p>
            <div className="flex flex-wrap items-center gap-2">
              {CHECK_TIMES.map((time) => (
                <button
                  key={time}
                  type="button"
                  aria-pressed={shownTime === time}
                  onClick={() => saveTime(time)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    shownTime === time ? "bg-[#4267B2] text-white" : "bg-[#F2F6FC] text-slate-600 hover:text-[#4267B2]"
                  }`}
                >
                  {shownTime === time && <Check className="h-4 w-4" />} {time}
                </button>
              ))}
              {shownTime && (
                <Button variant="ghost" size="sm" onClick={() => saveTime("")}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
