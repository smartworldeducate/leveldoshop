import { useEffect, useMemo, useState } from "react";
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
import { isAdmin } from "@/lib/admins";
import { fetchProducts } from "@/redux/products/productsSlice";
import { fetchOrders } from "@/redux/admin/ordersSlice";
import { isCompleted, storeAlerts } from "@/lib/analytics";
import { LOW_STOCK_THRESHOLD } from "@/data/grocery";

const COLLAPSE_KEY = "dashboard:sidebar-collapsed";

function FullScreen({ children }) {
  return (
    <div className="dashboard-shell flex h-screen w-full items-center justify-center bg-[#DAD8EA] p-6 font-sans">
      {children}
    </div>
  );
}

/**
 * The back-office shell: auth gate, data bootstrap and chrome.
 *
 * Every /dashboard page renders inside this, so the guard and the catalogue /
 * order fetches live in exactly one place. Pages just read from the store.
 *
 * @param {string}    title    Header title
 * @param {string}    eyebrow  Small text above the title
 * @param {ReactNode} actions  Buttons rendered in the header
 */
export default function DashboardLayout({ title = "Overview", eyebrow = "Store", actions, children }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, loading } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const products = useSelector((s) => s.products.items);
  const orders = useSelector((s) => s.adminOrders.items);

  const allowed = isAdmin(user);

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

  // One bootstrap for the whole back-office; pages refetch only after writes.
  useEffect(() => {
    if (!allowed) return;
    dispatch(fetchProducts());
    dispatch(fetchOrders());
  }, [allowed, dispatch]);

  const counts = useMemo(() => {
    const pendingOrders = orders.filter((o) => !isCompleted(o)).length;
    const stockAlerts = products.filter(
      (p) => (Number(p.stock) || 0) <= LOW_STOCK_THRESHOLD
    ).length;
    return {
      pendingOrders,
      stockAlerts,
      alerts: storeAlerts(orders, products).length,
    };
  }, [orders, products]);

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
            <span className="font-medium text-slate-600">{user.email}</span> is not on the store
            admin list. Ask an owner to add it, or head back to the shop.
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
    <>
      <Head>
        <title>{`${title} · Leveldo Grocery`}</title>
      </Head>

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
          <main className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-5 sm:p-6">
            <Header
              title={title}
              eyebrow={eyebrow}
              actions={actions}
              user={user}
              onOpenMenu={() => setMobileOpen(true)}
            />
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

/** Dashboard pages opt out of the storefront chrome (header/footer/WhatsApp). */
export const dashboardGetLayout = (page) => page;

/** Convenience link used by empty states that point at another section. */
export const DashboardLink = ({ href, children }) => (
  <Link href={href} className="font-semibold text-[#4267B2] hover:underline">
    {children}
  </Link>
);
