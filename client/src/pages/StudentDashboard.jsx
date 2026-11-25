import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div>

      <div className="page-heading">
        <div>
          <h1>
            Welcome, {user?.name}
          </h1>

          <p>
            Manage and view your academic schedule.
          </p>
        </div>
      </div>

      <div className="dashboard-cards">

        <div className="stat-card">
          <div className="stat-icon">
            T
          </div>

          <div>
            <span>My Timetable</span>
            <h2>View</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            S
          </div>

          <div>
            <span>Today's Schedule</span>
            <h2>View</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            P
          </div>

          <div>
            <span>Profile</span>
            <h2>View</h2>
          </div>
        </div>

      </div>

      <div className="dashboard-section">

        <div className="section-card">

          <h2>
            My Timetable
          </h2>

          <p>
            View your complete weekly timetable,
            including lectures and practical sessions.
          </p>

          <button
            className="primary-button"
            onClick={() =>
              navigate("/student-timetable")
            }
          >
            View Timetable →
          </button>

        </div>

        <div className="section-card">

          <h2>
            Today's Schedule
          </h2>

          <p>
            Check your classes and practical sessions
            scheduled for today.
          </p>

          <button
            className="primary-button"
            onClick={() =>
              navigate("/student-schedule")
            }
          >
            View Schedule →
          </button>

        </div>

      </div>

    </div>
  );
};

export default StudentDashboard;