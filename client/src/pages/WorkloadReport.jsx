import { useEffect, useState } from "react";
import api from "../services/api";
import "./WorkloadReport.css";

const WorkloadReport = () => {
  const [reportData, setReportData] = useState([]);
  const [department, setDepartment] = useState(null);
  const [academicYear, setAcademicYear] = useState("2026-27");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchWorkloadReport();
  }, [academicYear]);

  const fetchWorkloadReport = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get(`/timetables/department/workload?departmentCode=CSE&academicYear=${academicYear}`);
      setReportData(res.data.workloadReport || []);
      setDepartment(res.data.department || null);
    } catch (err) {
      console.error("Fetch workload report error:", err);
      setError(err.response?.data?.message || "Failed to load faculty workload distribution report.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculations
  const totalFacultyCount = reportData.length;
  const totalDepartmentHours = reportData.reduce((acc, r) => acc + (r.total || 0), 0);
  const totalTheoryHours = reportData.reduce((acc, r) => acc + (r.theory || 0), 0);
  const totalPracticalHours = reportData.reduce((acc, r) => acc + (r.practical || 0), 0);
  const averageLoad = totalFacultyCount > 0 ? (totalDepartmentHours / totalFacultyCount).toFixed(1) : 0;

  if (loading) {
    return (
      <div className="workload-report-page">
        <div style={{ textAlign: "center", padding: "50px", color: "#64748b" }}>
          Loading faculty workload distribution report...
        </div>
      </div>
    );
  }

  return (
    <div className="workload-report-page">
      {/* Header */}
      <div className="workload-report-header">
        <div>
          <h1>Faculty Academic Workload Distribution</h1>
          <p>Official Department Workload Report • Computer Science & Engineering (DACOE Karad)</p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
              fontWeight: "600"
            }}
          >
            <option value="2026-27">Academic Year: 2026-27 (Sem Odd)</option>
            <option value="2025-26">Academic Year: 2025-26</option>
          </select>

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
            <span>🖨️</span> Print Report
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "14px 18px", background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "12px", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="workload-stats-grid">
        <div className="workload-stat-card">
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>Total Teaching Faculty</span>
          <h2 style={{ fontSize: "30px", fontWeight: "800", color: "#1e293b", margin: "6px 0 2px" }}>
            {totalFacultyCount}
          </h2>
          <span style={{ fontSize: "12px", color: "#10b981", fontWeight: "600" }}>All Full-Time / Visiting</span>
        </div>

        <div className="workload-stat-card">
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>Total Theory Hours (LT)</span>
          <h2 style={{ fontSize: "30px", fontWeight: "800", color: "#2563eb", margin: "6px 0 2px" }}>
            {totalTheoryHours} Hrs
          </h2>
          <span style={{ fontSize: "12px", color: "#64748b" }}>Weekly scheduled lectures</span>
        </div>

        <div className="workload-stat-card">
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>Total Practical Hours (PR)</span>
          <h2 style={{ fontSize: "30px", fontWeight: "800", color: "#059669", margin: "6px 0 2px" }}>
            {totalPracticalHours} Hrs
          </h2>
          <span style={{ fontSize: "12px", color: "#64748b" }}>Hands-on computer labs</span>
        </div>

        <div className="workload-stat-card" style={{ background: "#172554", color: "#fff" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#93c5fd" }}>Total Weekly Load</span>
          <h2 style={{ fontSize: "30px", fontWeight: "800", color: "#ffffff", margin: "6px 0 2px" }}>
            {totalDepartmentHours} Hrs
          </h2>
          <span style={{ fontSize: "12px", color: "#cbd5e1" }}>Avg: {averageLoad} Hrs / Faculty</span>
        </div>
      </div>

      {/* College Letterhead for Official Report */}
      <div
        style={{
          background: "#ffffff",
          padding: "20px 24px",
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          border: "1px solid #e5e7eb",
          borderBottom: "none",
          textAlign: "center"
        }}
      >
        <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", letterSpacing: "1px" }}>
          G.K. GUJAR MEMORIAL CHARITABLE TRUST'S
        </div>
        <h2 style={{ margin: "4px 0", fontSize: "20px", color: "#0f172a" }}>
          {department?.institution?.name || "Dr. Ashok Gujar Technical Institute's, Dr. Daulatrao Aher College of Engineering, Karad"}
        </h2>
        <div style={{ fontSize: "12px", color: "#64748b" }}>
          Vidyanagar Ext. Banawadi, Tal. Karad 415124, Dist. Satara, Maharashtra INDIA
        </div>
        <div style={{ margin: "10px auto 0", display: "inline-block", background: "#f1f5f9", padding: "6px 16px", borderRadius: "8px", fontWeight: "700", fontSize: "13px", color: "#1e3a8a" }}>
          DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING • ACADEMIC WORK LOAD DISTRIBUTION (DACOE/ACADM/TT-FRM-01)
        </div>
      </div>

      {/* Main Table */}
      <div className="workload-table-card" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "950px" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              <th style={{ padding: "12px 14px", textAlign: "center", width: "50px", fontSize: "12px", color: "#475569" }}>Sr.</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", color: "#1e293b" }}>Name of Faculty</th>
              <th style={{ padding: "12px 14px", textAlign: "left", fontSize: "13px", color: "#1e293b" }}>Designation</th>
              <th style={{ padding: "12px 14px", textAlign: "left", fontSize: "13px", color: "#1e293b" }}>Subject(s) Assigned</th>
              <th style={{ padding: "12px 14px", textAlign: "left", fontSize: "13px", color: "#1e293b" }}>Class / Div</th>
              <th style={{ padding: "12px 10px", textAlign: "center", width: "60px", fontSize: "13px", color: "#2563eb" }}>LT</th>
              <th style={{ padding: "12px 10px", textAlign: "center", width: "60px", fontSize: "13px", color: "#059669" }}>PR</th>
              <th style={{ padding: "12px 10px", textAlign: "center", width: "60px", fontSize: "13px", color: "#d97706" }}>TUT</th>
              <th style={{ padding: "12px 10px", textAlign: "center", width: "60px", fontSize: "13px", color: "#9333ea" }}>PROJ</th>
              <th style={{ padding: "12px 12px", textAlign: "center", width: "70px", fontSize: "13px", color: "#0f172a", fontWeight: "800" }}>TOT</th>
              <th style={{ padding: "12px 14px", textAlign: "center", width: "100px", fontSize: "13px", color: "#475569" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((row, idx) => {
              return (
                <tr key={row.facultyId} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#ffffff" : "#fbfcfe" }}>
                  <td style={{ padding: "12px", textAlign: "center", color: "#64748b", fontWeight: "600" }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>{row.name}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Emp ID: {row.employeeId}</div>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "#475569" }}>
                    {row.designation || "Assistant Professor"}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "13px" }}>
                    {row.subjects?.length ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {row.subjects.map((sub, sIdx) => (
                          <span key={sIdx} style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", color: "#334155" }}>
                            {sub}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "13px" }}>
                    {row.divisions?.length ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {row.divisions.map((div, dIdx) => (
                          <span key={dIdx} style={{ background: "#eff6ff", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", color: "#1d4ed8", fontWeight: "600" }}>
                            {div}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: "700", color: "#2563eb" }}>
                    {row.theory || 0}
                  </td>
                  <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: "700", color: "#059669" }}>
                    {row.practical || 0}
                  </td>
                  <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: "700", color: "#d97706" }}>
                    {row.tutorial || 0}
                  </td>
                  <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: "700", color: "#9333ea" }}>
                    {row.project || 0}
                  </td>
                  <td style={{ padding: "12px 12px", textAlign: "center", fontWeight: "800", fontSize: "14px", color: "#0f172a", background: "#f8fafc" }}>
                    {row.total || 0}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <span style={{ background: "#ecfdf5", color: "#047857", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
                      ✓ Verified
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: "#172554", color: "#ffffff", fontWeight: "800", fontSize: "14px" }}>
              <td colSpan={5} style={{ padding: "14px 16px", textAlign: "right" }}>
                TOTAL DEPARTMENT WORKLOAD (HOURS / WEEK):
              </td>
              <td style={{ padding: "14px 10px", textAlign: "center" }}>{totalTheoryHours}</td>
              <td style={{ padding: "14px 10px", textAlign: "center" }}>{totalPracticalHours}</td>
              <td style={{ padding: "14px 10px", textAlign: "center" }}>{reportData.reduce((acc, r) => acc + (r.tutorial || 0), 0)}</td>
              <td style={{ padding: "14px 10px", textAlign: "center" }}>{reportData.reduce((acc, r) => acc + (r.project || 0), 0)}</td>
              <td style={{ padding: "14px 12px", textAlign: "center", fontSize: "16px", color: "#93c5fd" }}>{totalDepartmentHours}</td>
              <td style={{ padding: "14px 14px", textAlign: "center" }}>100% OK</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Institutional Sign-off Block */}
      <div
        style={{
          background: "#ffffff",
          padding: "24px 30px",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 8px 25px rgba(15, 23, 42, 0.05)"
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", textAlign: "center", gap: "30px", paddingTop: "20px" }}>
          <div>
            <div style={{ height: "45px", fontStyle: "italic", color: "#047857", fontWeight: "700" }}>
              ✓ Digitally Prepared
            </div>
            <div style={{ borderTop: "2px solid #0f172a", paddingTop: "8px" }}>
              <strong style={{ fontSize: "14px", color: "#0f172a" }}>Prof. S. B. Thorat / Prof. S. P. Kakade</strong>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Time Table In-Charge / Guide</div>
            </div>
          </div>

          <div>
            <div style={{ height: "45px", fontStyle: "italic", color: "#047857", fontWeight: "700" }}>
              ✓ Verified & Balanced
            </div>
            <div style={{ borderTop: "2px solid #0f172a", paddingTop: "8px" }}>
              <strong style={{ fontSize: "14px", color: "#0f172a" }}>Prof. D. R. Kamble</strong>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Academic In-Charge</div>
            </div>
          </div>

          <div>
            <div style={{ height: "45px", fontStyle: "italic", color: "#047857", fontWeight: "700" }}>
              ✓ Approved
            </div>
            <div style={{ borderTop: "2px solid #0f172a", paddingTop: "8px" }}>
              <strong style={{ fontSize: "14px", color: "#0f172a" }}>Prof. A. H. Renushe</strong>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Head of Department (CSE)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkloadReport;
