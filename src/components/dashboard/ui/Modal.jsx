import { useEffect } from "react";
import { X } from "lucide-react";
import Button from "./Button";

const SIZES = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
};

/**
 * Dialog used by every create / edit / confirm flow. Closes on Escape and on
 * backdrop click, and locks body scroll while open.
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = "md",
  footer,
  tone = "brand",
  children,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`flex max-h-[90vh] w-full ${SIZES[size] || SIZES.md} flex-col overflow-hidden rounded-[26px] bg-white shadow-[0_50px_100px_-40px_rgba(30,32,51,0.6)]`}
      >
        <div
          className={`flex items-start justify-between gap-4 px-6 py-5 ${
            tone === "danger" ? "bg-rose-50" : "bg-[#F4F7FD]"
          }`}
        >
          <div>
            <h2
              className={`text-lg font-bold ${
                tone === "danger" ? "text-rose-700" : "text-slate-800"
              }`}
            >
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
