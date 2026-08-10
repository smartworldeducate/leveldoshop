import { useId, useState } from "react";

const W = 640;
const H = 240;
const PAD_X = 26;
const TOP = 24;
const BOT = 196;

function smooth(pts) {
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${
      p2.y - (p3.y - p1.y) / 6
    }, ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * Interactive smooth area chart. Hover anywhere to snap the marker to the
 * nearest point and show its value.
 */
export default function AreaChart({ data, labels, color = "#4267B2", formatValue = (v) => v, height = 240 }) {
  const id = useId();
  const [hover, setHover] = useState(null);
  // A single point has no line to draw — mirror it so the curve is still valid.
  const series = data?.length > 1 ? data : [data?.[0] ?? 0, data?.[0] ?? 0];
  const max = Math.max(...series);
  const min = Math.min(...series);
  const step = (W - PAD_X * 2) / (series.length - 1);
  const pts = series.map((v, i) => ({
    x: PAD_X + i * step,
    y: BOT - ((v - min) / (max - min || 1)) * (BOT - TOP),
    v,
  }));
  const line = smooth(pts);
  const area = `${line} L ${pts[pts.length - 1].x} ${BOT} L ${pts[0].x} ${BOT} Z`;
  const active = hover != null ? hover : Math.round((series.length - 1) / 2);
  const ap = pts[active];

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.max(0, Math.min(series.length - 1, Math.round((rel - PAD_X) / step)));
    setHover(idx);
  }

  return (
    <div className="relative select-none" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={ap.x} y1={TOP - 6} x2={ap.x} y2={BOT} stroke={color} strokeOpacity="0.25" strokeWidth="2" strokeDasharray="4 4" />
        <path d={area} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx={ap.x} cy={ap.y} r="7" fill={color} />
        <circle cx={ap.x} cy={ap.y} r="7" fill="none" stroke="#fff" strokeWidth="3" />
      </svg>

      {/* tooltip */}
      <div
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-xl bg-slate-800 px-3 py-1.5 text-center text-white shadow-lg"
        style={{ left: `${(ap.x / W) * 100}%`, top: `calc(${(ap.y / H) * 100}% - 12px)` }}
      >
        <p className="text-sm font-bold leading-none">{formatValue(ap.v)}</p>
        {labels && <p className="mt-0.5 text-[10px] text-white/70">{labels[active]}</p>}
      </div>

      {/* axis */}
      {labels && (
        <div className="mt-2 flex items-center justify-between px-1 text-xs text-slate-400">
          {labels.map((l, i) => {
            // Long ranges (30 days) would collide — thin the ticks but keep the
            // empty slots so every label stays above its own point.
            const every = Math.ceil(labels.length / 8);
            const visible = labels.length <= 8 || i % every === 0 || i === active;
            return (
              <span
                key={`${l}-${i}`}
                className={i === active ? "font-semibold text-[#4267B2]" : ""}
              >
                {visible ? l : ""}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
