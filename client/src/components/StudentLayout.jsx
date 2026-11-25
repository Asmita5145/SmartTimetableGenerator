import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const StudentLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="admin-layout">

      {/* Sidebar */}
      <aside className="sidebar">

        <div className="sidebar-brand">
          <div className="sidebar-logo">
            ST
          </div>

          <div>
            <h2>Smart Timetable</h2>
            <span>Student Portal</span>
          </div>
        </div>

        <nav className="sidebar-nav">

          <NavLink
            to="/student-dashboard"
            className="nav-item"
          >
            <span>⌂</span>
            Dashboard
          </NavLink>

          <div className="nav-section">
            ACADEMIC
          </div>

          <NavLink
            to="/student-timetable"
            className="nav-item"
          >
            <span>▤</span>
            My Timetable
          </NavLink>

          <NavLink
            to="/student-schedule"
            className="nav-item"
          >
            <span>◷</span>
            Today's Schedule
          </NavLink>

          <div className="nav-section">
            ACCOUNT
          </div>

          <NavLink
            to="/student-profile"
            className="nav-item"
          >
            <span>◉</span>
            My Profile
          </NavLink>

        </nav>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          <span>↪</span>
          Logout
        </button>

      </aside>

      {/* Main Content */}
      <div className="admin-main">

        <header className="topbar">

          <div>
            <h3>Student Portal • {user?.institution?.code || "ACADEMIC"}</h3>
            <p>
              {user?.institution?.name || "Academic Institution"} • {user?.programme || "B.Tech"}
              {user?.batch ? ` • Batch ${user.batch}` : ""}
            </p>
          </div>

          <div className="admin-profile">

            <div className="profile-avatar">
              {user?.name
                ?.charAt(0)
                ?.toUpperCase()}
            </div>

            <div>
              <strong>
                {user?.name}
              </strong>

              <span>
                STUDENT
              </span>
            </div>

          </div>

        </header>

        <main className="page-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
};

export default StudentLayout;