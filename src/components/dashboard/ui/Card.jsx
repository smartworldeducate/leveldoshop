import { CARD } from "../theme";

/** Rounded white surface — the base of every block in the dashboard. */
export default function Card({ className = "", padded = true, children, ...props }) {
  return (
    <div className={`${CARD} ${padded ? "p-6" : ""} ${className}`} {...props}>
      {children}
    </div>
  );
}

/** Title row with an optional action cluster on the right. */
export function CardHeader({ title, subtitle, action, className = "" }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div>
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
