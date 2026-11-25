import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const days = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
];

const dayNames = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
};

const getTodayName = () => {
  const dayIndex = new Date().getDay();

  const dayMap = {
    1: "MONDAY",
    2: "TUESDAY",
    3: "WEDNESDAY",
    4: "THURSDAY",
    5: "FRIDAY",
  };

  return dayMap[dayIndex] || null;
};

const formatDate = () => {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const StudentSchedule = () => {
  const [timetable, setTimetable] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");


  const today = getTodayName();

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/timetables/student/my");

      setTimetable(response.data.timetable);
      setTimeSlots(response.data.timeSlots || []);
    } catch (err) {
      console.error("Today's schedule error:", err);
 
      setErrorCode(err.response?.data?.code || "");

      setError(
        err.response?.data?.message ||
          "Failed to load today's schedule."
      );
    } finally {
      setLoading(false);
    }
  };

  const todaySlots = useMemo(() => {
    if (!today) return [];

    return timeSlots
      .filter((slot) => slot.day === today)
      .sort((a, b) => a.slotNumber - b.slotNumber);
  }, [timeSlots, today]);

  const todayEntries = useMemo(() => {
    if (!timetable?.entries || !today) return {};

    const map = {};

    timetable.entries.forEach((entry) => {
      if (!entry.timeSlot) return;

      if (entry.timeSlot.day !== today) return;

      const slotNumber = entry.timeSlot.slotNumber;

      map[slotNumber] = entry;
    });

    return map;
  }, [timetable, today]);

  const getEndTimeForEntry = (entry) => {
    if (!entry?.timeSlot) return "";

    if (entry.durationSlots === 2) {
      const secondSlot = todaySlots.find(
        (slot) =>
          slot.slotNumber ===
          entry.timeSlot.slotNumber + 1
      );

      if (secondSlot) {
        return secondSlot.endTime;
      }
    }

    return entry.timeSlot.endTime;
  };

  const scheduledEntries = todaySlots
    .filter((slot) => !slot.isBreak)
    .map((slot) => ({
      slot,
      entry: todayEntries[slot.slotNumber] || null,
    }));

  const totalClasses = scheduledEntries.filter(
    (item) => item.entry
  ).length;

  const practicalCount = scheduledEntries.filter(
    (item) =>
      item.entry?.durationSlots === 2
  ).length;

  const freeCount = scheduledEntries.filter(
    (item) => !item.entry
  ).length;

  if (loading) {
    return (
      <div className="student-page">
        <div className="schedule-loading">
          <div className="loading-spinner"></div>
          <h2>Loading today's schedule...</h2>
          <p>Please wait while we fetch your timetable.</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isAcademicAssignmentPending =
      errorCode === "ACADEMIC_ASSIGNMENT_PENDING";

    return (
      <div className="student-page">

        {isAcademicAssignmentPending ? (
          <div className="schedule-empty">

            <div className="empty-icon">
              🎓
            </div>

            <h2>
              Academic Assignment Pending
            </h2>

            <p>
              Your department, semester, and division
              have not been assigned yet.
            </p>

            <p>
              Please contact your administrator to
              complete your academic assignment.
            </p>

          </div>
        ) : (
          <div className="schedule-error">

            <div className="schedule-error-icon">
              !
            </div>

            <h2>
              Unable to load schedule
            </h2>

            <p>{error}</p>

            <button
              className="primary-button"
              onClick={fetchSchedule}
            >
              Try Again
            </button>

          </div>
        )}

      </div>
    );
  }

  if (!timetable) {
    return (
      <div className="student-page">
        <div className="schedule-empty">
          <div className="empty-icon">📅</div>
          <h2>No timetable available</h2>
          <p>
            Your published timetable is not available yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-page schedule-page">

      {/* PAGE HEADER */}
      <div className="page-heading">
        <div>
          <div className="schedule-title-row">
            <div className="schedule-title-icon">
              📅
            </div>

            <div>
              <h1>Today's Schedule</h1>

              <p>
                {formatDate()}
              </p>
            </div>
          </div>
        </div>

        <div className="schedule-day-badge">
          {today
            ? dayNames[today]
            : "Weekend"}
        </div>
      </div>

      {/* WEEKEND */}
      {!today ? (
        <div className="weekend-card">
          <div className="weekend-icon">
            🌿
          </div>

          <div>
            <h2>No classes today</h2>

            <p>
              Today is a non-working day. Enjoy your
              free time!
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* SUMMARY CARDS */}
          <div className="schedule-summary">

            <div className="schedule-summary-card">
              <div className="summary-icon summary-blue">
                📚
              </div>

              <div>
                <span>Total Classes</span>
                <strong>{totalClasses}</strong>
              </div>
            </div>

            <div className="schedule-summary-card">
              <div className="summary-icon summary-purple">
                🧪
              </div>

              <div>
                <span>Practicals</span>
                <strong>{practicalCount}</strong>
              </div>
            </div>

            <div className="schedule-summary-card">
              <div className="summary-icon summary-orange">
                ☕
              </div>

              <div>
                <span>Free Periods</span>
                <strong>{freeCount}</strong>
              </div>
            </div>

            <div className="schedule-summary-card">
              <div className="summary-icon summary-green">
                🎓
              </div>

              <div>
                <span>Division</span>
                <strong>
                  {timetable.division?.name || "-"}
                </strong>
              </div>
            </div>

          </div>

          {/* MAIN SCHEDULE */}
          <div className="section-card today-schedule-card">

            <div className="schedule-card-header">
              <div>
                <h2>
                  {dayNames[today]}'s Classes
                </h2>

                <p>
                  Your lectures, practicals and free
                  periods for today.
                </p>
              </div>

              <div className="schedule-status">
                <span></span>
                Published
              </div>
            </div>

            <div className="schedule-timeline">

              {todaySlots.map((slot) => {

                const entry =
                  todayEntries[slot.slotNumber];

                /* BREAK */
                if (slot.isBreak) {
                  return (
                    <div
                      className="schedule-break"
                      key={slot._id}
                    >
                      <div className="schedule-break-line"></div>

                      <div className="schedule-break-content">
                        <span className="break-icon-large">
                          ☕
                        </span>

                        <div>
                          <strong>Break</strong>

                          <span>
                            {slot.startTime} –{" "}
                            {slot.endTime}
                          </span>
                        </div>
                      </div>

                      <div className="schedule-break-line"></div>
                    </div>
                  );
                }

                /* PRACTICAL CONTINUATION */
                const previousSlotNumber =
                  slot.slotNumber - 1;

                const previousEntry =
                  todayEntries[
                    previousSlotNumber
                  ];

                if (
                  previousEntry?.durationSlots === 2
                ) {
                  return null;
                }

                /* FREE PERIOD */
                if (!entry) {
                  return (
                    <div
                      className="schedule-item free-period-item"
                      key={slot._id}
                    >
                      <div className="schedule-time">
                        <strong>
                          {slot.startTime}
                        </strong>

                        <span>
                          {slot.endTime}
                        </span>
                      </div>

                      <div className="schedule-line">
                        <div className="timeline-dot free-dot"></div>
                        <div className="timeline-vertical-line"></div>
                      </div>

                      <div className="schedule-content free-content">
                        <div className="free-period-header">
                          <span className="free-icon">
                            ○
                          </span>

                          <span>
                            Free Period
                          </span>
                        </div>

                        <p>
                          No class scheduled during
                          this period.
                        </p>
                      </div>
                    </div>
                  );
                }

                const isPractical =
                  entry.durationSlots === 2;

                const endTime =
                  getEndTimeForEntry(entry);

                return (
                  <div
                    className={`schedule-item ${
                      isPractical
                        ? "practical-schedule-item"
                        : "lecture-schedule-item"
                    }`}
                    key={slot._id}
                  >

                    {/* TIME */}
                    <div className="schedule-time">
                      <strong>
                        {slot.startTime}
                      </strong>

                      <span>
                        {endTime}
                      </span>
                    </div>

                    {/* TIMELINE */}
                    <div className="schedule-line">
                      <div
                        className={`timeline-dot ${
                          isPractical
                            ? "practical-dot"
                            : "lecture-dot"
                        }`}
                      ></div>

                      <div className="timeline-vertical-line"></div>
                    </div>

                    {/* CONTENT */}
                    <div className="schedule-content">

                      <div className="schedule-class-card">

                        <div className="schedule-class-top">

                          <span
                            className={`schedule-type ${
                              isPractical
                                ? "practical-type"
                                : "lecture-type"
                            }`}
                          >
                            {isPractical
                              ? `PRACTICAL${entry.batch ? ` [Batch ${entry.batch}]` : ""}`
                              : `LECTURE${entry.batch ? ` [Batch ${entry.batch}]` : ""}`}
                          </span>

                          <span className="schedule-duration">
                            {isPractical
                              ? "2 Hours"
                              : "1 Hour"}
                          </span>

                        </div>

                        <h3>
                          {entry.subject?.name ||
                            "Subject"}
                        </h3>

                        <div className="schedule-code">
                          {entry.subject?.code ||
                            "—"}
                        </div>

                        <div className="schedule-details">

                          <div>
                            <span className="detail-icon">
                              👨‍🏫
                            </span>

                            <div>
                              <small>
                                Faculty
                              </small>

                              <strong>
                                {entry.faculty?.name ||
                                  "Not assigned"}
                              </strong>
                            </div>
                          </div>

                          <div>
                            <span className="detail-icon">
                              🏫
                            </span>

                            <div>
                              <small>
                                Room
                              </small>

                              <strong>
                                {entry.room?.roomNumber ||
                                  "Not assigned"}
                              </strong>
                            </div>
                          </div>

                        </div>

                      </div>

                    </div>
                  </div>
                );
              })}

            </div>

            {/* NO CLASSES */}
            {todaySlots.length === 0 && (
              <div className="no-classes-card">
                <div>📭</div>

                <h3>
                  No schedule available
                </h3>

                <p>
                  There are no timetable slots
                  configured for today.
                </p>
              </div>
            )}

          </div>

          {/* ACADEMIC INFO */}
          <div className="schedule-academic-info">

            <div>
              <span>Department</span>
              <strong>
                {timetable.department?.name ||
                  "-"}
              </strong>
            </div>

            <div>
              <span>Semester</span>
              <strong>
                {timetable.semester?.number
                  ? `Semester ${timetable.semester.number}`
                  : "-"}
              </strong>
            </div>

            <div>
              <span>Division</span>
              <strong>
                {timetable.division?.name ||
                  "-"}
              </strong>
            </div>

            <div>
              <span>Students</span>
              <strong>
                {timetable.division?.studentCount ||
                  "-"}
              </strong>
            </div>

          </div>
        </>
      )}

    </div>
  );
};

export default StudentSchedule;