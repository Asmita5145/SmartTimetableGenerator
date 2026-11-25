import { useEffect, useState } from "react";
import api from "../services/api";

const days = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY"
];

const StudentTimetable = () => {
  const [timetable, setTimetable] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");


  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/timetables/student/my"
      );

      setTimetable(response.data.timetable);
      setTimeSlots(response.data.timeSlots || []);
    
      } catch (err) {
        console.error("Student timetable error:", err);

        setErrorCode(err.response?.data?.code || "");

        setError(
          err.response?.data?.message ||
            "Failed to load timetable."
        );
      } finally {
        setLoading(false);
      }

  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="student-page">
        <div className="page-heading">
          <div>
            <h1>My Timetable</h1>
            <p>
              View your weekly academic timetable.
            </p>
          </div>
        </div>

        <div className="section-card">
          <p>Loading your timetable...</p>
        </div>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    
  const isAcademicAssignmentPending =
    errorCode === "ACADEMIC_ASSIGNMENT_PENDING";

  return (
    <div className="student-page">

      <div className="page-heading">
        <div>
          <h1>My Timetable</h1>
          <p>
            View your weekly academic timetable.
          </p>
        </div>
      </div>

      <div className="section-card">

        {isAcademicAssignmentPending ? (
          <>
            <h2>Academic Assignment Pending</h2>

            <p>
              Your department, semester, and division
              have not been assigned yet.
            </p>

            <p>
              Please contact your administrator to
              complete your academic assignment.
            </p>
          </>
        ) : (
          <p className="page-error">
            {error}
          </p>
        )}

      </div>

    </div>
  );
}

  // =====================================================
  // NO TIMETABLE
  // =====================================================

  if (!timetable) {
    return (
      <div className="student-page">
        <div className="page-heading">
          <div>
            <h1>My Timetable</h1>
            <p>
              View your weekly academic timetable.
            </p>
          </div>
        </div>

        <div className="section-card">
          <p>No timetable available.</p>
        </div>
      </div>
    );
  }

  // =====================================================
  // CREATE ENTRY MAP
  // =====================================================

  const timetableMap = {};

  timetable.entries.forEach((entry) => {
    if (!entry.timeSlot) return;

    const day = entry.timeSlot.day;
    const slotNumber =
      entry.timeSlot.slotNumber;

    const key = `${day}-${slotNumber}`;

    timetableMap[key] = entry;

    // Practical occupies 2 consecutive slots
    if (entry.durationSlots === 2) {
      const secondKey =
        `${day}-${slotNumber + 1}`;

      timetableMap[secondKey] = {
        ...entry,
        isContinuation: true
      };
    }
  });

  // =====================================================
  // GET UNIQUE SLOT NUMBERS
  // =====================================================

  const slotNumbers = [
    ...new Set(
      timeSlots.map(
        (slot) => slot.slotNumber
      )
    )
  ].sort(
    (a, b) => a - b
  );

  // =====================================================
  // GET TIME SLOT BY NUMBER
  // =====================================================

  const getSlot = (slotNumber) => {
    return timeSlots.find(
      (slot) =>
        slot.slotNumber === slotNumber
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="student-page">

      {/* PAGE HEADER */}
      <div className="page-heading">

        <div>
          <h1>My Timetable</h1>

          <p>
            {timetable.department?.name}
            {" • "}
            Semester{" "}
            {timetable.semester?.number}
            {timetable.division?.name ? ` • Division ${timetable.division.name}` : " • Semester Class"}
          </p>
        </div>

        <div className="timetable-status">
          <span className="status-dot"></span>
          {timetable.status}
        </div>

      </div>


      {/* INFORMATION CARDS */}
      <div className="timetable-info-row">

        <div className="timetable-info-card">
          <span className="info-label">
            Department
          </span>

          <strong>
            {timetable.department?.code}
          </strong>
        </div>


        <div className="timetable-info-card">
          <span className="info-label">
            Semester
          </span>

          <strong>
            Sem {timetable.semester?.number}
          </strong>
        </div>


        <div className="timetable-info-card">
          <span className="info-label">
            {timetable.division?.name ? "Division" : "Class / Batches"}
          </span>

          <strong>
            {timetable.division?.name || "All Batches"}
          </strong>
        </div>


        <div className="timetable-info-card">
          <span className="info-label">
            Students
          </span>

          <strong>
            {timetable.division?.studentCount || timetable.semester?.studentCount || 72}
          </strong>
        </div>

      </div>


      {/* TIMETABLE CARD */}
      <div className="section-card timetable-card">

        {/* HEADER */}
        <div className="timetable-card-header">

          <div>
            <h2>
              Weekly Schedule
            </h2>

            <p>
              Your lectures and practical
              sessions for the week.
            </p>
          </div>

        </div>


        {/* TABLE */}
        <div className="timetable-scroll">

          <table className="student-timetable">

            <thead>

              <tr>

                <th className="time-column">
                  Time
                </th>

                {days.map((day) => (
                  <th key={day}>
                    {day}
                  </th>
                ))}

              </tr>

            </thead>


            <tbody>

              {slotNumbers.map((slotNumber) => {

                const slot = getSlot(slotNumber);

                const isBreak = slot?.isBreak;

                return (
                  <tr
                    key={slotNumber}
                    className={
                      isBreak ? "break-row" : ""
                    }
                  >

                    {/* TIME */}
                    <td className="time-cell">

                      <strong>
                        {slot?.startTime}
                      </strong>

                      <span>
                        {slot?.endTime}
                      </span>

                    </td>


                    {/* DAYS */}
                    {days.map((day) => {

                      const key =
                        `${day}-${slotNumber}`;

                      const entry =
                        timetableMap[key];


                      // =============================================
                      // BREAK
                      // =============================================

                      if (isBreak) {
                        return (
                          <td
                            key={day}
                            className="break-cell"
                          >

                            <div className="break-content">

                              <span className="break-icon">
                                ☕
                              </span>

                              <span>
                                Break
                              </span>

                            </div>

                          </td>
                        );
                      }


                      // =============================================
                      // SECOND SLOT OF PRACTICAL
                      // =============================================

                      if (entry?.isContinuation) {
                        return null;
                      }


                      // =============================================
                      // FREE PERIOD
                      // =============================================

                      if (!entry) {
                        return (
                          <td
                            key={day}
                            className="empty-cell"
                          >
                            <span>
                              Free
                            </span>
                          </td>
                        );
                      }


                      // =============================================
                      // PRACTICAL
                      // =============================================

                      const isPractical =
                        entry.durationSlots === 2;


                      if (isPractical) {

                        return (
                          <td
                            key={day}
                            rowSpan={2}
                            className="class-cell practical-cell practical-span-cell"
                          >

                            <div className="class-type" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span>PRACTICAL</span>
                              {entry.batch && (
                                <span style={{ background: "#059669", color: "#ffffff", padding: "1px 5px", borderRadius: "3px", fontSize: "10px", fontWeight: "700" }}>
                                  Batch {entry.batch}
                                </span>
                              )}
                            </div>


                            <div className="class-subject">
                              {entry.subject?.name}
                            </div>


                            <div className="class-code">
                              {entry.subject?.code}
                            </div>


                            <div className="practical-duration">
                              2 Hour Practical
                            </div>


                            <div className="class-details">

                              <span>
                                👨‍🏫{" "}
                                {entry.faculty?.name}
                              </span>

                              <span>
                                🏫{" "}
                                {entry.room?.roomNumber}
                              </span>

                            </div>

                          </td>
                        );
                      }


                      // =============================================
                      // NORMAL LECTURE
                      // =============================================

                      return (
                        <td
                          key={day}
                          className="class-cell lecture-cell"
                        >

                          <div className="class-type">
                            LECTURE
                          </div>


                          <div className="class-subject">
                            {entry.subject?.name}
                          </div>


                          <div className="class-code">
                            {entry.subject?.code}
                          </div>


                          <div className="class-details">

                            <span>
                              👨‍🏫{" "}
                              {entry.faculty?.name}
                            </span>

                            <span>
                              🏫{" "}
                              {entry.room?.roomNumber}
                            </span>

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


        {/* LEGEND */}
        <div className="timetable-legend">

          <div className="legend-item">

            <span
              className="legend-box lecture-legend"
            ></span>

            Lecture

          </div>


          <div className="legend-item">

            <span
              className="legend-box practical-legend"
            ></span>

            Practical

          </div>


          <div className="legend-item">

            <span
              className="legend-box free-legend"
            ></span>

            Free Period

          </div>


          <div className="legend-item">

            <span
              className="legend-box break-legend"
            ></span>

            Break

          </div>

        </div>

      </div>

    </div>
  );
};

export default StudentTimetable;