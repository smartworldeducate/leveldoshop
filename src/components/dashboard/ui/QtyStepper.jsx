import { Minus, Plus } from "lucide-react";
import { FOCUS } from "../theme";

/** −/+ quantity control, clamped to 0…max. Used wherever units are counted out. */
export default function QtyStepper({ value = 0, max, onChange, label }) {
  const set = (next) => onChange(Math.min(max, Math.max(0, next)));
  const button = `flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition hover:text-[#4267B2] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`;
  return (
    <div role="group" aria-label={label} className="flex shrink-0 items-center gap-1 rounded-full bg-[#E9EEF8] p-1">
      <button type="button" className={button} disabled={value <= 0} aria-label="One less" onClick={() => set(value - 1)}>
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span aria-live="polite" className="w-7 text-center text-sm font-bold tabular-nums text-slate-700">
        {value}
      </span>
      <button type="button" className={button} disabled={value >= max} aria-label="One more" onClick={() => set(value + 1)}>
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
