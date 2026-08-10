import Link from "next/link";
import { useRouter } from "next/router";
import { ChevronLeft, LogOut, Store, X } from "lucide-react";
import { NAV_SECTIONS, isActiveRoute } from "./nav";
import { CountBadge } from "./ui/Badge";
import { FOCUS } from "./theme";
import { initialsOf } from "@/lib/admins";

function NavLink({ item, active, collapsed, count, onNavigate }) {
  const { icon: Icon, href, label } = item;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-label={label}
      title={collapsed ? label : undefined}
      className={`group relative flex h-11 items-center rounded-2xl transition ${FOCUS} ${
        collapsed ? "w-11 justify-center" : "gap-3 px-3"
      } ${active ? "bg-white text-[#4267B2] shadow-md" : "text-white/70 hover:bg-white/15 hover:text-white"}`}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.4 : 2} />
      {!collapsed && <span className="flex-1 truncate text-sm font-semibold">{label}</span>}
      {!collapsed && count > 0 && <CountBadge value={count} tone={active ? "danger" : "neutral"} />}

      {/* tooltip, collapsed rail only */}
      {collapsed && (
        <span className="pointer-events-none absolute left-full z-20 ml-3 flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#2F4D8A] px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
          {label}
          {count > 0 && <CountBadge value={count} tone="danger" />}
        </span>
      )}
    </Link>
  );
}

/**
 * The back-office rail. Same component on every breakpoint: a fixed column on
 * desktop (collapsible to icons) and a slide-in drawer under lg.
 */
export default function Sidebar({
  user,
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
  onLogout,
  counts = {},
}) {
  const { pathname } = useRouter();

  return (
    <>
      {/* mobile scrim */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-4 left-4 z-50 flex shrink-0 flex-col rounded-[28px] bg-[linear-gradient(180deg,#5B83D6_0%,#35528F_100%)] px-3 py-5 shadow-[0_18px_40px_-12px_rgba(66,103,178,0.6)] transition-all duration-300 lg:static lg:inset-auto lg:translate-x-0 ${
          collapsed ? "lg:w-[76px]" : "lg:w-[252px]"
        } ${mobileOpen ? "w-[252px] translate-x-0" : "-translate-x-[120%] w-[252px]"}`}
      >
        {/* brand */}
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3 px-1"}`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
            <Store className="h-5 w-5" />
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">Leveldo Grocery</p>
              <p className="truncate text-[11px] text-white/60">Back office</p>
            </div>
          )}
          <button
            onClick={onCloseMobile}
            aria-label="Close menu"
            className={`flex h-9 w-9 items-center justify-center rounded-xl text-white/70 hover:bg-white/15 lg:hidden ${FOCUS}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* sections */}
        <nav className="mt-6 flex flex-1 flex-col gap-5 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="flex flex-col gap-1.5">
              {!collapsed && (
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                  {section.title}
                </p>
              )}
              <div className={`flex flex-col gap-1.5 ${collapsed ? "items-center" : ""}`}>
                {section.items.map((item) => (
                  <NavLink
                    key={item.id}
                    item={item}
                    collapsed={collapsed}
                    count={counts[item.badge] || 0}
                    active={isActiveRoute(item.href, pathname)}
                    onNavigate={onCloseMobile}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* footer */}
        <div className="mt-4 flex flex-col gap-2 border-t border-white/15 pt-4">
          {!collapsed && user && (
            <div className="flex items-center gap-2.5 px-1">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
                {initialsOf(user)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">
                  {user.displayName || "Store admin"}
                </p>
                <p className="truncate text-[11px] text-white/50">{user.email}</p>
              </div>
            </div>
          )}

          <div className={`flex gap-2 ${collapsed ? "flex-col items-center" : ""}`}>
            <button
              onClick={onLogout}
              title="Log out"
              className={`flex h-10 items-center justify-center gap-2 rounded-2xl bg-white/15 text-sm font-semibold text-white transition hover:bg-white/25 ${FOCUS} ${
                collapsed ? "w-10" : "flex-1"
              }`}
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && "Log out"}
            </button>

            <button
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand" : "Collapse"}
              className={`hidden h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white transition hover:bg-white/25 lg:flex ${FOCUS}`}
            >
              <ChevronLeft className={`h-4 w-4 transition ${collapsed ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
