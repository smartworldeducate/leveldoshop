import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import Button from "./Button";
import { tone as toneOf } from "../theme";

/**
 * The confirmation dialog for destructive actions.
 *
 * Every delete in the back-office uses this one component, so the question is
 * always asked the same way: what is being removed (with a preview so there is
 * no doubt), what follows from it, and whether it can be undone.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  loading = false,
  tone = "danger",
  icon: Icon = AlertTriangle,
  title,
  description,
  preview,
  consequences = [],
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  irreversible = true,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && !loading && onClose?.();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose, loading]);

  if (!open) return null;

  const t = toneOf(tone);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && !loading && onClose?.()}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md overflow-hidden rounded-[26px] bg-white shadow-[0_50px_100px_-40px_rgba(30,32,51,0.65)]">
        <div className="relative px-6 pb-5 pt-7 text-center">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition hover:bg-slate-100 hover:text-slate-500"
          >
            <X className="h-4 w-4" />
          </button>

          <span
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${t.bg} ${t.text}`}
          >
            <Icon className="h-7 w-7" />
          </span>

          <h2 className="mt-4 text-lg font-bold text-slate-800">{title}</h2>
          {description && (
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">
              {description}
            </p>
          )}
        </div>

        {/* what exactly is going */}
        {preview && (
          <div className="mx-6 flex items-center gap-3 rounded-2xl bg-[#F6F8FC] p-3">
            {preview.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.image}
                alt=""
                className="h-11 w-11 shrink-0 rounded-xl object-cover"
              />
            ) : (
              preview.swatch && (
                <span
                  className="h-11 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: preview.swatch }}
                />
              )
            )}
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate font-semibold text-slate-800">{preview.title}</p>
              {preview.meta && <p className="truncate text-xs text-slate-400">{preview.meta}</p>}
            </div>
          </div>
        )}

        {/* knock-on effects */}
        {consequences.length > 0 && (
          <ul className="mx-6 mt-3 flex flex-col gap-2">
            {consequences.map((line, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-500">
                {/* Tinted from the tone hex — a `bg-rose-50` dot was invisible. */}
                <span
                  className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: t.hex }}
                />
                {line}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 bg-[#FBFCFE] px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading} className="sm:min-w-[110px]">
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
            className="sm:min-w-[150px]"
          >
            {confirmLabel}
          </Button>
        </div>

        {irreversible && (
          <p className="pb-4 text-center text-[11px] text-slate-400">This cannot be undone.</p>
        )}
      </div>
    </div>
  );
}
