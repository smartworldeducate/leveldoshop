import { useEffect, useState } from "react";

// Animated vertical bar chart; hover a bar to highlight it and reveal its value.
export default function BarChart({ data, labels, height = 200, formatValue = (v) => v }) {
  const [mounted, setMounted] = useState(false);
  const [hover, setHover] = useState(null);
  const max = Math.max(...data);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div className="flex items-end justify-between gap-3" style={{ height }}>
      {data.map((v, i) => {
        const pct = (v / max) * 100;
        const isHover = hover === i;
        return (
          <div
            key={i}
            className="group flex h-full flex-1 flex-col items-center justify-end"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="relative flex w-full flex-1 items-end justify-center">
              {isHover && (
                <span className="absolute -top-1 -translate-y-full rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-semibold text-white shadow">
                  {formatValue(v)}
                </span>
              )}
              <div
                className="w-full max-w-[26px] rounded-full transition-all duration-700 ease-out"
                style={{
                  height: mounted ? `${pct}%` : "0%",
                  background: isHover
                    ? "linear-gradient(180deg,#FF4D6D,#EF3B5E)"
                    : "linear-gradient(180deg,#7BA0E0,#4267B2)",
                }}
              />
            </div>
            {labels && (
              <span className={`mt-2 text-xs ${isHover ? "font-semibold text-[#4267B2]" : "text-slate-400"}`}>
                {labels[i]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
