import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import Sparkline from "./Sparkline";
import { CARD_SM, BRAND } from "../theme";

/**
 * Headline number card. `accent` is a hex (not a class) so any category or
 * semantic colour can drive the icon chip without extra Tailwind classes.
 */
export default function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  accent = BRAND,
  delta,
  up = true,
  trend,
  href,
  onClick,
}) {
  const interactive = Boolean(href || onClick);
  const Wrapper = href ? Link : onClick ? "button" : "div";
  return (
    <Wrapper
      href={href}
      onClick={onClick}
      className={`${CARD_SM} flex w-full items-center gap-4 p-5 text-left transition ${
        interactive ? "hover:-translate-y-0.5 hover:shadow-[0_28px_55px_-30px_rgba(80,70,150,0.6)]" : ""
      }`}
    >
      {Icon && (
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${accent}1A`, color: accent }}
        >
          <Icon className="h-6 w-6" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-2xl font-bold text-slate-800">{value}</p>
        <p className="truncate text-sm text-slate-400">{label}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-slate-400">{hint}</p>}
      </div>

      {trend?.length > 1 ? (
        <Sparkline data={trend} color={accent} />
      ) : (
        delta != null && (
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              up ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            }`}
          >
            {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {delta}
          </span>
        )
      )}
    </Wrapper>
  );
}
