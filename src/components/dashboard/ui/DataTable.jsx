import { useMemo, useState } from "react";
import { ArrowUpDown, Loader2 } from "lucide-react";
import EmptyState from "./EmptyState";

/**
 * The table every list page renders. Columns are declarative:
 *
 *   { key, label, align, sortable, sortValue(row), render(row), width }
 *
 * Sorting is handled here, so no page reimplements it. Rows can expand with
 * `renderExpanded` — used by Orders for the shipping / line-item detail.
 */
export default function DataTable({
  columns,
  rows,
  rowKey = (row) => row.id,
  loading = false,
  empty,
  onRowClick,
  expandedKey = null,
  renderExpanded,
  minWidth = 760,
}) {
  const [sort, setSort] = useState(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return rows;
    const value = column.sortValue || ((row) => row[column.key]);
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (typeof av === "string" || typeof bv === "string") {
        return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
      }
      return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
    });
  }, [rows, sort, columns]);

  const toggleSort = (key) =>
    setSort((s) =>
      s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!sorted.length) return empty || <EmptyState />;

  const align = (a) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");

  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <table className="w-full border-collapse text-left" style={{ minWidth }}>
        <thead>
          <tr className="text-xs uppercase tracking-wide text-slate-400">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`pb-3 font-medium ${align(c.align)}`}
                style={c.width ? { width: c.width } : undefined}
              >
                {c.sortable ? (
                  <button
                    onClick={() => toggleSort(c.key)}
                    className={`inline-flex items-center gap-1 transition hover:text-slate-600 ${
                      c.align === "right" ? "flex-row-reverse" : ""
                    }`}
                  >
                    {c.label}
                    <ArrowUpDown
                      className={`h-3 w-3 ${
                        sort?.key === c.key ? "text-[#4267B2]" : "text-slate-300"
                      }`}
                    />
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="text-sm">
          {sorted.map((row) => {
            const key = rowKey(row);
            const isExpanded = expandedKey != null && expandedKey === key;
            return [
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-t border-slate-100 transition hover:bg-slate-50/80 ${
                  onRowClick ? "cursor-pointer" : ""
                } ${isExpanded ? "bg-slate-50/80" : ""}`}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`py-4 pr-3 align-middle ${align(c.align)} ${c.className || ""}`}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>,
              isExpanded && renderExpanded ? (
                <tr key={`${key}-detail`} className="bg-slate-50/80">
                  <td colSpan={columns.length} className="px-1 pb-5">
                    {renderExpanded(row)}
                  </td>
                </tr>
              ) : null,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
