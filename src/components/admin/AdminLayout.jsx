import { useState, useContext, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import { AuthContext } from "../../context/AuthContext";
import { useRouter } from "next/router";

export default function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { user, loading } = useContext(AuthContext);
  const router = useRouter();

  const adminEmails = ["salmanalisoftwareenginear@gmail.com"];

  // 🔹 Redirect if user not logged in or not admin
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login"); // not logged in
      } else if (!adminEmails.includes(user.email)) {
        alert("You are not authorized to access admin panel");
        router.push("/"); // not admin
      }
    }
  }, [user, loading, router]);

  if (loading) return <div className="admin-loading">Loading...</div>;
  if (!user || !adminEmails.includes(user.email)) return null;

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
