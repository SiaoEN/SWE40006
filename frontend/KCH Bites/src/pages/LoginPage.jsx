import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, setAuthToken, setUser, isAdmin } from "../services/auth";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../styles/LoginPage.css";

export default function LoginPage() {
  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.username || !form.password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setError("");
      setLoading(true);

      const data = await loginUser({
        username: form.username.trim(),
        password: form.password,
      });

      setAuthToken(data.token);
      
      // Store user object in localStorage
      if (data.user) {
        setUser(data.user);
      }
      
      // Redirect to admin main if admin, otherwise redirect to user main
      const redirectPath = isAdmin() ? "/admin/main" : "/main";
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Welcome Back" subtitle="Login to your account" isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      
      <div className="login">
        <div className="wrapper">

        {/* LEFT PANEL */}
        <div className="left">
          <div className="food-animation">
            <span>🍜</span>
            <span>🍔</span>
            <span>🍕</span>
            <span>🧋</span>
            <span>🍗</span>
            <span>🍩</span>
            <span>🍱</span>
            <span>🥗</span>
            <span>🍣</span>
            <span>🌮</span>
            <span>🍰</span>
            <span>🥘</span>
          </div>

          <div className="left-content">
            <h1>KCH Bites</h1>
            <p>Find. Eat. Enjoy 🍜</p>
          </div>
        </div>

        {/* FORM */}
        <div className="form-card">
          <h2>Welcome Back</h2>
          <p className="subtitle">Login to your account</p>

          {error && <div className="error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <input
              name="username"
              placeholder="Username"
              type="text"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />

            <button disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
          </form>

          <p className="register-link">
            Don't have an account? <span onClick={() => navigate("/register")}>Register</span>
          </p>
        </div>

        </div>
      </div>
      
      <Footer />
    </>
  );
}