import { FOCUS } from "../theme";

const CONTROL =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 placeholder:text-slate-300 transition hover:border-slate-300 focus:border-[#4267B2] disabled:bg-slate-50";

/** Label + control + hint/error wrapper. `span` sets the grid columns used. */
export default function Field({ label, hint, error, required, span = 1, children }) {
  return (
    <label className={span === 2 ? "sm:col-span-2" : ""}>
      {label && (
        <span className="mb-1.5 block text-xs font-semibold text-slate-500">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-rose-500">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>
      )}
    </label>
  );
}

export function Input({ className = "", ...props }) {
  return <input className={`${CONTROL} h-11 ${FOCUS} ${className}`} {...props} />;
}

export function Textarea({ className = "", rows = 4, ...props }) {
  return <textarea rows={rows} className={`${CONTROL} py-3 ${FOCUS} ${className}`} {...props} />;
}

export function Select({ className = "", children, ...props }) {
  return (
    <select className={`${CONTROL} h-11 ${FOCUS} ${className}`} {...props}>
      {children}
    </select>
  );
}

/** Inline checkbox with its own label — for flags like "organic". */
export function Checkbox({ label, className = "", ...props }) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-600 transition hover:border-[#4267B2] ${className}`}
    >
      <input type="checkbox" className={`h-4 w-4 accent-[#4267B2] ${FOCUS}`} {...props} />
      {label}
    </label>
  );
}
