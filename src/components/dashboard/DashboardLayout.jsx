import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { signOut } from "firebase/auth";
import { Loader2, ShieldAlert } from "lucide-react";

import Sidebar from "./Sidebar";
import Header from "./Header";
import Button from "./ui/Button";
import { auth } from "@/lib/firebaseClient";
import { useAuth } from "@/context/AuthContext";
import { fetchProducts } from "@/redux/products/productsSlice";
import { fetchOrders } from "@/redux/admin/ordersSlice";
import { fetchPurchases } from "@/redux/couponSales/couponSalesSlice";
import { storeAlerts } from "@/lib/analytics";
import { LOW_STOCK_THRESHOLD } from "@/data/grocery";
import { allReturns, isOpenReturn } from "@/data/returns";
import { allIssues, isOpenOrder } from "@/data/fulfilment";

const COLLAPSE_KEY = "dashboard:sidebar-collapsed";

function FullScreen({ children }) {
  return (
    <div className="dashboard-shell flex h-screen w-full items-center justify-center bg-[#DAD8EA] p-6 font-sans">
      {children}
    </div>
  );
}

const ShellContext = createContext({});

/**
 * The back-office shell: auth gate, data bootstrap and chrome.
 *
 * It wraps every /dashboard page from `getLayout`, so it stays mounted while
 * moving between them: only the page inside changes, and the sidebar keeps its
 * scroll position. The guard and the catalogue / order fetches live in exactly
 * one place. Pages just read from the store.
 */
export function DashboardShell({ children }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, loading, hasDashboardAccess } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef(null);
  const path = router.asPath.split("?")[0];

  const products = useSelector((s) => s.products.items);
  const orders = useSelector((s) => s.adminOrders.items);
  const purchases = useSelector((s) => s.couponSales.purchases);

  const allowed = hasDashboardAccess;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  useEffect(() => {
    // Remember where they were headed so login can send them straight back.
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(router.asPath)}`);
    }
  }, [user, loading, router]);

  // One bootstrap for the whole back-office, repeated on each page so new
  // orders and payments show up. It happens quietly behind what's on screen.
  useEffect(() => {
    if (!allowed) return;
    dispatch(fetchProducts());
    dispatch(fetchOrders());
    dispatch(fetchPurchases());
  }, [allowed, dispatch, router.pathname]);

  // The content pane outlives each page, so a new page has to start at the top.
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [path]);

  const counts = useMemo(() => {
    const pendingOrders = orders.filter(isOpenOrder).length;
    const stockAlerts = products.filter(
      (p) => (Number(p.stock) || 0) <= LOW_STOCK_THRESHOLD
    ).length;
    return {
      pendingOrders,
      stockAlerts,
      alerts: storeAlerts(orders, products).length,
      openReturns: allReturns(orders).filter(isOpenReturn).length,
      openIssues: allIssues(orders).filter((i) => i.status === "open").length,
      couponsToCheck: purchases.filter((p) => p.status === "pending").length,
    };
  }, [orders, products, purchases]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      }
      return next;
    });
  };

  const logout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (loading || !user) {
    return (
      <FullScreen>
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-7 w-7 animate-spin text-[#4267B2]" />
          <p className="text-sm font-medium">Checking your access…</p>
        </div>
      </FullScreen>
    );
  }

  if (!allowed) {
    return (
      <FullScreen>
        <div className="max-w-md rounded-[26px] bg-white p-8 text-center shadow-[0_30px_70px_-40px_rgba(80,70,150,0.7)]">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <ShieldAlert className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-slate-800">Staff access only</h1>
          <p className="mt-2 text-sm text-slate-500">
            <span className="font-medium text-slate-600">{user.email}</span> is not on the
            dashboard users list. Ask an owner to add it, or head back to the shop.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button href="/" variant="outline" size="sm">
              Back to store
            </Button>
            <Button size="sm" onClick={logout}>
              Switch account
            </Button>
          </div>
        </div>
      </FullScreen>
    );
  }

  return (
    <ShellContext.Provider value={{ user, openMenu: () => setMobileOpen(true) }}>
      <div className="dashboard-shell flex h-screen w-full gap-4 bg-[#DAD8EA] p-4 font-sans">
        <Sidebar
          user={user}
          counts={counts}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          onLogout={logout}
        />

        <div className="flex min-w-0 flex-1 overflow-hidden rounded-[32px] bg-[#F4F3FA] shadow-[0_40px_90px_-45px_rgba(80,70,150,0.55)]">
          <main ref={mainRef} className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-5 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </ShellContext.Provider>
  );
}

/**
 * One page's part of the shell: its browser title and header.
 *
 * @param {string}    title    Header title
 * @param {string}    eyebrow  Small text above the title
 * @param {ReactNode} actions  Buttons rendered in the header
 */
export default function DashboardLayout({ title = "Overview", eyebrow = "Store", actions, children }) {
  const { user, openMenu } = useContext(ShellContext);

  return (
    <>
      <Head>
        <title>{`${title} · A-one Grocery`}</title>
      </Head>
      <Header title={title} eyebrow={eyebrow} actions={actions} user={user} onOpenMenu={openMenu} />
      {children}
    </>
  );
}

/** Dashboard pages swap the storefront chrome (header/footer/WhatsApp) for the shell. */
export const dashboardGetLayout = (page) => <DashboardShell>{page}</DashboardShell>;

/** Convenience link used by empty states that point at another section. */
export const DashboardLink = ({ href, children }) => (
  <Link href={href} className="font-semibold text-[#4267B2] hover:underline">
    {children}
  </Link>
);
