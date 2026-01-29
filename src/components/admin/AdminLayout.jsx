import { useState } from "react";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={`admin-layout ${mobileOpen ? "sidebar-open" : ""}`}>
      <AdminSidebar
        collapsed={collapsed}
        onClose={() => setMobileOpen(false)}
      />

      <div className="admin-content">
        {/* Top bar */}
        <div className="admin-topbar">
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
          >
            <i className="bx bx-menu"></i>
          </button>

          <button
            className="sidebar-toggle mobile"
            onClick={() => setMobileOpen(true)}
          >
            <i className="bx bx-menu"></i>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
