import {
  signInWithPopup,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebaseClient";
import { isAdmin } from "../lib/admins";
import { useRouter } from "next/router";
import { useState } from "react";
import google2 from '../assets/images/google2.png'
import Image from "next/image";
export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");


  // 🔵 Google Login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      redirectUser(result.user);
    } catch (err) {
      alert("Google login failed");
    } finally {
      setLoading(false);
    }
  };

  // 🔐 Email Password Login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      redirectUser(result.user);
    } catch (err) {
      alert("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  // Staff land in the back-office; shoppers go back where they came from.
  const redirectUser = (user) => {
    const next = typeof router.query.next === "string" ? router.query.next : null;
    if (next?.startsWith("/")) return router.push(next);
    router.push(isAdmin(user) ? "/dashboard" : "/");
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-header">
            <Image
              src={google2}
              alt="Google"
               width={45}          // 👈 control width
               height={45}
              className="google-logo"
            />
            <h1>Sign in</h1>
            <p>Continue with your account</p>
          </div>

          <div className="login-body">
            {/* Email Login */}
            <form onSubmit={handleEmailLogin} className="login-form">
              <div className="form-group">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="primary-btn">
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="divider">
              <span>OR</span>
            </div>

            {/* Google Login */}
            <button
              className="google-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <Image src={google2} alt="Google" className="google-logo" />
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

Login.getLayout = (page) => page;
