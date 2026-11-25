import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (
      !formData.name ||
      !formData.email ||
      !formData.password
    ) {
      setError("Please fill all fields.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/register", formData);

      // Registration successful
      // Redirect user to login page
      navigate("/login");
    } catch (err) {
      console.error("Registration error:", err);

      setError(
        err.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">

        {/* Left Information Section */}
        <div className="login-info">
          <div className="login-brand">
            <div className="sidebar-logo">ST</div>

            <h1>Smart Timetable</h1>
          </div>

          <p>
            Create your account to access the smart
            academic scheduling system.
          </p>

          <ul>
            <li>Smart timetable management</li>
            <li>Academic resource management</li>
            <li>Conflict-aware scheduling</li>
            <li>Easy timetable access</li>
          </ul>
        </div>

        {/* Registration Form */}
        <div className="login-form-section">
          <div className="login-card">

            <div className="login-header">
              <h2>Create Account</h2>

              <p>
                Register as a student to continue.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="page-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {/* Name */}
              <div className="form-group">
                <label>Name</label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                />
              </div>

              {/* Email */}
              <div className="form-group">
                <label>Email</label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                />
              </div>

              {/* Password */}
              <div className="form-group">
                <label>Password</label>

                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                />
              </div>

              {/* Create Account Button */}
              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading
                  ? "Creating account..."
                  : "Create Account"}
              </button>

            </form>

            {/* Login Link */}
            <p
              style={{
                marginTop: "18px",
                textAlign: "center",
              }}
            >
              Already have an account?{" "}

              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{
                  border: "none",
                  background: "none",
                  color: "#3157d5",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Login
              </button>
            </p>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Register;