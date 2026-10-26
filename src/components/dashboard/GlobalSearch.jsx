import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { ArrowRight, CornerDownLeft, Search, SearchX, X } from "lucide-react";

import Badge from "./ui/Badge";
import { FOCUS } from "./theme";
import { NAV_ITEMS } from "./nav";
import { isAdmin } from "@/lib/admins";
import { customersFromOrders, isCompleted, orderTotal, timeAgo, orderDate } from "@/lib/analytics";
import { categoryLabel, formatMoney, stockState } from "@/data/grocery";

const LIMITS = { pages: 3, products: 5, orders: 4, customers: 4 };

const shortId = (id) => `#${String(id).slice(0, 6).toUpperCase()}`;

/**
 * Score how well `fields` match every word of the term (0 = no match).
 * All words must appear somewhere; a field that *starts* with the whole term
 * ranks above a word-start match, which ranks above a plain substring.
 */
function score(term, fields) {
  const hay = fields.filter(Boolean).map((f) => String(f).toLowerCase());
  if (!hay.length) return 0;
  const words = term.split(/\s+/).filter(Boolean);
  if (!words.every((w) => hay.some((h) => h.includes(w)))) return 0;
  if (hay.some((h) => h === term)) return 4;
  if (hay.some((h) => h.startsWith(term))) return 3;
  if (hay.some((h) => h.split(/[\s@._-]+/).some((part) => part.startsWith(words[0])))) return 2;
  return 1;
}

function rank(items, term, fieldsOf, limit) {
  const matched = items
    .map((item) => ({ item, s: score(term, fieldsOf(item)) }))
    .filter((m) => m.s > 0)
    .sort((a, b) => b.s - a.s);
  return { total: matched.length, items: matched.slice(0, limit).map((m) => m.item) };
}

