import { AlertTriangle, Check, ClipboardList, Home, PackageCheck, ThumbsUp, Truck, X } from "lucide-react";
import {
  FULFILMENT_STEPS,
  STEP_INFO,
  isCancelled,
  issuesOf,
  openIssue,
  stageHistory,
  stageOf,
} from "@/data/fulfilment";
import { formatDateTime } from "@/lib/analytics";

const STEP_ICONS = { placed: ClipboardList, confirmed: ThumbsUp, packed: PackageCheck, on_the_way: Truck, delivered: Home };

/**
 * The order's journey. The step where it is stuck or stopped turns red, and any
 * step that had a problem which was since fixed says so, so it stays visible
 * exactly where things went wrong.
 */
export default function OrderStepper({ order }) {
  const stage = stageOf(order);
  const reached = FULFILMENT_STEPS.indexOf(stage);
  const closed = stage === "delivered";
  const stuck = openIssue(order)?.step || (isCancelled(order) ? stage : null);

  const dateOf = (step) =>
    step === "placed" ? order.createdAt : stageHistory(order).find((h) => h.stage === step)?.at;

  return (
    <ol className="grid grid-cols-5">
      {FULFILMENT_STEPS.map((step, i) => {
        const Icon = STEP_ICONS[step];
        const failed = stuck === step;
        const done = (i < reached || closed) && !failed;
        const current = i === reached && !closed && !failed;
        const on = done || current || failed;
        const fixed = issuesOf(order).filter((x) => x.step === step && x.status === "resolved").length;
        return (
          <li
            key={step}
            aria-current={current || failed ? "step" : undefined}
            className="relative flex flex-col items-center gap-2 text-center"
          >
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute right-1/2 top-5 h-1 w-full ${on ? "bg-[#4267B2]" : "bg-[#E4ECFA]"}`}
              />
            )}
            <span
              className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full ${
                failed
                  ? "bg-rose-600 text-white ring-[6px] ring-rose-500/20"
                  : done
                    ? "bg-[#4267B2] text-white"
                    : current
                      ? "bg-[linear-gradient(150deg,#5B83D6,#4267B2)] text-white ring-[6px] ring-[#4267B2]/20"
                      : "bg-[#F2F6FC] text-slate-400"
              }`}
            >
              {failed ? (
                isCancelled(order) ? <X className="h-5 w-5" strokeWidth={3} /> : <AlertTriangle className="h-5 w-5" />
              ) : done ? (
                <Check className="h-5 w-5" strokeWidth={3} />
              ) : (
                <Icon className="h-5 w-5" />
              )}
            </span>
            <span className={`text-[11px] font-bold leading-tight sm:text-sm ${failed ? "text-rose-600" : on ? "text-slate-800" : "text-slate-400"}`}>
              {STEP_INFO[step].label}
            </span>
            <span className="hidden text-xs text-slate-400 lg:block">
              {dateOf(step) ? formatDateTime(dateOf(step)) : "Not yet"}
            </span>
            {fixed > 0 && (
              <span
                title={`${fixed} problem${fixed === 1 ? "" : "s"} fixed at this step`}
                className="whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
              >
                {fixed} fixed
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
