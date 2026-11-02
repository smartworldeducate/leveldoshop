import { Banknote, Check, ClipboardList, PackageCheck, ThumbsUp, X } from "lucide-react";
import { RETURN_STATUS, RETURN_STEPS } from "@/data/returns";
import { formatDateTime } from "@/lib/analytics";

export const STAGE_ICONS = {
  requested: ClipboardList,
  approved: ThumbsUp,
  received: PackageCheck,
  refunded: Banknote,
};

/** Compact table-row tracker: one segment per step, filled up to the current one. */
export function ReturnProgressBar({ status }) {
  const rejected = status === "rejected";
  const reached = RETURN_STEPS.indexOf(status);
  return (
    <div className="flex w-full min-w-[120px] flex-col items-center gap-1.5">
      <span
        className={`text-xs font-semibold ${
          rejected ? "text-slate-400" : status === "refunded" ? "text-emerald-600" : "text-[#4267B2]"
        }`}
      >
        {RETURN_STATUS[status]?.label}
      </span>
      <span className="flex w-full gap-1" aria-hidden="true">
        {RETURN_STEPS.map((step, i) => (
          <span
            key={step}
            className={`h-1.5 flex-1 rounded-full ${
              rejected
                ? "bg-slate-200"
                : i > reached
                  ? "bg-[#E4ECFA]"
                  : status === "refunded"
                    ? "bg-emerald-500"
                    : "bg-[linear-gradient(90deg,#5B83D6,#4267B2)]"
            }`}
          />
        ))}
      </span>
    </div>
  );
}

/** Full-width tracker for the return workspace, with the date of each step reached. */
export function ReturnStepper({ ret }) {
  const reached = RETURN_STEPS.indexOf(ret.status);
  const closed = ret.status === "refunded";
  const dateOf = (step) => (ret.history || []).find((h) => h.status === step)?.at;

  return (
    <ol className="grid grid-cols-4">
      {RETURN_STEPS.map((step, i) => {
        const Icon = STAGE_ICONS[step];
        const done = i < reached || closed;
        const current = i === reached && !closed;
        const on = done || current;
        return (
          <li
            key={step}
            aria-current={current ? "step" : undefined}
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
                done
                  ? "bg-[#4267B2] text-white"
                  : current
                    ? "bg-[linear-gradient(150deg,#5B83D6,#4267B2)] text-white ring-[6px] ring-[#4267B2]/20"
                    : "bg-[#F2F6FC] text-slate-400"
              }`}
            >
              {done ? <Check className="h-5 w-5" strokeWidth={3} /> : <Icon className="h-5 w-5" />}
            </span>
            <span className={`text-xs font-bold sm:text-sm ${on ? "text-slate-800" : "text-slate-400"}`}>
              {RETURN_STATUS[step].label}
            </span>
            <span className="hidden text-xs text-slate-400 sm:block">
              {dateOf(step) ? formatDateTime(dateOf(step)) : "Not yet"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Vertical audit trail of a return: every step, when, by whom, and any note. */
export function ReturnTimeline({ history = [] }) {
  return (
    <ol className="flex flex-col">
      {[...history].reverse().map((h, i, rows) => {
        const last = i === rows.length - 1;
        const rejected = h.status === "rejected";
        return (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && <span className="absolute bottom-0 left-[11px] top-6 w-0.5 bg-[#E4ECFA]" aria-hidden="true" />}
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                rejected ? "bg-rose-50 text-rose-600" : "bg-[#E4ECFA] text-[#4267B2]"
              }`}
            >
              {rejected ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700">{RETURN_STATUS[h.status]?.label}</p>
              <p className="text-xs text-slate-400">{formatDateTime(h.at)}</p>
              {h.by && <p className="truncate text-xs text-slate-400">by {h.by}</p>}
              {h.note && <p className="mt-1 text-xs italic text-slate-500">“{h.note}”</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
