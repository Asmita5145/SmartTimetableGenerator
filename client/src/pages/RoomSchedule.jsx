import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "./RoomSchedule.css";

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

const RoomSchedule = () => {
  const [roomsList, setRoomsList] = useState([]);
  const [filterType, setFilterType] = useState("ALL"); // ALL | CLASSROOM | LAB
  const [selectedRoomId, setSelectedRoomId] = useState("");

  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadRooms = async () => {
      try {
        setInitialLoading(true);
        setError("");

        const res = await api.get("/rooms");
        const rooms = res.data.rooms || [];
        setRoomsList(rooms);

        if (rooms.length > 0) {
          setSelectedRoomId(rooms[0]._id);
        }
      } catch (err) {
        console.error("Load rooms error:", err);
        setError("Failed to load rooms list.");
      } finally {
        setInitialLoading(false);
      }
    };

    loadRooms();
  }, []);

  const filteredRooms = useMemo(() => {
    if (filterType === "ALL") return roomsList;
    return roomsList.filter((r) => r.type === filterType);
  }, [roomsList, filterType]);

  useEffect(() => {
    if (!selectedRoomId) {
      setRoomData(null);
      return;
    }

    const fetchRoomTimetable = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get(`/timetables/room/${selectedRoomId}`);
        setRoomData(res.data);
      } catch (err) {
        console.error("Fetch room timetable error:", err);
        setError(err.response?.data?.message || "Failed to load room schedule.");
        setRoomData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRoomTimetable();
  }, [selectedRoomId]);

  const getEntryForSlot = (day, slotNumber) => {
    if (!roomData?.entries) return null;
    return roomData.entries.find((entry) => {
      const slot = entry.timeSlot;
      if (!slot) return false;
      if (slot.day !== day) return false;

      const start = slot.slotNumber;
      const duration = entry.durationSlots || 1;
      return slotNumber >= start && slotNumber < start + duration;
    });
  };

  const selectedRoomObj = useMemo(() => {
    return (
      roomData?.room ||
      roomsList.find((r) => String(r._id) === String(selectedRoomId))
    );
  }, [roomData, roomsList, selectedRoomId]);

  const utilization = roomData?.utilization || {
    usedSlots: 0,
    totalSlots: 30,
    utilizationRate: "0%"
  };

  const handlePrint = () => {
    window.print();
  };

  if (initialLoading) {
    return (
      <div className="room-schedule-page">
        <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
          Loading room & lab schedules...
        </div>
      </div>
    );
  }

  return (
    <div className="room-schedule-page">
      {/* Header */}
      <div className="room-schedule-header">
        <div>
          <h1>Classroom & Laboratory Timetable</h1>
          <p>Real-time room occupancy, lab session allocation, and availability tracking</p>
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
          <span>🖨️</span> Print Schedule
        </button>
      </div>

      {/* Filter and Selection */}
      <div className="room-filter-card">
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "600", color: "#374151" }}>
            Select Classroom or Laboratory
          </label>
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            style={{
              width: "100%",
              height: "44px",
              padding: "0 12px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
              fontWeight: "500"
            }}
          >
            {filteredRooms.map((r) => (
              <option key={r._id} value={r._id}>
                {r.roomNumber} — {r.name} ({r.type}, Cap: {r.capacity})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "600", color: "#374151" }}>
            Filter Room Type
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            {["ALL", "CLASSROOM", "LAB"].map((type) => (
              <button
                key={type}
                onClick={() => {
                  setFilterType(type);
                  const matching = roomsList.filter((r) => type === "ALL" || r.type === type);
                  if (matching.length > 0) {
                    setSelectedRoomId(matching[0]._id);
                  }
                }}
                style={{
                  flex: 1,
                  height: "44px",
                  border: filterType === type ? "2px solid #2563eb" : "1px solid #d1d5db",
                  background: filterType === type ? "#eff6ff" : "#ffffff",
                  color: filterType === type ? "#1d4ed8" : "#475569",
                  borderRadius: "10px",
                  fontWeight: "600",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                {type === "ALL" ? "All" : type === "CLASSROOM" ? "Classrooms" : "Labs"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: "14px 18px", background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "12px", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {/* Selected Room Profile Banner */}
      {selectedRoomObj && (
        <div className="room-info-card">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div className="room-avatar">
              {selectedRoomObj.type === "LAB" ? "🔬" : "🏫"}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <h2 style={{ margin: 0, fontSize: "22px", color: "#0f172a" }}>
                  {selectedRoomObj.roomNumber}
                </h2>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "700",
                    background: selectedRoomObj.type === "LAB" ? "#ecfdf5" : "#eff6ff",
                    color: selectedRoomObj.type === "LAB" ? "#047857" : "#1d4ed8",
                    border: selectedRoomObj.type === "LAB" ? "1px solid #a7f3d0" : "1px solid #bfdbfe"
                  }}
                >
                  {selectedRoomObj.type}
                </span>
              </div>
              <p style={{ margin: "0 0 4px", color: "#64748b", fontSize: "14px" }}>
                {selectedRoomObj.name} • Seating Capacity: <strong>{selectedRoomObj.capacity} Students</strong>
              </p>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px" }}>
                Department of Computer Science & Engineering • Dr. Daulatrao Aher College of Engineering, Karad
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "20px", textAlign: "center" }}>
            <div style={{ background: "#eff6ff", padding: "12px 20px", borderRadius: "12px" }}>
              <div style={{ fontSize: "12px", color: "#1e40af", fontWeight: "600" }}>OCCUPIED SLOTS</div>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#1d4ed8" }}>{utilization.usedSlots} / 30</div>
            </div>
            <div style={{ background: "#f0fdf4", padding: "12px 20px", borderRadius: "12px" }}>
              <div style={{ fontSize: "12px", color: "#166534", fontWeight: "600" }}>FREE SLOTS</div>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#15803d" }}>{30 - utilization.usedSlots} Slots</div>
            </div>
            <div style={{ background: "#172554", color: "#fff", padding: "12px 22px", borderRadius: "12px" }}>
              <div style={{ fontSize: "12px", color: "#93c5fd", fontWeight: "600" }}>UTILIZATION RATE</div>
              <div style={{ fontSize: "24px", fontWeight: "800" }}>{utilization.utilizationRate}</div>
            </div>
          </div>
        </div>
      )}

      {/* College Schedule Header */}
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
          ROOM / LAB MASTER TIME TABLE • {selectedRoomObj?.roomNumber} ({selectedRoomObj?.name})
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
                              padding: "4px 12px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: "600",
                              background: "#f1f5f9",
                              color: "#10b981",
                              letterSpacing: "1px"
                            }}
                          >
                            ✓ AVAILABLE
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
                    const badgeColor = isPrac
                      ? { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46", tag: "PRACTICAL LAB (2H)" }
                      : { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af", tag: "LECTURE / TUTORIAL" };

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

                          <div style={{ fontSize: "12px", color: "#1e3a8a", fontWeight: "700", marginBottom: "2px" }}>
                            🎓 Class: {entry.division?.name || (entry.semester?.name ? `${entry.semester.name}` : `Sem ${entry.semester?.number || ""}`)}
                            {entry.batch ? ` [Batch ${entry.batch}]` : ""}
                          </div>

                          <div style={{ fontSize: "11px", color: "#475569" }}>
                            👨‍🏫 {entry.faculty?.name || "Faculty Member"}
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
    </div>
  );
};

export default RoomSchedule;
