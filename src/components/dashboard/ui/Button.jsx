import Link from "next/link";
import { Loader2 } from "lucide-react";
import { FOCUS } from "../theme";

const VARIANTS = {
  primary:
    "bg-[linear-gradient(150deg,#5B83D6,#4267B2)] text-white shadow-[0_12px_24px_-14px_rgba(66,103,178,0.95)] hover:brightness-110",
  outline:
    "border border-slate-200 bg-white text-slate-600 hover:border-[#4267B2] hover:text-[#4267B2]",
  ghost: "bg-[#F2F6FC] text-slate-500 hover:bg-[#E4ECFA] hover:text-[#4267B2]",
  danger: "bg-rose-600 text-white shadow-[0_12px_24px_-14px_rgba(225,29,72,0.9)] hover:brightness-110",
  softDanger: "bg-rose-50 text-rose-600 hover:bg-rose-100",
  success: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
};

const SIZES = {
  sm: "h-9 gap-1.5 px-3 text-xs",
  md: "h-11 gap-2 px-5 text-sm",
  icon: "h-9 w-9",
  iconLg: "h-11 w-11",
};

/**
 * The one button in the back-office. Renders a Link when `href` is given so
 * navigation and actions share a single look.
 */
export default function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  loading = false,
  href,
  className = "",
  children,
  disabled,
  ...props
}) {
  const classes = [
    "inline-flex shrink-0 items-center justify-center rounded-xl font-semibold transition",
    "disabled:cursor-not-allowed disabled:opacity-50",
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    FOCUS,
    className,
  ].join(" ");

  const iconSize = size === "sm" || size === "icon" ? "h-4 w-4" : "h-[18px] w-[18px]";
  const content = (
    <>
      {loading ? (
        <Loader2 className={`${iconSize} animate-spin`} />
      ) : (
        Icon && <Icon className={iconSize} />
      )}
      {children}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
}
