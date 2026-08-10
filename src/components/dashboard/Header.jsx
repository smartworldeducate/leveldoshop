import { useState } from "react";
import { useRouter } from "next/router";
import { ExternalLink, Menu, Search } from "lucide-react";
import { FOCUS } from "./theme";
import { initialsOf } from "@/lib/admins";

/**
 * Page header. The search box is a jump-to-catalogue box: submitting hands the
 * term to the Products page, which owns the actual filtering.
 */
export default function Header({ title, eyebrow, actions, user, onOpenMenu }) {
  const router = useRouter();
  const [term, setTerm] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!term.trim()) return;
    router.push(`/dashboard/products?q=${encodeURIComponent(term.trim())}`);
    setTerm("");
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onOpenMenu}
          aria-label="Open menu"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-[0_8px_24px_-12px_rgba(80,70,150,0.35)] lg:hidden ${FOCUS}`}
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">{eyebrow}</p>
          <h1 className="truncate text-2xl font-bold tracking-tight text-slate-800">{title}</h1>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        <form
          onSubmit={submit}
          className="hidden h-11 w-64 items-center gap-2 rounded-full bg-white px-4 shadow-[0_8px_24px_-12px_rgba(80,70,150,0.35)] md:flex"
        >
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search products"
            className={`w-full bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none ${FOCUS}`}
          />
        </form>

        {actions}

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          title="Open storefront"
          className={`hidden h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-[0_8px_24px_-12px_rgba(80,70,150,0.35)] transition hover:text-[#4267B2] sm:flex ${FOCUS}`}
        >
          <ExternalLink className="h-4 w-4" />
        </a>

        <span
          title={user?.displayName || user?.email}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(150deg,#5B83D6,#4267B2)] text-sm font-bold text-white shadow-[0_10px_24px_-12px_rgba(66,103,178,0.9)] ring-4 ring-white"
        >
          {initialsOf(user)}
        </span>
      </div>
    </header>
  );
}
