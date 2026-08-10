import { tone as toneOf } from "../theme";

/**
 * Status pill. `tone` comes straight from the domain helpers
 * (stockState / expiryState) so the same state always looks the same.
 */
export default function Badge({ tone = "neutral", icon: Icon, className = "", children }) {
  const t = toneOf(tone);
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${t.bg} ${t.text} ${className}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

/** Small round counter for nav items and tabs. */
export function CountBadge({ value, tone = "danger" }) {
  if (!value) return null;
  const t = toneOf(tone);
  return (
    <span
      className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${t.bg} ${t.text}`}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}
