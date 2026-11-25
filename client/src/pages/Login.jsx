import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", formData);

      const { token, user } = response.data;

        login(user, token);

        if (["ADMIN", "HOD", "COORDINATOR"].includes(user.role)) {
          navigate("/dashboard");
        } else if (user.role === "FACULTY") {
          navigate("/faculty-dashboard");
        } else if (user.role === "STUDENT") {
          navigate("/student-dashboard");
        }
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Login failed. Please check your email and password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-container">

        {/* Left Section */}
        <div className="login-info">

          <div className="brand">
            <div className="brand-icon">ST</div>

            <span>
              Smart Timetable
            </span>
          </div>

          <div className="login-info-content">

            <p className="small-heading">
              SMART ACADEMIC SCHEDULING
            </p>

            <h1>
              Plan smarter.
              <br />
              Schedule better.
            </h1>

            <p>
              Generate optimized academic timetables
              while managing faculty, classrooms,
              laboratories and academic constraints.
            </p>

          </div>

          <div className="login-features">

            <div className="feature">
              <span>✓</span>
              <p>Automated timetable generation</p>
            </div>

            <div className="feature">
              <span>✓</span>
              <p>Faculty and room conflict detection</p>
            </div>

            <div className="feature">
              <span>✓</span>
              <p>Flexible academic scheduling</p>
            </div>

          </div>

        </div>

        {/* Right Section */}
        <div className="login-form-section">

          <div className="login-card">

            <div className="login-header">

              <h2>
                Welcome back
              </h2>

              <p>
                Sign in to manage your academic schedules.
              </p>

            </div>

            <form onSubmit={handleSubmit}>

              <div className="form-group">

                <label htmlFor="email">
                  Email Address
                </label>

                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />

              </div>

              <div className="form-group">

                <label htmlFor="password">
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />

              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <button
                className="login-button"
                type="submit"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>

              {/* One-Click Quick Role Logins */}
              <div style={{ marginTop: "18px", padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "8px", textAlign: "center" }}>
                  Quick Demo Access (Multi-Role):
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setFormData({ email: "admin@smarttimetable.com", password: "Admin@123" })}
                    style={{ fontSize: "11px", fontWeight: "700", padding: "6px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: "6px", cursor: "pointer" }}
                  >
                    👑 Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ email: "hod.cse@dacoe.ac.in", password: "hod123" })}
                    style={{ fontSize: "11px", fontWeight: "700", padding: "6px", background: "#fdf2f8", color: "#9d174d", border: "1px solid #fbcfe8", borderRadius: "6px", cursor: "pointer" }}
                  >
                    🏛️ HOD
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ email: "coordinator.cse@dacoe.ac.in", password: "coordinator123" })}
                    style={{ fontSize: "11px", fontWeight: "700", padding: "6px", background: "#f5f3ff", color: "#5b21b6", border: "1px solid #ddd6fe", borderRadius: "6px", cursor: "pointer" }}
                  >
                    📋 Coord
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setFormData({ email: "ahrenushe@dacoe.ac.in", password: "faculty123" })}
                    style={{ fontSize: "11px", fontWeight: "700", padding: "6px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: "6px", cursor: "pointer" }}
                  >
                    👨‍🏫 Faculty (HOD Profile)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ email: "student.sem3.s1@dacoe.ac.in", password: "student123" })}
                    style={{ fontSize: "11px", fontWeight: "700", padding: "6px", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: "6px", cursor: "pointer" }}
                  >
                    🎓 Student (Sem 3, S1)
                  </button>
                </div>
              </div>

            </form>

            <p style={{ marginTop: "18px", textAlign: "center" }}>
            Don't have an account?{" "}
            <Link
                to="/register"
                style={{
                color: "#3157d5",
                textDecoration: "none",
                fontWeight: "600",
                }}
            >
                Register
            </Link>
            </p>

            <p className="login-footer">
              AI-Based Smart Timetable Generation System
            </p>

          </div>

        </div>

      </div>

    </div>
  );
};

export default Login;