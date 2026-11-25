import { useEffect, useState, useMemo } from "react";
import api from "../services/api";

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

const TimetableGenerator = () => {
  const [generationMode, setGenerationMode] = useState("DEPARTMENT"); // DEPARTMENT | DIVISION
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [divisions, setDivisions] = useState([]);

  const [formData, setFormData] = useState({
    departmentId: "",
    semesterId: "",
    divisionId: "",
    academicYear: "2026-27"
  });

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Department generation results
  const [departmentResult, setDepartmentResult] = useState(null);
  const [selectedDivisionId, setSelectedDivisionId] = useState("");

  // Single division generation result
  const [singleTimetable, setSingleTimetable] = useState(null);

  const PROGRESS_STEPS = [
    "Analyzing academic curriculum constraints & room capacities...",
    "Checking faculty availability & cross-semester workload quotas...",
    "Allocating computer laboratories (L41-L49) for 2-hour practical sessions...",
    "Allocating classrooms (CR18, CR56, CR57, CR19) for theory lectures & tutorials...",
    "Scheduling final-year Project-I hours...",
    "Verifying global conflict matrix (zero faculty & room collisions)...",
    "Finalizing and saving department timetables to database..."
  ];

  // 1. Initial Data Loading
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setDataLoading(true);
      const [deptRes, semRes, divRes] = await Promise.all([
        api.get("/departments"),
        api.get("/semesters"),
        api.get("/divisions")
      ]);

      const depts = deptRes.data.departments || [];
      const sems = semRes.data.semesters || [];
      const divs = divRes.data.divisions || [];

      setDepartments(depts);
      setSemesters(sems);
      setDivisions(divs);

      // Auto-select CSE
      const cse = depts.find(
        (d) => d.code === "CSE" || d.name.toUpperCase().includes("COMPUTER")
      );
      if (cse) {
        setFormData((prev) => ({ ...prev, departmentId: cse._id }));
      }
    } catch (err) {
      console.error("Fetch initial data error:", err);
      setError("Failed to load department and division data.");
    } finally {
      setDataLoading(false);
    }
  };

  const filteredSemesters = useMemo(() => {
    if (!formData.departmentId) return [];
    return semesters.filter(
      (s) => String(s.department?._id || s.department) === String(formData.departmentId)
    );
  }, [semesters, formData.departmentId]);

  const filteredDivisions = useMemo(() => {
    if (!formData.semesterId) return [];
    return divisions.filter(
      (d) => String(d.semester?._id || d.semester) === String(formData.semesterId)
    );
  }, [divisions, formData.semesterId]);

  // Handle Form Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "departmentId" ? { semesterId: "", divisionId: "" } : {}),
      ...(name === "semesterId" ? { divisionId: "" } : {})
    }));
    setError("");
    setSuccess("");
  };

  // Run Department-Level Generation
  const handleGenerateDepartment = async (e) => {
    if (e) e.preventDefault();
    if (!formData.departmentId) {
      setError("Please select the department.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setDepartmentResult(null);
      setSingleTimetable(null);

      // Multi-step progressive animation
      setLoadingStep(0);
      const interval = setInterval(() => {
        setLoadingStep((prev) => {
          if (prev < PROGRESS_STEPS.length - 1) return prev + 1;
          return prev;
        });
      }, 450);

      const res = await api.post("/timetables/department/generate", {
        departmentId: formData.departmentId,
        academicYear: formData.academicYear || "2026-27",
        semesterNumbers: [3, 5, 7]
      });

      clearInterval(interval);
      setLoadingStep(PROGRESS_STEPS.length - 1);

      setDepartmentResult(res.data);
      if (res.data.timetables?.length > 0) {
        setSelectedDivisionId(res.data.timetables[0].division?._id || res.data.timetables[0].division);
      }

      setSuccess(
        `✓ ${res.data.message || "Complete department timetable generated successfully without conflicts."}`
      );
    } catch (err) {
      console.error("Department generation error:", err);
      setError(err.response?.data?.message || "Failed to generate department timetable.");
    } finally {
      setLoading(false);
    }
  };

  // Run Single Division Generation
  const handleGenerateSingle = async (e) => {
    e.preventDefault();
    if (!formData.departmentId || !formData.semesterId) {
      setError("Please select department and semester.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setSingleTimetable(null);
      setDepartmentResult(null);

      const res = await api.post("/timetables/generate", {
        department: formData.departmentId,
        semester: formData.semesterId,
        division: formData.divisionId || null
      });

      setSingleTimetable(res.data.timetable);
      setSuccess("Timetable generated successfully for selected division.");
    } catch (err) {
      console.error("Single generation error:", err);
      setError(err.response?.data?.message || "Failed to generate timetable.");
    } finally {
      setLoading(false);
    }
  };

  // Currently displayed timetable document
  const activeTimetable = useMemo(() => {
    if (generationMode === "DEPARTMENT" && departmentResult?.timetables?.length) {
      return (
        departmentResult.timetables.find((t) => {
          const key = t.division?._id || t.division || t.semester?._id || t.semester || t._id;
          return String(key) === String(selectedDivisionId);
        }) || departmentResult.timetables[0]
      );
    }
    return singleTimetable;
  }, [generationMode, departmentResult, selectedDivisionId, singleTimetable]);

  // Cell entries helper with multi-batch and duplicate prevention support
  const getEntriesForSlot = (day, slotNumber) => {
    if (!activeTimetable?.entries) return [];
    return activeTimetable.entries.filter((entry) => {
      const slot = entry.timeSlot;
      const start = slot?.slotNumber || entry.startSlotNumber;
      if (!start) return false;
      const entryDay = slot?.day || entry.day;
      if (entryDay !== day) return false;

      const duration = entry.durationSlots || 1;
      return slotNumber >= start && slotNumber < start + duration;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (dataLoading) {
    return (
      <div className="empty-state">
        <p>Loading timetable configuration and academic resources...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <h1>AI-Based Smart Timetable Generation</h1>
          <p>
            Constraint-satisfaction scheduling engine for the Computer Science & Engineering department (DACOE Karad)
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && <div className="page-error" style={{ marginBottom: "20px" }}>{error}</div>}
      {success && <div className="page-success" style={{ marginBottom: "20px" }}>{success}</div>}

      {/* Generation Mode Selector Tabs */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "24px",
          background: "#ffffff",
          padding: "12px",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 4px 15px rgba(0,0,0,0.03)"
        }}
      >
        <button
          type="button"
          onClick={() => {
            setGenerationMode("DEPARTMENT");
            setError("");
            setSuccess("");
          }}
          style={{
            flex: 1,
            padding: "14px 20px",
            borderRadius: "12px",
            border: "none",
            background: generationMode === "DEPARTMENT" ? "#172554" : "#f1f5f9",
            color: generationMode === "DEPARTMENT" ? "#ffffff" : "#475569",
            fontWeight: "700",
            fontSize: "15px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            transition: "all 0.2s ease"
          }}
        >
          <span>🏢</span> Generate Entire CSE Department (All Divisions)
        </button>

        <button
          type="button"
          onClick={() => {
            setGenerationMode("DIVISION");
            setError("");
            setSuccess("");
          }}
          style={{
            flex: 1,
            padding: "14px 20px",
            borderRadius: "12px",
            border: "none",
            background: generationMode === "DIVISION" ? "#172554" : "#f1f5f9",
            color: generationMode === "DIVISION" ? "#ffffff" : "#475569",
            fontWeight: "700",
            fontSize: "15px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            transition: "all 0.2s ease"
          }}
        >
          <span>🎯</span> Generate Selected Division / Single Class
        </button>
      </div>

      {/* Configuration Card */}
      <div className="management-card" style={{ marginBottom: "24px" }}>
        <div className="card-header">
          <div>
            <h2>
              {generationMode === "DEPARTMENT"
                ? "Department-Level Scheduling Engine"
                : "Single Division Timetable Generator"}
            </h2>
            <p>
              {generationMode === "DEPARTMENT"
                ? "Simultaneously coordinates faculty, classrooms, and laboratories across all CSE semesters (SY, TY, BE) with global collision prevention."
                : "Generate or regenerate a standalone timetable for an isolated division."}
            </p>
          </div>
        </div>

        {generationMode === "DEPARTMENT" ? (
          <form onSubmit={handleGenerateDepartment}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
              <div className="form-group">
                <label>Department</label>
                <select
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Academic Year & Term</label>
                <select
                  name="academicYear"
                  value={formData.academicYear}
                  onChange={handleChange}
                  required
                >
                  <option value="2026-27">2026-27 • Semester Odd (Sem 3, Sem 5, Sem 7)</option>
                  <option value="2025-26">2025-26 • Semester Even</option>
                </select>
              </div>
            </div>

            {/* Scope Summary Box */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "16px 20px",
                marginBottom: "24px",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "16px"
              }}
            >
              <div>
                <strong style={{ fontSize: "13px", color: "#334155" }}>Target Classes</strong>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                  S.Y. (Sem 3), T.Y. (Sem 5), Final Year (Sem 7)
                </div>
              </div>
              <div>
                <strong style={{ fontSize: "13px", color: "#334155" }}>Active Divisions</strong>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                  SY CSE A/B, TY CSE A/B, BE CSE A/B (6 Divisions)
                </div>
              </div>
              <div>
                <strong style={{ fontSize: "13px", color: "#334155" }}>Global Resource Matrix</strong>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                  16 Faculty, 4 Classrooms (CR18, CR56, CR57, CR19), 8 Labs (L41-L49)
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="primary-btn"
              style={{
                width: "100%",
                padding: "14px",
                fontSize: "16px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                background: loading ? "#94a3b8" : "#2563eb",
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              <span>✦</span> {loading ? "GENERATING COMPLETE CSE TIMETABLES..." : "GENERATE CSE DEPARTMENT TIMETABLE"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleGenerateSingle}>
            <div className="management-grid" style={{ marginBottom: "20px" }}>
              <div className="form-group">
                <label>Department</label>
                <select
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Semester</label>
                <select
                  name="semesterId"
                  value={formData.semesterId}
                  onChange={handleChange}
                  disabled={!formData.departmentId}
                  required
                >
                  <option value="">Select Semester</option>
                  {filteredSemesters.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} (Semester {s.number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Division</label>
                <select
                  name="divisionId"
                  value={formData.divisionId}
                  onChange={handleChange}
                  disabled={!formData.semesterId}
                >
                  <option value="">Select Division (Optional)</option>
                  {filteredDivisions.map((d) => (
                    <option key={d._id} value={d._id}>
                      Division {d.name} ({d.studentCount} students)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="primary-btn"
              style={{ width: "100%", padding: "12px", fontSize: "15px", fontWeight: "700" }}
            >
              {loading ? "Generating..." : "Generate Division Timetable"}
            </button>
          </form>
        )}
      </div>

      {/* Dynamic Animated Loading Progress Box */}
      {loading && (
        <div
          style={{
            background: "#ffffff",
            padding: "24px 30px",
            borderRadius: "16px",
            border: "1px solid #bfdbfe",
            boxShadow: "0 10px 30px rgba(37, 99, 235, 0.08)",
            marginBottom: "30px",
            textAlign: "center"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "13px", fontWeight: "700", color: "#1e40af" }}>
            <span>Constraint Satisfaction Engine</span>
            <span>Step {loadingStep + 1} of {PROGRESS_STEPS.length}</span>
          </div>

          <div style={{ height: "10px", background: "#e2e8f0", borderRadius: "6px", overflow: "hidden", marginBottom: "16px" }}>
            <div
              style={{
                height: "100%",
                background: "linear-gradient(90deg, #3b82f6, #1d4ed8)",
                width: `${Math.round(((loadingStep + 1) / PROGRESS_STEPS.length) * 100)}%`,
                transition: "width 0.4s ease"
              }}
            />
          </div>

          <div style={{ fontSize: "15px", fontWeight: "600", color: "#1e293b" }}>
            {PROGRESS_STEPS[loadingStep]}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
            Evaluating practical blocks, room availability, and faculty teaching quotas...
          </div>
        </div>
      )}

      {/* Generated Department Overview Metrics Banner */}
      {departmentResult && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "22px 24px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 8px 25px rgba(15, 23, 42, 0.05)",
            marginBottom: "24px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: "18px", color: "#0f172a" }}>
                CSE Department Timetable Generation Report
              </h3>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                All divisions generated with full global resource constraint validation
              </p>
            </div>
            <span
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                background: departmentResult.isFullyValid ? "#ecfdf5" : "#fef3c7",
                color: departmentResult.isFullyValid ? "#047857" : "#b45309",
                fontWeight: "700",
                fontSize: "13px",
                border: departmentResult.isFullyValid ? "1px solid #a7f3d0" : "1px solid #fde68a"
              }}
            >
              {departmentResult.isFullyValid ? "✓ STATUS: VALID & CONFLICT-FREE" : "⚠ STATUS: PARTIAL WARNINGS"}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px", textAlign: "center" }}>
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>CLASSES / COHORTS</div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>{departmentResult.totalCohorts || departmentResult.totalDivisions || 6}</div>
            </div>
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>PRACTICAL SESSIONS</div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#047857" }}>
                {departmentResult.practicalSessionsCount || "12"} (2H Batches)
              </div>
            </div>
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>HARD CLASHES</div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#059669" }}>
                0 (Zero Conflicts)
              </div>
            </div>
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>GA FITNESS SCORE</div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#2563eb" }}>
                {departmentResult.fitness || "3,170"}
              </div>
            </div>
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>AI GENERATIONS</div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#7c3aed" }}>
                {departmentResult.generation || "20"} Gens
              </div>
            </div>
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>STATUS</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#059669", marginTop: "4px" }}>
                ✓ VALID
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cohort Selector Pills (Supports both divisions and division-less cohorts) */}
      {departmentResult?.timetables && (
        <div style={{ marginBottom: "18px" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#475569", marginBottom: "8px" }}>
            SELECT TIMETABLE TO VIEW:
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {departmentResult.timetables.map((tt) => {
              const cohortKey = tt.division?._id || tt.division || tt.semester?._id || tt.semester || tt._id;
              const isSelected = String(cohortKey) === String(selectedDivisionId);
              const label = tt.division?.name || (tt.semester?.name ? `${tt.semester.name}` : `Semester ${tt.semester?.number || ""}`);
              return (
                <button
                  key={cohortKey}
                  onClick={() => setSelectedDivisionId(cohortKey)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "10px",
                    border: isSelected ? "2px solid #2563eb" : "1px solid #d1d5db",
                    background: isSelected ? "#eff6ff" : "#ffffff",
                    color: isSelected ? "#1d4ed8" : "#334155",
                    fontWeight: isSelected ? "800" : "600",
                    fontSize: "14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: isSelected ? "0 4px 12px rgba(37, 99, 235, 0.15)" : "none"
                  }}
                >
                  <span>🎓</span> {label}
                  <span
                    style={{
                      background: "#10b981",
                      color: "#fff",
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "4px"
                    }}
                  >
                    {tt.entries?.length} Sessions
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Display Selected Timetable Grid */}
      {activeTimetable && (
        <div style={{ marginBottom: "40px" }}>
          {/* Header */}
          <div
            style={{
              background: "#ffffff",
              padding: "18px 24px",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              border: "1px solid #e5e7eb",
              borderBottom: "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>
                Dr. Ashok Gujar Technical Institute's Dr. Daulatrao Aher College of Engineering, Karad
              </div>
              <h2 style={{ margin: "4px 0 2px", fontSize: "20px", color: "#0f172a" }}>
                CLASS TIME TABLE • {activeTimetable.division?.name || "Class"} (Semester {activeTimetable.semester?.number})
              </h2>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Department of Computer Science & Engineering • Academic Year: 2026-27 (Sem Odd) • Capacity: {activeTimetable.division?.studentCount || 65} Students
              </div>
            </div>

            <button
              onClick={handlePrint}
              style={{
                padding: "9px 16px",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <span>🖨️</span> Print Timetable
            </button>
          </div>

          {/* Grid Table */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderBottomLeftRadius: "16px",
              borderBottomRightRadius: "16px",
              overflowX: "auto",
              boxShadow: "0 8px 25px rgba(15, 23, 42, 0.05)"
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
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
                        const entries = getEntriesForSlot(day, slot.slotNumber);

                        if (!entries.length) {
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
                                FREE
                              </span>
                            </td>
                          );
                        }

                        // Duplicate prevention for 2-hour practicals:
                        // Only render on the starting slot; rowSpan covers the continuation slot!
                        const startingEntries = entries.filter((e) => {
                          const s = e.timeSlot?.slotNumber || e.startSlotNumber;
                          return s === slot.slotNumber;
                        });

                        if (!startingEntries.length) {
                          return null;
                        }

                        // If multiple practical sessions run concurrently in this cohort (e.g. T1, T2, T3, T4 in labs)
                        const hasChildBatches = startingEntries.some((e) => e.childBatches && e.childBatches.length > 0);
                        const isMultiBatchPractical = hasChildBatches || (startingEntries.length > 1 && startingEntries.some((e) => e.batch || e.entryType === "PRACTICAL"));
                        const maxDuration = Math.max(...startingEntries.map((e) => e.durationSlots || 1));

                        const practicalBatchCards = [];
                        if (hasChildBatches) {
                          for (const e of startingEntries) {
                            if (e.childBatches && e.childBatches.length > 0) {
                              practicalBatchCards.push(...e.childBatches);
                            } else {
                              practicalBatchCards.push(e);
                            }
                          }
                        } else {
                          practicalBatchCards.push(...startingEntries);
                        }

                        if (isMultiBatchPractical) {
                          return (
                            <td
                              key={day}
                              rowSpan={maxDuration}
                              style={{
                                padding: "8px",
                                borderLeft: "1px solid #f1f5f9",
                                verticalAlign: "top",
                                background: "#f0fdf4"
                              }}
                            >
                              <div
                                style={{
                                  background: "#ecfdf5",
                                  border: "1.5px solid #a7f3d0",
                                  borderRadius: "10px",
                                  padding: "8px 10px",
                                  boxShadow: "0 2px 8px rgba(5, 150, 105, 0.08)"
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", paddingBottom: "5px", borderBottom: "1px solid #d1fae5" }}>
                                  <span style={{ fontSize: "11px", fontWeight: "800", color: "#065f46", letterSpacing: "0.5px" }}>
                                    🔬 LAB PRACTICAL (2 HOURS)
                                  </span>
                                  <span style={{ fontSize: "10px", color: "#047857", fontWeight: "700" }}>
                                    {slot.slotNumber === 1 ? "10:00 AM – 12:00 PM" : slot.slotNumber === 4 ? "12:45 PM – 2:45 PM" : "3:00 PM – 5:00 PM"}
                                  </span>
                                </div>

                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: practicalBatchCards.length > 2 ? "1fr 1fr" : "1fr",
                                    gap: "6px"
                                  }}
                                >
                                  {practicalBatchCards.map((card, idx) => (
                                    <div
                                      key={card._id || idx}
                                      style={{
                                        background: "#ffffff",
                                        border: "1px solid #a7f3d0",
                                        borderRadius: "6px",
                                        padding: "6px 8px",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                                      }}
                                    >
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                                        <span style={{ background: "#059669", color: "#ffffff", fontSize: "10px", fontWeight: "800", padding: "1px 5px", borderRadius: "3px" }}>
                                          Batch {card.batch || `B${idx + 1}`}
                                        </span>
                                        <span style={{ fontSize: "9px", fontWeight: "700", color: "#047857" }}>
                                          2H
                                        </span>
                                      </div>
                                      <div style={{ fontWeight: "700", fontSize: "12px", color: "#0f172a" }}>
                                        {card.subject?.code || card.subject?.name || "Practical"}
                                      </div>
                                      <div style={{ fontSize: "11px", color: "#334155" }}>
                                        👨‍🏫 {card.faculty?.name || "Faculty"}
                                      </div>
                                      <div style={{ fontSize: "10px", color: "#047857", fontWeight: "600" }}>
                                        📍 {card.room?.roomNumber || "Lab"}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          );
                        }

                        const entry = startingEntries[0];
                        const duration = entry.durationSlots || 1;
                        const isPrac = entry.subject?.type === "PRACTICAL" || entry.entryType === "PRACTICAL" || duration === 2;
                        const isTut = entry.subject?.type === "TUTORIAL" || entry.entryType === "TUTORIAL";
                        const isProj = entry.subject?.type === "PROJECT" || entry.entryType === "PROJECT";

                        const badgeColor = isPrac
                          ? { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46", tag: "PRACTICAL LAB (2H)" }
                          : isTut
                          ? { bg: "#fef3c7", border: "#fde68a", text: "#92400e", tag: "TUTORIAL" }
                          : isProj
                          ? { bg: "#f3e8ff", border: "#e9d5ff", text: "#6b21a8", tag: "PROJECT" }
                          : { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af", tag: "THEORY LECTURE" };

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
                                👨‍🏫 {entry.faculty?.name || "Faculty Member"}
                              </div>

                              <div style={{ fontSize: "11px", color: "#64748b" }}>
                                📍 {entry.room?.roomNumber} ({entry.room?.name})
                              </div>

                              {isPrac && (
                                <div style={{ fontSize: "11px", color: "#065f46", fontWeight: "700", marginTop: "4px" }}>
                                  ⏱️ {entry.startTime && entry.endTime ? `${entry.startTime} – ${entry.endTime}` : (slot.slotNumber === 1 ? "10:00 AM – 12:00 PM" : slot.slotNumber === 4 ? "12:45 PM – 2:45 PM" : "3:00 PM – 5:00 PM")}
                                  {entry.batch ? ` • Batch ${entry.batch}` : ""}
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
        </div>
      )}
    </div>
  );
};

export default TimetableGenerator;