/** Wraps the parts of `text` that match a search word in a highlight. */
function Highlight({ text, term }) {
  const value = String(text ?? "");
  const words = term.split(/\s+/).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length || !value) return value;
  const parts = value.split(new RegExp(`(${words.join("|")})`, "gi"));
  return parts.map((part, i) =>
    i % 2 ? (
      <mark key={i} className="rounded bg-[#E4ECFA] px-0.5 text-[#2F4D8A]">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

/**
 * Header search for the whole back-office: products, orders, customers and
 * dashboard pages, with live results, keyboard navigation and a "/" or
 * Ctrl/⌘+K shortcut. Enter with nothing highlighted still hands the term to
 * the Products page, as the old box did.
 */
export default function GlobalSearch({ user }) {
  const router = useRouter();
  const products = useSelector((s) => s.products.items);
  const categories = useSelector((s) => s.categories.items);
  const orders = useSelector((s) => s.adminOrders.items);

  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState(0);

  const inputRef = useRef(null);
  const mobileInputRef = useRef(null);
  const boxRef = useRef(null);

  const owner = isAdmin(user);
  const q = term.trim().toLowerCase().replace(/^#/, "");

  const customers = useMemo(() => customersFromOrders(orders), [orders]);

  const groups = useMemo(() => {
    if (!q) return [];
    const pages = rank(
      NAV_ITEMS.filter((n) => !n.ownerOnly || owner),
      q,
      (n) => [n.label, n.id],
      LIMITS.pages
    );
    const prods = rank(
      products,
      q,
      (p) => [p.title, p.brand, p.slug, categoryLabel(categories, p.categorySlug)],
      LIMITS.products
    );
    const ords = rank(
      orders,
      q,
      (o) => [o.id, o.user?.name, o.user?.email, o.user?.phone, o.user?.city],
      LIMITS.orders
    );
    const custs = rank(customers, q, (c) => [c.name, c.email, c.phone, c.city], LIMITS.customers);

    const seeAll = (pathname, total, noun) =>
      total > 0 && {
        key: `all-${pathname}`,
        kind: "all",
        label: `See all ${total} ${noun}${total === 1 ? "" : "s"}`,
        href: { pathname, query: { q: term.trim() } },
      };

    return [
      {
        title: "Pages",
        rows: pages.items.map((n) => ({ key: `page-${n.id}`, kind: "page", item: n, href: n.href })),
      },
      {
        title: "Products",
        rows: [
          ...prods.items.map((p) => ({
            key: `product-${p.id}`,
            kind: "product",
            item: p,
            href: { pathname: "/dashboard/products", query: { form: p.id } },
          })),
          prods.total > LIMITS.products && seeAll("/dashboard/products", prods.total, "product"),
        ].filter(Boolean),
      },
      {
        title: "Orders",
        rows: [
          ...ords.items.map((o) => ({
            key: `order-${o.id}`,
            kind: "order",
            item: o,
            href: { pathname: "/dashboard/orders", query: { q: o.id } },
          })),
          ords.total > LIMITS.orders && seeAll("/dashboard/orders", ords.total, "order"),
        ].filter(Boolean),
      },
      {
        title: "Customers",
        rows: [
          ...custs.items.map((c) => ({
            key: `customer-${c.email}`,
            kind: "customer",
            item: c,
            href: { pathname: "/dashboard/customers", query: { q: c.email } },
          })),
          custs.total > LIMITS.customers && seeAll("/dashboard/customers", custs.total, "customer"),
        ].filter(Boolean),
      },
    ].filter((g) => g.rows.length);
  }, [q, term, products, categories, orders, customers, owner]);

  const flat = useMemo(() => groups.flatMap((g) => g.rows), [groups]);

  useEffect(() => setActive(0), [q]);

  // "/" or Ctrl/⌘+K focuses the search from anywhere in the dashboard.
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
      const combo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (combo || (e.key === "/" && !typing)) {
        e.preventDefault();
        if (window.matchMedia("(min-width: 768px)").matches) inputRef.current?.focus();
        else setMobileOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close the dropdown on a click outside it.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (mobileOpen) setTimeout(() => mobileInputRef.current?.focus(), 0);
  }, [mobileOpen]);

  const reset = () => {
    setTerm("");
    setOpen(false);
    setMobileOpen(false);
    inputRef.current?.blur();
  };

  const go = (href) => {
    router.push(href);
    reset();
  };

  const submit = () => {
    if (flat[active]) return go(flat[active].href);
    // Nothing matched (or nothing typed): fall back to the Products page, which
    // also clears a previous search when the term is empty.
    const t = term.trim();
    go(t ? `/dashboard/products?q=${encodeURIComponent(t)}` : "/dashboard/products");
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (flat.length ? (i + 1) % flat.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (term) setTerm("");
      else reset();
    }
  };

  const results = (
    <div className="max-h-[min(70vh,520px)] overflow-y-auto py-2" role="listbox" id="dashboard-search-results">
      {groups.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2F6FC] text-[#4267B2]">
            <SearchX className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-700">No matches for “{term.trim()}”</p>
          <p className="mt-1 text-xs text-slate-400">Try a product name, order number, email or phone.</p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.title} className="px-2 pb-1">
            <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              {group.title}
            </p>
            {group.rows.map((row) => {
              const index = flat.indexOf(row);
              return (
                <ResultRow
                  key={row.key}
                  row={row}
                  term={q}
                  categories={categories}
                  selected={index === active}
                  onHover={() => setActive(index)}
                  onSelect={() => go(row.href)}
                />
              );
            })}
          </div>
        ))
      )}
    </div>
  );

  const footer = (
    <div className="hidden items-center gap-4 border-t border-slate-100 bg-[#FBFCFE] px-4 py-2.5 text-[11px] text-slate-400 md:flex">
      <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> to move</span>
      <span className="flex items-center gap-1"><Kbd><CornerDownLeft className="h-3 w-3" /></Kbd> to open</span>
      <span className="flex items-center gap-1"><Kbd>Esc</Kbd> to close</span>
    </div>
  );

  return (
    <>
      {/* desktop: inline box with a dropdown */}
      <div ref={boxRef} className="relative hidden md:block">
        <div
          className={`flex h-11 w-64 items-center gap-2 rounded-full bg-white px-4 shadow-[0_8px_24px_-12px_rgba(80,70,150,0.35)] transition-[width,box-shadow] lg:w-72 xl:w-80 ${
            open ? "ring-2 ring-[#4267B2]/30" : ""
          }`}
        >
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search products, orders, customers…"
            aria-label="Search the dashboard"
            role="combobox"
            aria-expanded={open && Boolean(q)}
            aria-controls="dashboard-search-results"
            className={`w-full bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none ${FOCUS}`}
          />
          {term ? (
            <button
              type="button"
              onClick={() => {
                setTerm("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Kbd>/</Kbd>
          )}
        </div>

        {open && q && (
          <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[420px] overflow-hidden rounded-[22px] bg-white shadow-[0_30px_70px_-30px_rgba(30,32,51,0.55)] ring-1 ring-slate-100">
            {results}
            {footer}
          </div>
        )}
      </div>

      {/* mobile: icon that opens a full-width sheet */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Search the dashboard"
        className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-[0_8px_24px_-12px_rgba(80,70,150,0.35)] md:hidden ${FOCUS}`}
      >
        <Search className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 p-3 backdrop-blur-sm md:hidden"
          onMouseDown={(e) => e.target === e.currentTarget && reset()}
        >
          <div className="overflow-hidden rounded-[22px] bg-white shadow-xl">
            <div className="flex h-14 items-center gap-2 border-b border-slate-100 px-4">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                ref={mobileInputRef}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search products, orders, customers…"
                aria-label="Search the dashboard"
                className="w-full bg-transparent text-base text-slate-600 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={reset}
                aria-label="Close search"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {q ? (
              results
            ) : (
              <p className="px-4 py-6 text-center text-sm text-slate-400">
                Search by product, order number, customer name, email or phone.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Kbd({ children }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-1 font-sans text-[10px] font-semibold text-slate-400">
      {children}
    </kbd>
  );
}

function ResultRow({ row, term, categories, selected, onHover, onSelect }) {
  const base = `flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition ${
    selected ? "bg-[#F2F6FC]" : ""
  }`;
  const props = {
    type: "button",
    role: "option",
    "aria-selected": selected,
    onMouseEnter: onHover,
    onMouseDown: (e) => e.preventDefault(), // keep focus in the input
    onClick: onSelect,
    className: base,
  };

  if (row.kind === "all") {
    return (
      <button {...props}>
        <span className="flex-1 text-sm font-semibold text-[#4267B2]">{row.label}</span>
        <ArrowRight className="h-4 w-4 text-[#4267B2]" />
      </button>
    );
  }

  if (row.kind === "page") {
    const Icon = row.item.icon;
    return (
      <button {...props}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E4ECFA] text-[#4267B2]">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">
          <Highlight text={row.item.label} term={term} />
        </span>
        {selected && <ArrowRight className="h-4 w-4 text-slate-300" />}
      </button>
    );
  }

  if (row.kind === "product") {
    const p = row.item;
    const stock = stockState(p.stock);
    return (
      <button {...props}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.images?.[0] || "/placeholder.png"} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-700">
            <Highlight text={p.title} term={term} />
          </span>
          <span className="block truncate text-xs text-slate-400">
            {p.brand ? <><Highlight text={p.brand} term={term} /> · </> : null}
            {categoryLabel(categories, p.categorySlug)} · {formatMoney(p.price)}
          </span>
        </span>
        <Badge tone={stock.tone}>
          {stock.key === "ok" ? `${Number(p.stock) || 0} in stock` : stock.key === "low" ? "Low" : "Out"}
        </Badge>
      </button>
    );
  }

  if (row.kind === "order") {
    const o = row.item;
    const done = isCompleted(o);
    return (
      <button {...props}>
        <span className="flex h-9 shrink-0 items-center justify-center rounded-xl bg-[#F6F8FC] px-2 font-mono text-[11px] font-bold text-slate-500">
          <Highlight text={shortId(o.id)} term={term} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-700">
            <Highlight text={o.user?.name || "Guest"} term={term} />
          </span>
          <span className="block truncate text-xs text-slate-400">
            {formatMoney(orderTotal(o))} · {timeAgo(orderDate(o))}
            {o.user?.city ? <> · <Highlight text={o.user.city} term={term} /></> : null}
          </span>
        </span>
        <Badge tone={done ? "success" : "warning"}>
          {done ? "Completed" : "Pending"}
        </Badge>
      </button>
    );
  }

  // customer
  const c = row.item;
  return (
    <button {...props}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E4ECFA] text-[11px] font-bold text-[#4267B2]">
        {c.name
          .split(/\s+/)
          .map((w) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase() || "?"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-700">
          <Highlight text={c.name} term={term} />
        </span>
        <span className="block truncate text-xs text-slate-400">
          <Highlight text={c.email} term={term} />
          {c.phone ? <> · <Highlight text={c.phone} term={term} /></> : null}
        </span>
      </span>
      <span className="shrink-0 text-xs font-semibold text-slate-400">
        {c.orders} {c.orders === 1 ? "order" : "orders"}
      </span>
    </button>
  );
}
