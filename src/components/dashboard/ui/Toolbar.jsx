import { Search } from "lucide-react";
import { FOCUS } from "../theme";

/** Filter row above a table: pills on the left, search + actions on the right. */
export default function Toolbar({ children, className = "" }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>{children}</div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search", className = "" }) {
  // Full width by default; callers cap it with `sm:max-w-xs` where it shares a row.
  return (
    <div className={`flex h-10 w-full items-center gap-2 rounded-full bg-[#F6F8FC] px-4 ${className}`}>
      <Search className="h-4 w-4 shrink-0 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none ${FOCUS}`}
      />
    </div>
  );
}

// Pill filters intentionally live in SegmentedControl — one pill style only.
