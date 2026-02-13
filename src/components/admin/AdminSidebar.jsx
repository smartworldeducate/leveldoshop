import Link from "next/link";
import { useRouter } from "next/router";

const menu = [
  { label: "Add Product", path: "/admin/add-product", icon: "bx bx-plus-circle" },
  { label: "Orders", path: "/admin/orders", icon: "bx bx-receipt" },
  { label: "Posts", path: "/admin/posts", icon: "bx bx-file" },
];

export default function AdminSidebar({ collapsed, onClose }) {
  const router = useRouter();

  return (
    <aside className={`admin-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="admin-sidebar__logo">
        <span>Admin</span>

        {/* Mobile close button */}
        <button className="sidebar-close" onClick={onClose}>
          <i className="bx bx-x"></i>
        </button>
      </div>

      <nav className="admin-sidebar__menu">
        {menu.map(item => (
          <Link
            key={item.path}
            href={item.path}
            className={`admin-sidebar__item ${
              router.pathname === item.path ? "active" : ""
            }`}
          >
            <i className={item.icon}></i>
            <span className="label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
