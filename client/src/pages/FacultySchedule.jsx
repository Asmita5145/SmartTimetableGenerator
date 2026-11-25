import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "./FacultySchedule.css";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
];

const TIME_SLOTS = [
  { slotNumber: 1, start: "10:00", end: "11:00", label: "10:00 – 11:00", isBreak: false },
  { slotNumber: 2, start: "11:00", end: "12:00", label: "11:00 – 12:00", isBreak: false },
  { slotNumber: 3, start: "12:00", end: "12:45", label: "12:00 – 12:45", isBreak: true, breakTitle: "LUNCH BREAK" },
  { slotNumber: 4, start: "12:45", end: "13:45", label: "12:45 – 1:45", isBreak: false },
  { slotNumber: 5, start: "13:45", end: "14:45", label: "1:45 – 2:45", isBreak: false },
  { slotNumber: 6, start: "14:45", end: "15:00", label: "2:45 – 3:00", isBreak: true, breakTitle: "RECESS" },
  { slotNumber: 7, start: "15:00", end: "16:00", label: "3:00 – 4:00", isBreak: false },
  { slotNumber: 8, start: "16:00", end: "17:00", label: "4:00 – 5:00", isBreak: false },
];

const DAY_LABELS = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
};

const FacultySchedule = () => {
  const [departments, setDepartments] = useState([]);
  const [facultyList, setFacultyList] = useState([]);

  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");

  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");

  // 1. Initial Load: Departments & Faculty
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true);
        setError("");

        const [departmentsResponse, facultyResponse] = await Promise.all([
          api.get("/departments"),
          api.get("/faculty"),
        ]);

        const depts = departmentsResponse.data.departments || [];
        const facs = facultyResponse.data.faculty || [];

        setDepartments(depts);
        setFacultyList(facs);

        // Auto-select CSE
        const cse = depts.find(
          (d) =>
            d.code === "CSE" ||
            d.name.toUpperCase().includes("COMPUTER")
        );

        if (cse) {
          setSelectedDepartment(cse._id);
        }

        // Auto-select first faculty if present
        if (facs.length > 0) {
          setSelectedFaculty(facs[0]._id);
        }
      } catch (err) {
        console.error("Faculty schedule initial data error:", err);
        setError("Failed to load initial faculty data.");
      } finally {
        setInitialLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Filter faculty by selected department
  const filteredFaculty = useMemo(() => {
    if (!selectedDepartment) return facultyList;
    return facultyList.filter(
      (f) => String(f.department?._id || f.department) === String(selectedDepartment)
    );
  }, [facultyList, selectedDepartment]);

  // When selected faculty changes, load timetable
  useEffect(() => {
    if (!selectedFaculty) {
      setScheduleData(null);
      return;
    }

    const fetchFacultyTimetable = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get(`/timetables/faculty/${selectedFaculty}`);
        setScheduleData(res.data);
      } catch (err) {
        console.error("Fetch faculty timetable error:", err);
        setError(err.response?.data?.message || "Failed to load timetable for selected faculty.");
        setScheduleData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchFacultyTimetable();
  }, [selectedFaculty]);

  // Find assigned entry for a cell
  const getEntryForSlot = (day, slotNumber) => {
    if (!scheduleData?.entries) return null;
    return scheduleData.entries.find((entry) => {
      const slot = entry.timeSlot;
      if (!slot) return false;
      if (slot.day !== day) return false;

      const start = slot.slotNumber;
      const duration = entry.durationSlots || 1;
      return slotNumber >= start && slotNumber < start + duration;
    });
  };

  const selectedFacultyObj = useMemo(() => {
    return (
      scheduleData?.faculty ||
      facultyList.find((f) => String(f._id) === String(selectedFaculty))
    );
  }, [scheduleData, facultyList, selectedFaculty]);

  const workload = scheduleData?.workload || {
    theoryHours: 0,
    practicalHours: 0,
    tutorialHours: 0,
    projectHours: 0,
    totalHours: 0,
  };

  const handlePrint = () => {
    window.print();
  };

  if (initialLoading) {
    return (
      <div className="faculty-schedule-page">
        <div className="faculty-schedule-loading">Loading faculty schedule...</div>
      </div>
    );
  }

  return (
    <div className="faculty-schedule-page">
      {/* Header */}
      <div className="faculty-schedule-header">
        <div>
          <h1>Faculty Timetable</h1>
          <p>Complete academic workload and weekly schedule for faculty members across all CSE classes</p>
        </div>
        <button
          onClick={handlePrint}
          style={{
            padding: "10px 18px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span>🖨️</span> Print Timetable
        </button>
      </div>

      {/* Filters */}
      <div className="faculty-filter-card" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="faculty-filter-group">
          <label>Department</label>
          <select
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              const matching = facultyList.filter(
                (f) => String(f.department?._id || f.department) === String(e.target.value)
              );
              if (matching.length > 0) {
                setSelectedFaculty(matching[0]._id);
              } else {
                setSelectedFaculty("");
              }
            }}
          >
            <option value="">Select Department</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>

        <div className="faculty-filter-group">
          <label>Faculty Member</label>
          <select
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
          >
            <option value="">Select Faculty</option>
            {filteredFaculty.map((f) => (
              <option key={f._id} value={f._id}>
                {f.name} ({f.employeeId}) {f.designation ? `— ${f.designation}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="faculty-schedule-alert">{error}</div>}

      {/* Selected Faculty Profile Banner */}
      {selectedFacultyObj && (
        <div className="faculty-info-card">
          <div className="faculty-info-main">
            <div className="faculty-avatar">
              {selectedFacultyObj.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: "0 0 4px", fontSize: "20px" }}>{selectedFacultyObj.name}</h2>
              <p style={{ margin: "0 0 4px", color: "#6b7280", fontSize: "14px" }}>
                {selectedFacultyObj.designation || "Assistant Professor"} • Employee ID: <strong>{selectedFacultyObj.employeeId}</strong>
              </p>
              <p style={{ margin: 0, color: "#9ca3af", fontSize: "13px" }}>
                {selectedFacultyObj.email} • Computer Science & Engineering
              </p>
              {selectedFacultyObj.additionalResponsibilities?.length > 0 && (
                <div style={{ marginTop: "6px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {selectedFacultyObj.additionalResponsibilities.map((resp, idx) => (
                    <span key={idx} style={{ background: "#eff6ff", color: "#1e40af", fontSize: "11px", fontWeight: "600", padding: "2px 8px", borderRadius: "4px", border: "1px solid #bfdbfe" }}>
                      ★ {resp}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: "20px", textAlign: "center" }}>
            <div style={{ background: "#eff6ff", padding: "10px 16px", borderRadius: "10px" }}>
              <div style={{ fontSize: "12px", color: "#1e40af", fontWeight: "600" }}>THEORY (LT)</div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#1d4ed8" }}>{workload.theoryHours} Hrs</div>
            </div>
            <div style={{ background: "#ecfdf5", padding: "10px 16px", borderRadius: "10px" }}>
              <div style={{ fontSize: "12px", color: "#065f46", fontWeight: "600" }}>PRACTICAL (PR)</div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#047857" }}>{workload.practicalHours} Hrs</div>
            </div>
            <div style={{ background: "#fef3c7", padding: "10px 16px", borderRadius: "10px" }}>
              <div style={{ fontSize: "12px", color: "#92400e", fontWeight: "600" }}>TUTORIAL (TUT)</div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#b45309" }}>{workload.tutorialHours} Hrs</div>
            </div>
            <div style={{ background: "#f3e8ff", padding: "10px 16px", borderRadius: "10px" }}>
              <div style={{ fontSize: "12px", color: "#6b21a8", fontWeight: "600" }}>PROJECT</div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#7e22ce" }}>{workload.projectHours} Hrs</div>
            </div>
            <div style={{ background: "#172554", color: "#fff", padding: "10px 18px", borderRadius: "10px" }}>
              <div style={{ fontSize: "12px", color: "#93c5fd", fontWeight: "600" }}>TOTAL LOAD</div>
              <div style={{ fontSize: "22px", fontWeight: "800" }}>{workload.totalHours} Hrs/Wk</div>
            </div>
          </div>
        </div>
      )}

      {/* College Official Timetable Header */}
      <div
        style={{
          background: "#ffffff",
          padding: "16px 24px",
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          border: "1px solid #e5e7eb",
          borderBottom: "none",
          textAlign: "center"
        }}
      >
        <div style={{ fontSize: "12px", fontWeight: "700", color: "#6b7280", letterSpacing: "1px" }}>
          DR. ASHOK GUJAR TECHNICAL INSTITUTE'S
        </div>
        <h3 style={{ margin: "2px 0 4px", fontSize: "18px", color: "#111827" }}>
          Dr. Daulatrao Aher College of Engineering, Karad
        </h3>
        <div style={{ fontSize: "13px", color: "#374151", fontWeight: "600" }}>
          DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
        </div>
        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
          FACULTY TIME TABLE • Academic Year: 2026-27 (Sem Odd)
        </div>
      </div>

      {/* Timetable Grid */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderBottomLeftRadius: "16px",
          borderBottomRightRadius: "16px",
          overflowX: "auto",
          boxShadow: "0 8px 25px rgba(15, 23, 42, 0.05)",
          marginBottom: "30px"
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "850px" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              <th style={{ padding: "14px 16px", textAlign: "center", width: "130px", fontSize: "13px", fontWeight: "700", color: "#475569" }}>
                TIME / DAY
              </th>
              {DAYS.map((d) => (
                <th key={d} style={{ padding: "14px 16px", textAlign: "center", fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>
                  {DAY_LABELS[d]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slot) => {
              if (slot.isBreak) {
                return (
                  <tr key={slot.slotNumber} style={{ background: "#fef9c3", borderBottom: "1px solid #fef08a" }}>
                    <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: "600", fontSize: "12px", color: "#854d0e" }}>
                      {slot.label}
                    </td>
                    <td
                      colSpan={DAYS.length}
                      style={{
                        padding: "10px",
                        textAlign: "center",
                        fontWeight: "800",
                        letterSpacing: "3px",
                        fontSize: "12px",
                        color: "#a16207"
                      }}
                    >
                      ☕ {slot.breakTitle} ({slot.label})
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={slot.slotNumber} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: "700", fontSize: "12px", color: "#64748b", background: "#f8fafc" }}>
                    {slot.label}
                  </td>
                  {DAYS.map((day) => {
                    const entry = getEntryForSlot(day, slot.slotNumber);

                    if (!entry) {
                      return (
                        <td
                          key={day}
                          style={{
                            padding: "12px",
                            textAlign: "center",
                            background: "#fafafa",
                            borderLeft: "1px solid #f1f5f9"
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: "600",
                              background: "#f1f5f9",
                              color: "#94a3b8",
                              letterSpacing: "1px"
                            }}
                          >
                            FREE / AVAILABLE
                          </span>
                        </td>
                      );
                    }

                    // Duplicate prevention for 2-hour practicals:
                    const entryStartSlot = entry.timeSlot?.slotNumber || entry.startSlotNumber;
                    if (entryStartSlot && entryStartSlot !== slot.slotNumber) {
                      return null; // Covered by rowSpan!
                    }

                    const duration = entry.durationSlots || 1;
                    const isPrac = entry.subject?.type === "PRACTICAL" || entry.entryType === "PRACTICAL" || duration === 2;
                    const isTut = entry.subject?.type === "TUTORIAL" || entry.entryType === "TUTORIAL";
                    const isProj = entry.subject?.type === "PROJECT" || entry.entryType === "PROJECT";

                    const badgeColor = isPrac
                      ? { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46", tag: "PRACTICAL (2H)" }
                      : isTut
                      ? { bg: "#fef3c7", border: "#fde68a", text: "#92400e", tag: "TUTORIAL" }
                      : isProj
                      ? { bg: "#f3e8ff", border: "#e9d5ff", text: "#6b21a8", tag: "PROJECT" }
                      : { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af", tag: "THEORY" };

                    return (
                      <td
                        key={day}
                        rowSpan={duration}
                        style={{
                          padding: "10px",
                          borderLeft: "1px solid #f1f5f9",
                          verticalAlign: "top"
                        }}
                      >
                        <div
                          style={{
                            background: badgeColor.bg,
                            border: `1px solid ${badgeColor.border}`,
                            borderRadius: "8px",
                            padding: "8px 10px",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <strong style={{ fontSize: "13px", color: "#0f172a" }}>
                              {entry.subject?.name || "Subject"}
                            </strong>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: "700",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: "#ffffff",
                                color: badgeColor.text,
                                border: `1px solid ${badgeColor.border}`
                              }}
                            >
                              {badgeColor.tag}
                            </span>
                          </div>

                          <div style={{ fontSize: "12px", color: "#334155", fontWeight: "600", marginBottom: "2px" }}>
                            🎓 {entry.division?.name || (entry.semester?.name ? `${entry.semester.name}` : `Sem ${entry.semester?.number || ""}`)}
                            {entry.batch ? ` [Batch ${entry.batch}]` : ""}
                          </div>

                          <div style={{ fontSize: "11px", color: "#64748b" }}>
                            📍 {entry.room?.roomNumber || "Room"} ({entry.room?.name || "CR"})
                          </div>

                          {isPrac && (
                            <div style={{ fontSize: "11px", color: "#047857", fontWeight: "700", marginTop: "4px" }}>
                              ⏱️ {entry.startTime && entry.endTime ? `${entry.startTime} – ${entry.endTime}` : (slot.slotNumber === 1 ? "10:00 AM – 12:00 PM" : slot.slotNumber === 4 ? "12:45 PM – 2:45 PM" : "3:00 PM – 5:00 PM")}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Academic Workload Breakdown Footer */}
      {selectedFacultyObj && (
        <div
          style={{
            background: "#ffffff",
            padding: "24px",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 8px 25px rgba(15, 23, 42, 0.05)"
          }}
        >
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", color: "#111827" }}>
            Faculty Academic Workload Distribution (DACOE Karad Form 04)
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", color: "#475569" }}>Work Load Component</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", color: "#475569" }}>Assigned Hours</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px" }}>Theory Lectures (LT)</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: "700" }}>{workload.theoryHours} Hrs</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px" }}>Practical Sessions (PR)</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: "700" }}>{workload.practicalHours} Hrs</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px" }}>Tutorial Sessions (TUT)</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: "700" }}>{workload.tutorialHours} Hrs</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px" }}>Project Hours</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: "700" }}>{workload.projectHours} Hrs</td>
                  </tr>
                  <tr style={{ background: "#f8fafc", fontWeight: "800", color: "#1e3a8a" }}>
                    <td style={{ padding: "10px 12px" }}>TOTAL WORKLOAD</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontSize: "16px" }}>{workload.totalHours} Hrs / Week</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ background: "#f8fafc", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: "14px", color: "#334155" }}>
                Institutional Sign-off
              </h4>
              <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b", lineHeight: "1.6" }}>
                This timetable has been dynamically verified and scheduled according to DACOE Karad workload norms with zero resource conflicts.
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "20px", borderTop: "1px dashed #cbd5e1", fontSize: "12px", color: "#475569" }}>
                <div>
                  <strong>Prof. S. B. Thorat</strong><br />Time-Table In-Charge
                </div>
                <div>
                  <strong>Prof. D. R. Kamble</strong><br />Academic In-Charge
                </div>
                <div>
                  <strong>Prof. A. H. Renushe</strong><br />Head of Department
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultySchedule;
