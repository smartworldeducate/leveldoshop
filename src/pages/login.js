import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebaseClient";
import { useRouter } from "next/router";
import { useState } from "react";

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // ✅ Define admin emails
  const adminEmails = ["salmanalisoftwareenginear@gmail.com"];

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      console.log("Logged-in user:", user);

      // ✅ Redirect based on role
      if (adminEmails.includes(user.email)) {
        router.push("/admin/orders");
      } else {
        router.push("/"); // customer dashboard/profile page
      }

      // Optional: you can also save users to Firestore here if needed

    } catch (err) {
      console.error("Login error:", err);
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-header">
            <h1>Sign In / Sign Up</h1>
            <p>Use your Google account to continue</p>
          </div>

          <div className="login-body">
            <button
              className="google-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in with Google"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
Login.getLayout = function getLayout(page) {
  return page;
};