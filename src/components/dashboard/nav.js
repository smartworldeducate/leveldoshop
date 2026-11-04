import {
  AlertTriangle,
  Bell,
  Boxes,
  FileText,
  Gift,
  Home,
  LayoutDashboard,
  LayoutGrid,
  PieChart,
  Settings,
  ShoppingBag,
  ShoppingBasket,
  ShieldCheck,
  Sprout,
  TicketPercent,
  Undo2,
  Users,
} from "lucide-react";

/**
 * Back-office information architecture — one source of truth for the sidebar,
 * the mobile drawer and the page titles. Grouped so the rail reads as
 * "sell → stock → understand".
 */
export const NAV_SECTIONS = [
  {
    title: "Store",
    items: [
      { id: "overview", label: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { id: "orders", label: "Orders", href: "/dashboard/orders", icon: ShoppingBasket, badge: "pendingOrders" },
      { id: "issues", label: "Delivery problems", href: "/dashboard/issues", icon: AlertTriangle, badge: "openIssues" },
      { id: "returns", label: "Returns", href: "/dashboard/returns", icon: Undo2, badge: "openReturns" },
      { id: "customers", label: "Customers", href: "/dashboard/customers", icon: Users },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { id: "products", label: "Products", href: "/dashboard/products", icon: Sprout },
      { id: "categories", label: "Categories", href: "/dashboard/categories", icon: LayoutGrid },
      { id: "inventory", label: "Inventory", href: "/dashboard/inventory", icon: Boxes, badge: "stockAlerts" },
    ],
  },
  {
    title: "Insights",
    items: [
      { id: "reports", label: "Reports", href: "/dashboard/reports", icon: PieChart },
      { id: "alerts", label: "Alerts", href: "/dashboard/notifications", icon: Bell, badge: "alerts" },
      { id: "posts", label: "Posts", href: "/dashboard/posts", icon: FileText },
    ],
  },
  {
    title: "Storefront",
    items: [
      { id: "coupons", label: "Discount codes", href: "/dashboard/coupons", icon: TicketPercent },
      { id: "couponSales", label: "Sell coupons", href: "/dashboard/coupon-sales", icon: ShoppingBag, badge: "couponsToCheck" },
      { id: "rewards", label: "Reward draw", href: "/dashboard/rewards", icon: Gift },
      { id: "home", label: "Home page", href: "/dashboard/home", icon: Home },
      { id: "pages", label: "Pages & sections", href: "/dashboard/settings", icon: Settings },
    ],
  },
  {
    title: "Access",
    items: [
      // ownerOnly: hidden from added dashboard users — only owners manage access.
      { id: "users", label: "Dashboard users", href: "/dashboard/users", icon: ShieldCheck, ownerOnly: true },
    ],
  },
];

export const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

/** Whether a nav href is active. "/dashboard" must match exactly — it prefixes every other route. */
export function isActiveRoute(href, pathname) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}
