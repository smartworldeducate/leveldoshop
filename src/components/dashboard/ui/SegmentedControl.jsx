// Controlled pill-style segmented control used for tabs / filters.
export default function SegmentedControl({ options, value, onChange, className = "" }) {
  return (
    <div className={`inline-flex flex-wrap rounded-full bg-[#F2F6FC] p-1 ${className}`}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              active
                ? "bg-[linear-gradient(150deg,#5B83D6,#4267B2)] text-white shadow-[0_8px_18px_-8px_rgba(66,103,178,0.9)]"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {opt.label}
            {opt.count != null && (
              <span
                className={`rounded-full px-1.5 text-[10px] ${
                  active ? "bg-white/25" : "bg-slate-200 text-slate-500"
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
