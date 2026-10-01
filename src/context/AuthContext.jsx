import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebaseClient";
import { canAccessDashboard } from "../lib/admins";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Owner or on the dashboard users list — resolved before `loading` clears.
  const [hasDashboardAccess, setHasDashboardAccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      const access = await canAccessDashboard(currentUser);
      setUser(currentUser);
      setHasDashboardAccess(access);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, hasDashboardAccess }}>
      {children}
    </AuthContext.Provider>
  );
};

// ✅ Add this
export const useAuth = () => useContext(AuthContext);
