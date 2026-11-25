import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const FacultyDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const todayIndex = new Date().getDay();
  // Default to MONDAY if weekend
  const todayName = (todayIndex >= 1 && todayIndex <= 5) ? DAYS[todayIndex] : "MONDAY";

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const res = await api.get("/timetables/faculty-me");
        setScheduleData(res.data);
      } catch (err) {
        console.error("Faculty dashboard schedule error:", err);
        setError(err.response?.data?.message || "Failed to load faculty schedule.");
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  const workload = scheduleData?.workload || {
    theoryHours: 0,
    practicalHours: 0,
    tutorialHours: 0,
    projectHours: 0,
    totalHours: 0
  };

  const facultyInfo = scheduleData?.faculty || user?.facultyProfile || {};

  // Filter today's classes
  const todayClasses = (scheduleData?.entries || []).filter((e) => {
    const day = e.timeSlot?.day || e.day;
    return day === todayName;
  }).sort((a, b) => {
    const slotA = a.timeSlot?.slotNumber || a.startSlotNumber || 1;
    const slotB = b.timeSlot?.slotNumber || b.startSlotNumber || 1;
    return slotA - slotB;
  });

  return (
    <div>
      {/* Welcome Banner */}
      <div className="page-heading">
        <div>
          <h1>Welcome, {user?.name || facultyInfo.name}</h1>
          <p>
            {facultyInfo.designation || "Faculty Member"} • Employee ID: <strong>{facultyInfo.employeeId || "FAC"}</strong> • Academic Year: 2026-27
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="primary-button" onClick={() => navigate("/faculty-timetable")}>
            View Weekly Timetable →
          </button>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {/* Institutional Roles & Responsibilities */}
      {facultyInfo.additionalResponsibilities?.length > 0 && (
        <div className="section-card" style={{ marginBottom: "20px", background: "linear-gradient(to right, #eff6ff, #f8fafc)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span style={{ fontSize: "16px" }}>🏛️</span>
            <strong style={{ fontSize: "14px", color: "#1e3a8a" }}>Designated Institutional Responsibilities</strong>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {facultyInfo.additionalResponsibilities.map((resp, i) => (
              <span
                key={i}
                style={{
                  background: "#ffffff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  padding: "4px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "700"
                }}
              >
                ★ {resp}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Workload Statistics Cards */}
      <div className="dashboard-cards">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#eff6ff", color: "#1d4ed8" }}>LT</div>
          <div>
            <span>Theory Lectures</span>
            <h2>{workload.theoryHours} Hrs/Wk</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#ecfdf5", color: "#047857" }}>PR</div>
          <div>
            <span>Practical Sessions</span>
            <h2>{workload.practicalHours} Hrs/Wk</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#fef3c7", color: "#b45309" }}>TUT</div>
          <div>
            <span>Tutorials</span>
            <h2>{workload.tutorialHours} Hrs/Wk</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#f3e8ff", color: "#7e22ce" }}>PRJ</div>
          <div>
            <span>Project Hours</span>
            <h2>{workload.projectHours} Hrs/Wk</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#172554", color: "#fff" }}>TTL</div>
          <div>
            <span>Total Workload</span>
            <h2>{workload.totalHours} Hrs/Wk</h2>
          </div>
        </div>
      </div>

      {/* Today's Schedule Overview */}
      <div className="section-card" style={{ marginTop: "24px" }}>
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2>Today's Schedule ({todayName})</h2>
            <p>Your academic lectures and lab sessions scheduled for today</p>
          </div>
          <button className="secondary-button" onClick={() => navigate("/faculty-schedule-today")}>
            Detailed Daily View →
          </button>
        </div>

        {loading ? (
          <p>Loading today's schedule...</p>
        ) : todayClasses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", background: "#f8fafc", borderRadius: "10px" }}>
            <span style={{ fontSize: "32px" }}>🎉</span>
            <h3 style={{ margin: "10px 0 4px", color: "#334155" }}>No Sessions Scheduled for {todayName}</h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>You are completely free from scheduled theory lectures and laboratory rotations today.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginTop: "14px" }}>
            {todayClasses.map((item, idx) => {
              const isPrac = item.subject?.type === "PRACTICAL" || item.durationSlots === 2;
              const slot = item.timeSlot;
              const timeRange = item.startTime && item.endTime
                ? `${item.startTime} – ${item.endTime}`
                : slot ? `${slot.startTime} – ${slot.endTime}` : "Scheduled Time";

              return (
                <div
                  key={idx}
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    border: isPrac ? "1px solid #a7f3d0" : "1px solid #bfdbfe",
                    background: isPrac ? "#f0fdf4" : "#f8fafc",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "800", color: isPrac ? "#047857" : "#1d4ed8" }}>
                      ⏱️ {timeRange}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: "800",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        background: isPrac ? "#dcfce7" : "#dbeafe",
                        color: isPrac ? "#166534" : "#1e40af"
                      }}
                    >
                      {isPrac ? "PRACTICAL LAB (2H)" : "THEORY LECTURE"}
                    </span>
                  </div>

                  <h3 style={{ margin: "0 0 6px", fontSize: "15px", color: "#0f172a" }}>
                    {item.subject?.name || "Subject"}
                  </h3>

                  <div style={{ fontSize: "12px", color: "#475569", marginBottom: "4px" }}>
                    🎓 Class: <strong>{item.division?.name || (item.semester?.name ? `${item.semester.name}` : `Sem ${item.semester?.number || ""}`)}</strong>
                    {item.batch ? ` • Batch ${item.batch}` : ""}
                  </div>

                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    📍 Room: <strong>{item.room?.roomNumber}</strong> ({item.room?.name})
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyDashboard;
