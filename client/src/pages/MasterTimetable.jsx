import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "./MasterTimetable.css";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
];

const formatDay = (day) =>
  day.charAt(0) + day.slice(1).toLowerCase();

const MasterTimetable = () => {
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [timetable, setTimetable] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters: ALL (Branch Master), "3", "5", "7", "LABS"
  const [semesterFilter, setSemesterFilter] = useState("ALL");
  const [dayFilter, setDayFilter] = useState("ALL");
  const [roomFilter, setRoomFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [departmentResponse, slotResponse] = await Promise.all([
          api.get("/departments"),
          api.get("/timeslots"),
        ]);

        const departmentList =
          departmentResponse.data?.departments ||
          departmentResponse.data ||
          [];

        const slotList =
          slotResponse.data?.timeSlots ||
          slotResponse.data ||
          [];

        setDepartments(departmentList);

        // Pre-select CSE department if available
        const cseDept = departmentList.find((d) => d.code === "CSE" || d.name?.includes("Computer"));
        if (cseDept) {
          setDepartmentId(cseDept._id);
        } else if (departmentList.length > 0) {
          setDepartmentId(departmentList[0]._id);
        }

        setTimeSlots(
          slotList.filter(
            (slot) => !slot.isBreak && DAYS.includes(slot.day)
          )
        );

        // Auto-fetch latest master timetable if already generated
        try {
          const latestRes = await api.get("/master-timetables/latest");
          if (latestRes.data?.timetable) {
            setTimetable(latestRes.data.timetable);
          }
        } catch {
          // No master timetable generated yet; waiting for user action
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Failed to load master timetable data."
        );
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, []);

  const generate = async () => {
    if (!departmentId) {
      setError("Please select the CSE department.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await api.post(
        "/master-timetables/generate",
        { department: departmentId }
      );

      setTimetable(response.data.timetable);
      setSuccess("Master timetable generated and synchronized successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to generate master timetable."
      );
    } finally {
      setLoading(false);
    }
  };

  const slots = useMemo(() => {
    // Unique slot numbers (1, 2, 4, 5, 7, 8)
    const uniqueSlotMap = new Map();
    for (const slot of timeSlots) {
      if (!uniqueSlotMap.has(slot.slotNumber)) {
        uniqueSlotMap.set(slot.slotNumber, slot);
      }
    }
    return Array.from(uniqueSlotMap.values()).sort(
      (a, b) => a.slotNumber - b.slotNumber
    );
  }, [timeSlots]);

  const filteredEntries = useMemo(() => {
    if (!timetable?.entries) return [];
    return timetable.entries.filter((entry) => {
      // 1. Semester filter
      if (semesterFilter !== "ALL" && semesterFilter !== "LABS") {
        const semNum = String(entry.semester?.number || "");
        if (semNum !== String(semesterFilter)) return false;
      }

      // Labs filter: only practicals
      if (semesterFilter === "LABS") {
        if (entry.entryType !== "PRACTICAL" && entry.room?.type !== "LAB") {
          return false;
        }
      }

      // 2. Day filter
      if (dayFilter !== "ALL") {
        const entryDay = entry.timeSlot?.day || entry.day;
        if (entryDay !== dayFilter) return false;
      }

      // 3. Session Type filter
      if (typeFilter !== "ALL") {
        if (entry.entryType !== typeFilter) return false;
      }

      // 4. Room filter (inspects parent room and all nested childBatches)
      if (roomFilter !== "ALL") {
        const parentRoomMatches = entry.room?.roomNumber === roomFilter;
        const childRoomMatches = entry.childBatches?.some(
          (cb) => cb.room?.roomNumber === roomFilter
        );
        if (!parentRoomMatches && !childRoomMatches) return false;
      }

      // 5. Batch filter (inspects parent batch and all nested childBatches)
      if (batchFilter !== "ALL") {
        const parentBatchMatches =
          entry.batch === batchFilter ||
          entry.batch?.code === batchFilter ||
          (entry.title && entry.title.includes(batchFilter));
        const childBatchMatches = entry.childBatches?.some(
          (cb) => cb.batch === batchFilter
        );
        if (!parentBatchMatches && !childBatchMatches) return false;
      }

      // 6. Universal Search Query (Faculty, Subject Code/Name, Room, Batch)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();

        const parentFac = entry.faculty?.name?.toLowerCase() || "";
        const parentSubName = entry.subject?.name?.toLowerCase() || "";
        const parentSubCode = entry.subject?.code?.toLowerCase() || "";
        const parentRoom = entry.room?.roomNumber?.toLowerCase() || "";
        const parentBatch = String(entry.batch?.code || entry.batch || "").toLowerCase();
        const parentTitle = (entry.title || "").toLowerCase();

        const parentMatches =
          parentFac.includes(q) ||
          parentSubName.includes(q) ||
          parentSubCode.includes(q) ||
          parentRoom.includes(q) ||
          parentBatch.includes(q) ||
          parentTitle.includes(q);

        const childMatches = entry.childBatches?.some((cb) => {
          const cbFac = cb.faculty?.name?.toLowerCase() || "";
          const cbSubName = cb.subject?.name?.toLowerCase() || "";
          const cbSubCode = cb.subject?.code?.toLowerCase() || "";
          const cbRoom = cb.room?.roomNumber?.toLowerCase() || "";
          const cbBatch = String(cb.batch || "").toLowerCase();

          return (
            cbFac.includes(q) ||
            cbSubName.includes(q) ||
            cbSubCode.includes(q) ||
            cbRoom.includes(q) ||
            cbBatch.includes(q)
          );
        });

        if (!parentMatches && !childMatches) return false;
      }

      return true;
    });
  }, [timetable, semesterFilter, dayFilter, typeFilter, roomFilter, batchFilter, searchQuery]);

  const getEntries = (day, slotNumber) => {
    return filteredEntries.filter((entry) => {
      const slot = entry.timeSlot;
      const start = slot?.slotNumber || entry.startSlotNumber;
      if (!start) return false;
      const entryDay = slot?.day || entry.day;
      if (entryDay !== day) return false;

      // Duplicate prevention for 2-hour practicals in row views:
      // Only return entry when slotNumber matches the starting slot!
      return start === slotNumber;
    });
  };

  const getSemesterLabel = (entry) => {
    const number = entry.semester?.number;
    return number ? `Sem ${number}` : "";
  };

  const getBatchLabel = (entry) => {
    if (entry.batch?.code) return entry.batch.code;
    if (entry.title && entry.title.includes("Batch")) return entry.title;
    return "";
  };

  const getEntryTitle = (entry) => {
    if (entry.subject?.name) return entry.subject.name;
    if (entry.title) return entry.title;
    return "Session";
  };

  if (loadingData) {
    return (
      <div className="master-page">
        <div className="master-loading">
          Loading master timetable...
        </div>
      </div>
    );
  }

  return (
    <div className="master-page">
      {/* Header */}
      <div className="master-header">
        <div>
          <p className="master-eyebrow">
            ACADEMIC DEPARTMENT MASTER SCHEDULE
          </p>
          <h1>CSE Master Timetable</h1>
          <p>
            Academic Year 2026-27 • Semester III, Semester V, Semester VII • Batch-Aware Scheduling
          </p>
        </div>

        <div className="master-actions">
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="master-select"
          >
            <option value="">Select Department</option>
            {departments.map((department) => (
              <option key={department._id} value={department._id}>
                {department.name} ({department.code})
              </option>
            ))}
          </select>

          <button
            className="master-generate-button"
            onClick={generate}
            disabled={loading}
          >
            {loading ? "Generating..." : "✦ Regenerate Master Timetable"}
          </button>

          {timetable && (
            <button
              onClick={() => window.print()}
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#1e293b",
                fontWeight: "700",
                fontSize: "14px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              🖨️ Print Master
            </button>
          )}
        </div>
      </div>

      {error && <div className="master-message error">{error}</div>}
      {success && <div className="master-message success">{success}</div>}

      {/* Filter Toolbar */}
      {timetable && (
        <div style={{
          background: "#ffffff",
          padding: "16px 20px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          marginBottom: "18px",
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}>
          {/* Row 1: Semester View Tabs */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", marginRight: "4px" }}>
                VIEW:
              </span>
              <button
                onClick={() => setSemesterFilter("ALL")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: semesterFilter === "ALL" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: semesterFilter === "ALL" ? "#eff6ff" : "#fff",
                  color: semesterFilter === "ALL" ? "#1d4ed8" : "#475569",
                  fontWeight: semesterFilter === "ALL" ? "800" : "600",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                Branch Master (All)
              </button>
              <button
                onClick={() => setSemesterFilter("3")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: semesterFilter === "3" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: semesterFilter === "3" ? "#eff6ff" : "#fff",
                  color: semesterFilter === "3" ? "#1d4ed8" : "#475569",
                  fontWeight: semesterFilter === "3" ? "800" : "600",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                Second Year (Sem 3)
              </button>
              <button
                onClick={() => setSemesterFilter("5")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: semesterFilter === "5" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: semesterFilter === "5" ? "#eff6ff" : "#fff",
                  color: semesterFilter === "5" ? "#1d4ed8" : "#475569",
                  fontWeight: semesterFilter === "5" ? "800" : "600",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                Third Year (Sem 5)
              </button>
              <button
                onClick={() => setSemesterFilter("7")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: semesterFilter === "7" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: semesterFilter === "7" ? "#eff6ff" : "#fff",
                  color: semesterFilter === "7" ? "#1d4ed8" : "#475569",
                  fontWeight: semesterFilter === "7" ? "800" : "600",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                Final Year (Sem 7)
              </button>
              <button
                onClick={() => setSemesterFilter("LABS")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: semesterFilter === "LABS" ? "2px solid #059669" : "1px solid #cbd5e1",
                  background: semesterFilter === "LABS" ? "#ecfdf5" : "#fff",
                  color: semesterFilter === "LABS" ? "#047857" : "#475569",
                  fontWeight: semesterFilter === "LABS" ? "800" : "600",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                🔬 Labs Only
              </button>
            </div>

            {(dayFilter !== "ALL" || roomFilter !== "ALL" || batchFilter !== "ALL" || typeFilter !== "ALL" || searchQuery || semesterFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSemesterFilter("ALL");
                  setDayFilter("ALL");
                  setRoomFilter("ALL");
                  setBatchFilter("ALL");
                  setTypeFilter("ALL");
                  setSearchQuery("");
                }}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: "1px solid #f87171",
                  background: "#fef2f2",
                  color: "#dc2626",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                ✕ Reset Filters
              </button>
            )}
          </div>

          {/* Row 2: Secondary Dropdown Filters & Search */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
            {/* Day Filter */}
            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
                color: "#1e293b",
                fontWeight: "600"
              }}
            >
              <option value="ALL">All Days</option>
              <option value="MONDAY">Monday</option>
              <option value="TUESDAY">Tuesday</option>
              <option value="WEDNESDAY">Wednesday</option>
              <option value="THURSDAY">Thursday</option>
              <option value="FRIDAY">Friday</option>
            </select>

            {/* Room / Lab Filter */}
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
                color: "#1e293b",
                fontWeight: "600"
              }}
            >
              <option value="ALL">All Rooms & Labs</option>
              <optgroup label="Classrooms">
                <option value="CR18">CR18 (Sem 3 SY)</option>
                <option value="CR56">CR56 (Sem 5 TY)</option>
                <option value="CR57">CR57 (Sem 7 B.Tech)</option>
                <option value="CR19">CR19 (Tutorial)</option>
              </optgroup>
              <optgroup label="Laboratories">
                <option value="L41">L41 - General Computing</option>
                <option value="L42">L42 - Programming Lab</option>
                <option value="L43">L43 - Database Lab</option>
                <option value="L44">L44 - Network Lab</option>
                <option value="L46">L46 - Software Lab</option>
                <option value="L47">L47 - Project Lab</option>
                <option value="L48">L48 - Graphics Lab</option>
                <option value="L49">L49 - Web Lab</option>
              </optgroup>
            </select>

            {/* Batch Filter */}
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
                color: "#1e293b",
                fontWeight: "600"
              }}
            >
              <option value="ALL">All Batches</option>
              <optgroup label="Sem 3 Batches">
                <option value="S1">Batch S1</option>
                <option value="S2">Batch S2</option>
                <option value="S3">Batch S3</option>
                <option value="S4">Batch S4</option>
              </optgroup>
              <optgroup label="Sem 5 Batches">
                <option value="T1">Batch T1</option>
                <option value="T2">Batch T2</option>
                <option value="T3">Batch T3</option>
                <option value="T4">Batch T4</option>
              </optgroup>
              <optgroup label="Sem 7 Batches">
                <option value="B1">Batch B1</option>
                <option value="B2">Batch B2</option>
                <option value="B3">Batch B3</option>
                <option value="B4">Batch B4</option>
              </optgroup>
            </select>

            {/* Session Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
                color: "#1e293b",
                fontWeight: "600"
              }}
            >
              <option value="ALL">All Session Types</option>
              <option value="LECTURE">Theory Lectures</option>
              <option value="PRACTICAL">Lab Practicals</option>
              <option value="TUTORIAL">Tutorials</option>
              <option value="PROJECT">Project-I</option>
            </select>

            {/* Universal Search Input */}
            <div style={{ flex: 1, minWidth: "200px" }}>
              <input
                type="text"
                placeholder="Search Faculty, Subject, Room, Batch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12px",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>
        </div>
      )}

      {!timetable ? (
        <div className="master-empty">
          <div className="master-empty-icon">✦</div>
          <h2>Generate the CSE Master Timetable</h2>
          <p>
            The generator coordinates Semester 3, Semester 5 and Semester 7 together with
            practical batches (S1-S4, T1-T4, B1-B4) and shared laboratory resources without clashes.
          </p>
        </div>
      ) : (
        <>
          {/* Institutional Header (Form 02 / Master Timetable) */}
          <div className="institutional-header" style={{
            textAlign: "center",
            padding: "16px 20px",
            borderBottom: "2px solid #1e3a8a",
            marginBottom: "16px",
            background: "linear-gradient(to right, #f8fafc, #eff6ff, #f8fafc)",
            borderRadius: "8px"
          }}>
            <h3 style={{ margin: "0 0 4px", fontSize: "14px", color: "#172554", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "800" }}>
              {timetable.institution?.name ? "Dr. Ashok Gujar Technical Institute's" : "Dr. Ashok Gujar Technical Institute's"}
            </h3>
            <h2 style={{ margin: "0 0 4px", fontSize: "18px", color: "#1d4ed8", fontWeight: "800" }}>
              {timetable.institution?.name || "Dr. Daulatrao Aher College of Engineering, Karad"}
            </h2>
            <p style={{ margin: "0 0 6px", fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
              Department of {timetable.department?.name || "Computer Science & Engineering"}
            </p>
            <div style={{ display: "inline-block", background: "#1e3a8a", color: "#fff", padding: "4px 14px", borderRadius: "4px", fontSize: "12px", fontWeight: "700", letterSpacing: "1px", marginBottom: "12px" }}>
              BRANCH MASTER TIME TABLE (Academic Year: {timetable.academicYear || "2026-27"})
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", background: "#fff", padding: "10px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", textAlign: "left" }}>
              <div><strong style={{ color: "#475569" }}>Branch: </strong><span>{timetable.department?.name || "Computer Science & Engineering"}</span></div>
              <div><strong style={{ color: "#475569" }}>Semesters: </strong><span>Sem III, Sem V, Sem VII</span></div>
              <div><strong style={{ color: "#475569" }}>Classrooms: </strong><span>CR18 (SY), CR56 (TY), CR57 (B.Tech)</span></div>
              <div><strong style={{ color: "#475569" }}>W.E.F.: </strong><span>01/07/2026</span></div>
            </div>
          </div>

          <div className="master-summary">
            <div>
              <span>Department</span>
              <strong>{timetable.department?.name || "Computer Science & Engineering"}</strong>
            </div>
            <div>
              <span>Academic Year</span>
              <strong>{timetable.academicYear || "2026-27"}</strong>
            </div>
            <div>
              <span>Semesters</span>
              <strong>Sem 3 • Sem 5 • Sem 7</strong>
            </div>
            <div>
              <span>Total Entries</span>
              <strong>{filteredEntries.length} Sessions</strong>
            </div>
          </div>

          <div className="master-legend">
            <span>
              <b className="legend lecture" />
              Lecture (1H)
            </span>
            <span>
              <b className="legend practical" />
              Practical Lab (2H)
            </span>
            <span>
              <b className="legend activity" />
              Tutorial
            </span>
            <span>
              <b className="legend project" />
              Project-I (2H)
            </span>
          </div>

          <div className="master-table-wrapper">
            <table className="master-table">
              <thead>
                <tr>
                  <th className="time-column">Time Slot</th>
                  {DAYS.map((day) => (
                    <th key={day}>{formatDay(day)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => {
                  const entriesByDay = DAYS.map((day) => getEntries(day, slot.slotNumber));

                  return (
                    <tr key={slot._id || slot.slotNumber}>
                      <td className="time-cell">
                        <strong>{slot.startTime}</strong>
                        <span>– {slot.endTime}</span>
                      </td>

                      {DAYS.map((day, index) => {
                        const entries = entriesByDay[index];

                        return (
                          <td key={day} className="master-cell">
                            {entries.length === 0 ? (
                              <span className="free-cell">—</span>
                            ) : (
                              entries.map((entry) => {
                                const isPrac = entry.entryType === "PRACTICAL" || entry.durationSlots === 2;
                                const hasChildBatches = entry.childBatches && entry.childBatches.length > 0;

                                if (hasChildBatches) {
                                  return (
                                    <div
                                      key={entry._id || `${entry.subject?._id}_${entry.timeSlot?._id}`}
                                      className="master-entry practical"
                                      style={{
                                        marginBottom: "6px",
                                        borderLeft: "3px solid #059669",
                                        background: "#f0fdf4"
                                      }}
                                    >
                                      <div className="entry-top">
                                        <span style={{ fontWeight: "800" }}>{getSemesterLabel(entry)}</span>
                                        <span style={{ background: "#ecfdf5", color: "#065f46", fontWeight: "700", padding: "1px 5px", borderRadius: "3px", fontSize: "10px" }}>
                                          {entry.childBatches.length} Batches (Lab)
                                        </span>
                                      </div>
                                      <strong style={{ color: "#065f46", fontSize: "12px" }}>🔬 Lab Practical (2 Continuous Hours)</strong>
                                      <div style={{ display: "grid", gridTemplateColumns: entry.childBatches.length > 2 ? "1fr 1fr" : "1fr", gap: "4px", marginTop: "4px" }}>
                                        {entry.childBatches.map((cb, idx) => {
                                          const isChildMatch = Boolean(
                                            (batchFilter !== "ALL" && cb.batch === batchFilter) ||
                                            (roomFilter !== "ALL" && cb.room?.roomNumber === roomFilter) ||
                                            (searchQuery.trim() && (
                                              (cb.faculty?.name || "").toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                                              (cb.subject?.name || "").toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                                              (cb.subject?.code || "").toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                                              (cb.room?.roomNumber || "").toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                                              (cb.batch || "").toLowerCase().includes(searchQuery.toLowerCase().trim())
                                            ))
                                          );

                                          return (
                                            <div
                                              key={idx}
                                              style={{
                                                background: isChildMatch ? "#eff6ff" : "#fff",
                                                border: isChildMatch ? "2px solid #2563eb" : "1px solid #a7f3d0",
                                                borderRadius: "4px",
                                                padding: "4px 6px",
                                                fontSize: "11px",
                                                boxShadow: isChildMatch ? "0 0 0 1px #2563eb" : "none"
                                              }}
                                            >
                                              <span style={{
                                                background: isChildMatch ? "#1d4ed8" : "#059669",
                                                color: "#fff",
                                                fontWeight: "800",
                                                fontSize: "9px",
                                                padding: "1px 4px",
                                                borderRadius: "2px",
                                                marginRight: "4px"
                                              }}>
                                                {cb.batch}
                                              </span>
                                              <strong>{cb.subject?.code || "Lab"}</strong>
                                              <div style={{ color: "#334155", fontSize: "10px", marginTop: "2px" }}>
                                                👨‍🏫 {cb.faculty?.name || "Faculty"}
                                              </div>
                                              <div style={{ color: "#047857", fontSize: "10px", fontWeight: "600" }}>
                                                📍 {cb.room?.roomNumber || "Lab"}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={entry._id || `${entry.subject?._id}_${entry.timeSlot?._id}`}
                                    className={`master-entry ${(entry.entryType || "lecture").toLowerCase()}`}
                                    style={{
                                      marginBottom: "6px",
                                      borderLeft: isPrac ? "3px solid #059669" : "3px solid #2563eb"
                                    }}
                                  >
                                    <div className="entry-top">
                                      <span style={{ fontWeight: "800" }}>{getSemesterLabel(entry)}</span>
                                      {getBatchLabel(entry) && (
                                        <span style={{ background: "#ecfdf5", color: "#065f46", fontWeight: "700", padding: "1px 5px", borderRadius: "3px" }}>
                                          {getBatchLabel(entry)}
                                        </span>
                                      )}
                                    </div>

                                    <strong>{getEntryTitle(entry)}</strong>

                                    {entry.faculty && (
                                      <small style={{ color: "#334155" }}>
                                        👨‍🏫 {entry.faculty.name}
                                      </small>
                                    )}

                                    {entry.room && (
                                      <small style={{ color: "#64748b" }}>
                                        📍 {entry.room.roomNumber} ({entry.room.name})
                                      </small>
                                    )}

                                    {isPrac && (
                                      <div style={{ fontSize: "10px", color: "#047857", fontWeight: "700", marginTop: "2px" }}>
                                        ⏱️ 2 Continuous Hours (Lab)
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Institutional Sign-off Block */}
          <div className="institutional-signoff" style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "2px solid #e2e8f0",
            textAlign: "center",
            fontSize: "12px",
            color: "#334155"
          }}>
            <div style={{ padding: "10px", border: "1px dashed #cbd5e1", borderRadius: "6px", background: "#f8fafc" }}>
              <div style={{ height: "30px" }}></div>
              <strong style={{ display: "block", color: "#0f172a" }}>Prof. S. B. Thorat</strong>
              <span style={{ color: "#64748b" }}>Time-Table In-charge</span>
            </div>
            <div style={{ padding: "10px", border: "1px dashed #cbd5e1", borderRadius: "6px", background: "#f8fafc" }}>
              <div style={{ height: "30px" }}></div>
              <strong style={{ display: "block", color: "#0f172a" }}>Prof. D. R. Kamble</strong>
              <span style={{ color: "#64748b" }}>Academic In-charge</span>
            </div>
            <div style={{ padding: "10px", border: "1px dashed #cbd5e1", borderRadius: "6px", background: "#f8fafc" }}>
              <div style={{ height: "30px" }}></div>
              <strong style={{ display: "block", color: "#0f172a" }}>Prof. A. H. Renushe</strong>
              <span style={{ color: "#64748b" }}>Head of Department (CSE)</span>
            </div>
            <div style={{ padding: "10px", border: "1px dashed #cbd5e1", borderRadius: "6px", background: "#f8fafc" }}>
              <div style={{ height: "30px" }}></div>
              <strong style={{ display: "block", color: "#0f172a" }}>Dr. A. M. Mulla</strong>
              <span style={{ color: "#64748b" }}>Principal</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MasterTimetable;
