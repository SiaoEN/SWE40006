import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, registerUser, setAuthToken } from "../services/auth";
import "../styles/RegisterPage.css";

export default function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.username || !form.password || !form.confirmPassword) {
      setError("Please fill in all required fields");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setError("");
      setLoading(true);

      await registerUser({
        username: form.username.trim(),
        password: form.password,
      });

      const loginResponse = await loginUser({
        username: form.username.trim(),
        password: form.password,
      });

      setAuthToken(loginResponse.token);
      navigate("/main", { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register">

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
          <h2>Create Account</h2>
          <p className="subtitle">Join and discover amazing food</p>

          {error && <div className="error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <input
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
            />
            <input
              name="email"
              placeholder="Email Address"
              type="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
            />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />

            <button disabled={loading}>{loading ? "Creating..." : "Create Account"}</button>
          </form>

          <p className="login-link">
            Already have an account? <span onClick={() => navigate("/login")}>Login</span>
          </p>
        </div>

      </div>
    </div>
  );
}