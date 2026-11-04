import { Check } from "lucide-react";

import { DRAW_STAGES, drawStage } from "@/data/rewards";

/** Where a draw has got to. `compact` leaves the words out, for cards in a list. */
export default function DrawStages({ draw, compact = false }) {
  const stage = drawStage(draw);

  return (
    <ol className="flex w-full" aria-label={`Stage: ${DRAW_STAGES[stage]}`}>
      {DRAW_STAGES.map((label, i) => {
        const done = i < stage || stage === DRAW_STAGES.length - 1;
        const current = i === stage && !done;
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center gap-1.5 text-center">
            {i > 0 && (
              <span className={`absolute right-1/2 top-3 h-0.5 w-full ${i <= stage ? "bg-emerald-500" : "bg-slate-200"}`} />
            )}
            <span
              className={`relative z-[1] flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                done ? "bg-emerald-500 text-white" : current ? "bg-[#4267B2] text-white ring-4 ring-[#4267B2]/15" : "bg-slate-200 text-slate-500"
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            {!compact && (
              <span className={`text-xs font-semibold ${current ? "text-[#35528F]" : done ? "text-slate-700" : "text-slate-400"}`}>{label}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
