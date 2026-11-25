import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const FacultyLayout = () => {
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
          <div className="sidebar-logo">FT</div>
          <div>
            <h2>Smart Timetable</h2>
            <span>Faculty Portal</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/faculty-dashboard" className="nav-item">
            <span>⌂</span>
            Dashboard
          </NavLink>

          <div className="nav-section">ACADEMIC SCHEDULE</div>

          <NavLink to="/faculty-timetable" className="nav-item">
            <span>▤</span>
            My Timetable
          </NavLink>

          <NavLink to="/faculty-schedule-today" className="nav-item">
            <span>◷</span>
            Today's Schedule
          </NavLink>

          <NavLink to="/faculty-workload" className="nav-item">
            <span>📊</span>
            Workload & Duties
          </NavLink>

          <div className="nav-section">ACCOUNT</div>

          <NavLink to="/faculty-profile" className="nav-item">
            <span>◉</span>
            My Profile
          </NavLink>
        </nav>

        <button className="logout-button" onClick={handleLogout}>
          <span>↪</span>
          Logout
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main">
        <header className="topbar">
          <div>
            <h3>Faculty Portal • {user?.institution?.code || "ACADEMIC"}</h3>
            <p>{user?.institution?.name || "Academic Institution"} • {user?.department?.name || "Department of Computer Science & Engineering"}</p>
          </div>

          <div className="admin-profile">
            <div className="profile-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "F"}
            </div>
            <div>
              <h4>{user?.name || "Faculty Member"}</h4>
              <span>{user?.facultyProfile?.designation || user?.email}</span>
            </div>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default FacultyLayout;
