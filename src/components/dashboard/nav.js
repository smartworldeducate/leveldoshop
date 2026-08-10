import {
  Bell,
  Boxes,
  FileText,
  Home,
  LayoutDashboard,
  LayoutGrid,
  PieChart,
  Settings,
  ShoppingBasket,
  Sprout,
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
      { id: "home", label: "Home page", href: "/dashboard/home", icon: Home },
      { id: "pages", label: "Pages & sections", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

export const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

/** Whether a nav href is active. "/dashboard" must match exactly — it prefixes every other route. */
export function isActiveRoute(href, pathname) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}
