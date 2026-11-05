import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import { auth } from "@/lib/firebaseClient";

/** Asks PayPal, through the server, whether this purchase has really been paid. */
export default function PayPalCheck({ purchase, onResult }) {
  const [check, setCheck] = useState(null);

  useEffect(() => {
    let live = true;
    setCheck(null);
    (async () => {
      let result = { paid: false, problem: "Couldn't reach PayPal. Reload this page to try again." };
      try {
        const res = await fetch("/api/paypal/verify-order", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${await auth.currentUser.getIdToken()}` },
          body: JSON.stringify({ purchaseId: purchase.id }),
        });
        if (res.ok) result = await res.json();
      } catch {
        // Shown as couldn't reach PayPal.
      }
      if (!live) return;
      setCheck(result);
      onResult(result);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchase.id]);

  if (!check) {
    return (
      <p className="flex items-center gap-2 p-6 text-sm text-slate-500" aria-busy="true">
        <Loader2 className="h-4 w-4 animate-spin" /> Asking PayPal…
      </p>
    );
  }

  if (!check.paid) {
    return (
      <p className="flex items-start gap-2 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /> Not confirmed by PayPal: {check.problem}
      </p>
    );
  }

  return (
    <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
      <p className="flex items-center gap-2 text-base font-bold">
        <CheckCircle2 className="h-5 w-5 shrink-0" /> PayPal confirms {check.currency} {check.amount} received
      </p>
      {check.payerEmail && <p className="mt-2">From: {check.payerEmail}</p>}
      {check.captureId && <p className="mt-1 break-all">PayPal transaction: {check.captureId}</p>}
      <p className="mt-2 text-xs">Refunds are made in your PayPal account.</p>
    </div>
  );
}
