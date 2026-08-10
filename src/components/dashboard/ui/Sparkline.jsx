import { useId } from "react";

// Tiny area+line sparkline for metric tiles.
export default function Sparkline({ data, color = "#4267B2", width = 96, height = 34 }) {
  const id = useId();
  const max = Math.max(...data);
  const min = Math.min(...data);
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => [
    i * stepX,
    height - 3 - ((v - min) / (max - min || 1)) * (height - 6),
  ]);
  const line = pts.map((p, i) => `${i ? "L" : "M"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
