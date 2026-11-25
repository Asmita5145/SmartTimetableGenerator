import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminLayout = () => {
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
            <span>Admin Panel</span>
          </div>
        </div>

        <nav className="sidebar-nav">

          <NavLink
            to="/dashboard"
            className="nav-item"
          >
            <span>⌂</span>
            Dashboard
          </NavLink>

          <div className="nav-section">
            ACADEMIC
          </div>

          <NavLink
            to="/departments"
            className="nav-item"
          >
            <span>▦</span>
            Departments
          </NavLink>

          <NavLink
            to="/semesters"
            className="nav-item"
          >
            <span>◫</span>
            Semesters
          </NavLink>

          <NavLink
            to="/divisions"
            className="nav-item"
          >
            <span>▤</span>
            Divisions
          </NavLink>

          <NavLink
            to="/students"
            className="nav-item"
          >
            <span>♙</span>
            Students
          </NavLink>

          <div className="nav-section">
            RESOURCES
          </div>

          <NavLink
            to="/faculty"
            className="nav-item"
          >
            <span>◉</span>
            Faculty
          </NavLink>

          <NavLink
            to="/subjects"
            className="nav-item"
          >
            <span>◈</span>
            Subjects
          </NavLink>

          <NavLink
            to="/rooms"
            className="nav-item"
          >
            <span>□</span>
            Rooms & Labs
          </NavLink>

          <NavLink
            to="/timeslots"
            className="nav-item"
          >
            <span>◷</span>
            Time Slots
          </NavLink>

          <NavLink
            to="/availability"
            className="nav-item"
          >
            <span>◌</span>
            Availability
          </NavLink>

          <div className="nav-section">
            TIMETABLE MANAGEMENT
          </div>

          <NavLink
            to="/timetable-generator"
            className="nav-item"
          >
            <span>✦</span>
            Generate Timetable
          </NavLink>

          <NavLink
            to="/master-timetable"
            className="nav-item"
          >
            <span>🏛️</span>
            Master Timetable
          </NavLink>

          <NavLink
            to="/timetables"
            className="nav-item"
          >
            <span>📅</span>
            Semester Timetables
          </NavLink>

          <NavLink
            to="/faculty-schedule"
            className="nav-item"
          >
            <span>👨‍🏫</span>
            Faculty Timetables
          </NavLink>

          <NavLink
            to="/room-schedule"
            className="nav-item"
          >
            <span>🏫</span>
            Room & Lab Timetables
          </NavLink>

          <NavLink
            to="/workload-report"
            className="nav-item"
          >
            <span>📊</span>
            Workload Reports
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

      {/* Main Area */}
      <div className="admin-main">

        {/* Topbar */}
        <header className="topbar">

          <div>
            <h3>Admin Dashboard</h3>
            <p>{user?.institution?.name || "Dr. Ashok Gujar Technical Institute's Dr. Daulatrao Aher College of Engineering, Karad"} • {user?.institution?.defaultProgramme || "B.Tech"} Programme</p>
          </div>

          <div className="admin-profile">

            <div className="profile-avatar">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>

            <div>
              <strong>{user?.name}</strong>
              <span>{user?.role}</span>
            </div>

          </div>

        </header>

        {/* Page Content */}
        <main className="page-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
};

export default AdminLayout;
