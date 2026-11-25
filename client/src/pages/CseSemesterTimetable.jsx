import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "./CseSemesterTimetable.css";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
];

const TIME_SLOTS = [
  {
    key: "10:00-11:00",
    start: "10:00",
    end: "11:00",
    label: "10:00 - 11:00",
  },
  {
    key: "11:00-12:00",
    start: "11:00",
    end: "12:00",
    label: "11:00 - 12:00",
  },
  {
    key: "12:45-13:45",
    start: "12:45",
    end: "13:45",
    label: "12:45 - 1:45",
  },
  {
    key: "13:45-14:45",
    start: "13:45",
    end: "14:45",
    label: "1:45 - 2:45",
  },
  {
    key: "15:00-16:00",
    start: "15:00",
    end: "16:00",
    label: "3:00 - 4:00",
  },
  {
    key: "16:00-17:00",
    start: "16:00",
    end: "17:00",
    label: "4:00 - 5:00",
  },
];

const FIXED_ACTIVITIES_BY_SEMESTER = {
  3: [
    {
      code: "LIB",
      name: "Library Hour",
      entryType: "LIBRARY",
      durationHours: 1,
      isFixed: true,
    },
    {
      code: "APT1",
      name: "Aptitude Hour",
      entryType: "APTITUDE",
      durationHours: 1,
      isFixed: true,
    },
    {
      code: "APT2",
      name: "Aptitude Hour",
      entryType: "APTITUDE",
      durationHours: 1,
      isFixed: true,
    },
    {
      code: "MENTOR",
      name: "Mentor Hour",
      entryType: "MENTOR",
      durationHours: 1,
      isFixed: true,
    },
  ],

  5: [
    {
      code: "LIB",
      name: "Library Hour",
      entryType: "LIBRARY",
      durationHours: 1,
      isFixed: true,
    },
    {
      code: "APT1",
      name: "Aptitude Hour",
      entryType: "APTITUDE",
      durationHours: 1,
      isFixed: true,
    },
  ],

  7: [],
};

const CseSemesterTimetable = () => {
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);

  const [departmentId, setDepartmentId] = useState("");
  const [semesterId, setSemesterId] = useState("");

  const [timetable, setTimetable] = useState(null);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // ALL = complete semester view
  // S1/S2/S3/S4 = individual batch view
  const [activeBatch, setActiveBatch] = useState("ALL");

  // ==========================================
  // LOAD ACADEMIC DATA
  // ==========================================

  useEffect(() => {
    loadAcademicData();
  }, []);

  const loadAcademicData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        departmentsResponse,
        semestersResponse,
      ] = await Promise.all([
        api.get("/departments"),
        api.get("/semesters"),
      ]);

      const departmentData =
        departmentsResponse.data.departments || [];

      const semesterData =
        semestersResponse.data.semesters || [];

      setDepartments(departmentData);
      setSemesters(semesterData);

      // Automatically select CSE
      const cseDepartment = departmentData.find(
        (department) =>
          department.name?.toLowerCase() === "cse" ||
          department.code?.toLowerCase() === "cse" ||
          department.name
            ?.toLowerCase()
            .includes("computer science")
      );

      if (!cseDepartment) {
        return;
      }

      setDepartmentId(cseDepartment._id);

      const cseSemesters = semesterData.filter(
        (semester) =>
          String(
            semester.department?._id ||
              semester.department
          ) === String(cseDepartment._id)
      );

      // Automatically select Semester 3
      const semester3 = cseSemesters.find(
        (semester) =>
          semester.name
            ?.toLowerCase()
            .includes("3") ||
          semester.semesterNumber === 3 ||
          semester.number === 3
      );

      if (semester3) {
        setSemesterId(semester3._id);
      }
    } catch (err) {
      console.error(
        "Academic data loading error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load departments and semesters."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // FILTER SEMESTERS
  // ==========================================

  const filteredSemesters = useMemo(() => {
    if (!departmentId) {
      return [];
    }

    return semesters.filter(
      (semester) =>
        String(
          semester.department?._id ||
            semester.department
        ) === String(departmentId)
    );
  }, [semesters, departmentId]);

  // ==========================================
  // GENERATE TIMETABLE
  // ==========================================

  const generateTimetable = async () => {
    if (!departmentId || !semesterId) {
      setError(
        "Please select a department and semester."
      );
      return;
    }

    try {
      setGenerating(true);
      setError("");
      setTimetable(null);
      setActiveBatch("ALL");

      const response = await api.post(
        "/cse-semester-timetables/generate",
        {
          departmentId,
          semesterId,
          fixedActivities: FIXED_ACTIVITIES,
        }
      );

      setTimetable(response.data);
    } catch (err) {
      console.error(
        "Timetable generation error:",
        err
      );

      const responseData = err.response?.data;

      let message =
        responseData?.message ||
        "Unable to generate timetable.";

      if (
        responseData?.conflicts &&
        responseData.conflicts.length > 0
      ) {
        message += "\n\n";

        message += responseData.conflicts
          .map((conflict, index) => {
            if (typeof conflict === "string") {
              return `${index + 1}. ${conflict}`;
            }

            if (conflict?.message) {
              return `${index + 1}. ${conflict.message}`;
            }

            if (conflict?.error) {
              return `${index + 1}. ${conflict.error}`;
            }

            return `${index + 1}. ${JSON.stringify(
              conflict
            )}`;
          })
          .join("\n");
      }

      if (
        responseData?.validation?.errors?.length
      ) {
        message +=
          "\n\nValidation Errors:\n";

        message += responseData.validation.errors
          .map((validationError, index) => {
            if (
              typeof validationError === "string"
            ) {
              return `${index + 1}. ${validationError}`;
            }

            return `${index + 1}. ${
              validationError.message ||
              validationError.error ||
              JSON.stringify(validationError)
            }`;
          })
          .join("\n");
      }

      console.error(
        "Full generation response:",
        responseData
      );

      setError(message);
    } finally {
      setGenerating(false);
    }
  };

  // ==========================================
  // SELECTED ACADEMIC STRUCTURE
  // ==========================================

  const selectedSemester = semesters.find(
    (semester) =>
      String(semester._id) ===
      String(semesterId)
  );

  const selectedDepartment = departments.find(
    (department) =>
      String(department._id) ===
      String(departmentId)
  );

  // ==========================================
  // ENTRIES
  // ==========================================

  const entries =
    timetable?.timetable?.entries ||
    timetable?.entries ||
    [];

  // ==========================================
  // BATCHES
  // ==========================================

  const batches = useMemo(() => {
    return [
      ...new Set(
        entries
          .filter((entry) => entry.batchName)
          .map((entry) => entry.batchName)
      ),
    ].sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
      })
    );
  }, [entries]);

  // ==========================================
  // SELECTED BATCH STATISTICS
  // ==========================================

  const selectedBatchEntries = useMemo(() => {
    if (activeBatch === "ALL") {
      return entries;
    }

    return entries.filter(
      (entry) =>
        entry.batchName === activeBatch ||
        !entry.batchName
    );
  }, [entries, activeBatch]);

  const selectedBatchPracticals = useMemo(() => {
    return selectedBatchEntries.filter(
      (entry) =>
        entry.entryType === "PRACTICAL"
    );
  }, [selectedBatchEntries]);

  const selectedBatchTheory = useMemo(() => {
    return selectedBatchEntries.filter(
      (entry) =>
        entry.entryType === "LECTURE"
    );
  }, [selectedBatchEntries]);

  // ==========================================
  // GET CELL ENTRIES
  //
  // Practical sessions are represented only
  // at their START slot.
  // ==========================================

const getEntriesForCell = (day, slot) => {
  return entries.filter((entry) => {
    if (entry.day !== day) {
      return false;
    }

    // Normal 1-hour entry
    if (
      entry.startTime === slot.start &&
      Number(entry.durationHours) !== 2
    ) {
      return true;
    }

    // 2-hour practical starts here
    if (
      entry.startTime === slot.start &&
      Number(entry.durationHours) === 2
    ) {
      return true;
    }

    return false;
  });
};

const hasPracticalFromPreviousSlot = (
  day,
  slot
) => {
  const currentIndex = TIME_SLOTS.findIndex(
    (item) => item.key === slot.key
  );

  if (currentIndex <= 0) {
    return false;
  }

  const previousSlot =
    TIME_SLOTS[currentIndex - 1];

  return entries.some((entry) => {
    if (
      entry.day !== day ||
      entry.entryType !== "PRACTICAL"
    ) {
      return false;
    }

    if (
      Number(entry.durationHours) !== 2
    ) {
      return false;
    }

    return (
      entry.startTime === previousSlot.start
    );
  });
};

  // ==========================================
  // ENTRY HELPERS
  // ==========================================

  const isPractical = (entry) => {
    return (
      entry.entryType === "PRACTICAL"
    );
  };

  const groupPracticalEntries = (
    cellEntries
  ) => {
    const practicals =
      cellEntries.filter(isPractical);

    const others =
      cellEntries.filter(
        (entry) => !isPractical(entry)
      );

    return {
      practicals,
      others,
    };
  };

  // ==========================================
  // BATCH FILTER
  //
  // Semester-wide entries are always visible.
  // Practical entries are filtered by batch.
  // ==========================================

  const visibleEntries = (cellEntries) => {
    if (activeBatch === "ALL") {
      return cellEntries;
    }

    return cellEntries.filter(
      (entry) =>
        entry.batchName === activeBatch ||
        !entry.batchName
    );
  };

  // ==========================================
  // ENTRY CLASS
  // ==========================================

  const getEntryClass = (entry) => {
    if (
      entry.entryType === "PRACTICAL"
    ) {
      return "timetable-entry practical-entry";
    }

    if (
      [
        "MDM",
        "LIBRARY",
        "APTITUDE",
        "MENTOR",
        "PROJECT",
        "ACTIVITY",
      ].includes(entry.entryType)
    ) {
      return "timetable-entry activity-entry";
    }

    return "timetable-entry theory-entry";
  };

  // ==========================================
  // ENTRY DURATION
  // ==========================================

  const getEntryDurationClass = (
    entry
  ) => {
    if (
      entry.entryType === "PRACTICAL" &&
      Number(entry.durationHours) === 2
    ) {
      return "two-hour-entry";
    }

    return "one-hour-entry";
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="cse-timetable-page">

      {/* ====================================== */}
      {/* HEADER */}
      {/* ====================================== */}

      <div className="cse-timetable-header">
        <div>
          <div className="page-eyebrow">
            AI TIMETABLE GENERATION
          </div>

          <h1>
            CSE Semester Timetable
          </h1>

          <p>
            Generate and manage an optimized
            semester timetable with faculty,
            room, batch and practical constraints.
          </p>
        </div>

        <div className="header-status">
          <span className="status-dot"></span>
          Semester Scheduler
        </div>
      </div>

      {/* ====================================== */}
      {/* CONFIGURATION */}
      {/* ====================================== */}

      <div className="configuration-card">
        <div className="configuration-title">
          <div>
            <h2>
              Timetable Configuration
            </h2>

            <p>
              Select the academic structure
              before generating the timetable.
            </p>
          </div>
        </div>

        <div className="configuration-grid">

          {/* DEPARTMENT */}

          <div className="form-group">
            <label>
              Department
            </label>

            <select
              value={departmentId}
              onChange={(event) => {
                setDepartmentId(
                  event.target.value
                );

                setSemesterId("");
                setTimetable(null);
                setActiveBatch("ALL");
              }}
              disabled={loading}
            >
              <option value="">
                Select Department
              </option>

              {departments.map(
                (department) => (
                  <option
                    key={department._id}
                    value={department._id}
                  >
                    {department.name}
                  </option>
                )
              )}
            </select>
          </div>

          {/* SEMESTER */}

          <div className="form-group">
            <label>
              Semester
            </label>

            <select
              value={semesterId}
              onChange={(event) => {
                setSemesterId(
                  event.target.value
                );

                setTimetable(null);
                setActiveBatch("ALL");
              }}
              disabled={
                loading ||
                !departmentId
              }
            >
              <option value="">
                Select Semester
              </option>

              {filteredSemesters.map(
                (semester) => (
                  <option
                    key={semester._id}
                    value={semester._id}
                  >
                    {semester.name}
                  </option>
                )
              )}
            </select>
          </div>

          {/* GENERATE */}

          <div className="generate-action">
            <button
              className="generate-button"
              onClick={generateTimetable}
              disabled={
                generating ||
                !departmentId ||
                !semesterId
              }
            >
              {generating ? (
                <>
                  <span className="spinner"></span>
                  Generating...
                </>
              ) : (
                <>
                  Generate Timetable
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </div>

        {selectedDepartment &&
          selectedSemester && (
            <div className="selection-summary">
              <span>
                {selectedDepartment.name}
              </span>

              <span className="summary-separator">
                /
              </span>

              <span>
                {selectedSemester.name}
              </span>

              <span className="summary-separator">
                /
              </span>

              <span>
                Academic Year 2026–27
              </span>
            </div>
          )}
      </div>

      {/* ====================================== */}
      {/* ERROR */}
      {/* ====================================== */}

      {error && (
        <div className="generation-error">
          <div className="error-icon">
            !
          </div>

          <div>
            <strong>
              Timetable generation failed
            </strong>

            <pre>{error}</pre>
          </div>
        </div>
      )}

      {/* ====================================== */}
      {/* GENERATED TIMETABLE */}
      {/* ====================================== */}

      {timetable && (
        <>
          {/* ================================= */}
          {/* SUMMARY */}
          {/* ================================= */}

          <div className="timetable-summary">

            <div className="summary-card">
              <span>Total Entries</span>

              <strong>
                {timetable.summary
                  ?.totalEntries ||
                  entries.length}
              </strong>
            </div>

            <div className="summary-card">
              <span>Theory Classes</span>

              <strong>
                {timetable.summary
                  ?.theoryEntries ||
                  entries.filter(
                    (entry) =>
                      entry.entryType ===
                      "LECTURE"
                  ).length}
              </strong>
            </div>

            <div className="summary-card">
              <span>Practical Sessions</span>

              <strong>
                {timetable.summary
                  ?.practicalEntries ||
                  entries.filter(
                    (entry) =>
                      entry.entryType ===
                      "PRACTICAL"
                  ).length}
              </strong>
            </div>

            <div className="summary-card validation-card">
              <span>Validation</span>

              <strong
                className={
                  timetable.validation
                    ?.isValid
                    ? "valid-text"
                    : "invalid-text"
                }
              >
                {timetable.validation
                  ?.isValid
                  ? "VALID"
                  : "CHECK"}
              </strong>
            </div>
          </div>

          {/* ================================= */}
          {/* BATCH VIEW */}
          {/* ================================= */}

          {batches.length > 0 && (
            <div className="batch-filter-card">

              <div>
                <h3>
                  Timetable View
                </h3>

                <p>
                  Switch between the complete
                  semester timetable and an
                  individual practical batch.
                </p>
              </div>

              <div className="batch-buttons">

                {/* SEMESTER VIEW */}

                <button
                  className={
                    activeBatch === "ALL"
                      ? "batch-button active"
                      : "batch-button"
                  }
                  onClick={() =>
                    setActiveBatch("ALL")
                  }
                >
                  Semester
                </button>

                {/* BATCH VIEWS */}

                {batches.map(
                  (batch) => (
                    <button
                      key={batch}
                      className={
                        activeBatch === batch
                          ? "batch-button active"
                          : "batch-button"
                      }
                      onClick={() =>
                        setActiveBatch(batch)
                      }
                    >
                      {batch}
                    </button>
                  )
                )}
              </div>

              {/* CURRENT VIEW */}

              <div className="selection-summary">
                <span>
                  Viewing:
                </span>

                <strong>
                  {activeBatch === "ALL"
                    ? "Complete Semester"
                    : `Batch ${activeBatch}`}
                </strong>

                <span className="summary-separator">
                  /
                </span>

                <span>
                  {selectedBatchTheory.length} theory
                </span>

                <span className="summary-separator">
                  /
                </span>

                <span>
                  {selectedBatchPracticals.length} practical
                </span>
              </div>
            </div>
          )}

          {/* ================================= */}
          {/* LEGEND */}
          {/* ================================= */}

          <div className="timetable-legend">

            <div className="legend-item">
              <span className="legend-dot theory-dot"></span>
              Theory
            </div>

            <div className="legend-item">
              <span className="legend-dot practical-dot"></span>
              Practical
            </div>

            <div className="legend-item">
              <span className="legend-dot activity-dot"></span>
              Activity
            </div>

            <div className="legend-note">
              Practical sessions occupy 2
              consecutive academic hours.
            </div>
          </div>

          {/* ================================= */}
          {/* TIMETABLE */}
          {/* ================================= */}

          <div className="timetable-container">

            <div className="timetable-grid">

              {/* HEADER */}

              <div className="grid-corner">
                Time
              </div>

              {DAYS.map((day) => (
                <div
                  key={day}
                  className="day-header"
                >
                  {day}
                </div>
              ))}

              {/* ROWS */}

              {TIME_SLOTS.map(
                (slot) => (
                  <div
                    className="timetable-row"
                    key={slot.key}
                  >

                    {/* TIME */}

                    <div className="time-cell">
                      <strong>
                        {slot.start}
                      </strong>

                      <span>
                        {slot.end}
                      </span>
                    </div>

                    {/* DAYS */}

                  {DAYS.map((day) => {
                    const rawEntries =
                      getEntriesForCell(
                        day,
                        slot
                      );

                    const cellEntries =
                      visibleEntries(
                        rawEntries
                      );

                    const continuation =
                      hasPracticalFromPreviousSlot(
                        day,
                        slot
                      );

                      const {
                        practicals,
                        others,
                      } =
                        groupPracticalEntries(
                          cellEntries
                        );

                      const isAllBatchView =
                        activeBatch === "ALL";

                      return (
                        <div
                          key={`${day}-${slot.key}`}
                          className={[
                            "timetable-cell",
                            cellEntries.length
                              ? "occupied"
                              : "",
                            continuation
                              ? "practical-continuation"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {/* EMPTY */}

                          {cellEntries.length ===
                          0 ? (
                            <span className="empty-slot">
                              —
                            </span>
                          ) : (
                            <>
                              {/* ================================= */}
                              {/* COMPLETE SEMESTER PRACTICAL VIEW */}
                              {/* ================================= */}

                              {isAllBatchView &&
                                practicals.length >
                                  0 && (
                                  <div className="all-batch-practical-block">

                                    <div className="practical-block-header">

                                      <span>
                                        LAB PRACTICAL
                                      </span>

                                      <span>
                                        {practicals[0].startTime}
                                        {" – "}
                                        {practicals[0].endTime}
                                      </span>

                                    </div>

                                    <div className="batch-practical-grid">

                                      {practicals.map(
                                        (entry) => (
                                          <div
                                            key={
                                              entry._id ||
                                              `${day}-${slot.key}-${entry.batchName}-${entry.subjectCode}`
                                            }
                                            className="compact-practical-card"
                                          >

                                            <div className="compact-batch">
                                              {entry.batchName}
                                            </div>

                                            <div className="compact-subject">
                                              {entry.subjectCode}
                                            </div>

                                            <div className="compact-faculty">
                                              {entry.facultyName ||
                                                "Faculty"}
                                            </div>

                                            <div className="compact-room">
                                              {entry.roomName ||
                                                "Lab"}
                                            </div>

                                            <div className="compact-duration">
                                              2 HOURS
                                            </div>

                                          </div>
                                        )
                                      )}

                                    </div>
                                  </div>
                                )}

                              {/* ================================= */}
                              {/* INDIVIDUAL BATCH PRACTICAL VIEW */}
                              {/* ================================= */}

                              {!isAllBatchView &&
                                practicals.map(
                                  (entry) => (
                                    <div
                                      key={
                                        entry._id ||
                                        `${day}-${slot.key}-${entry.subjectCode}-${entry.batchName}`
                                      }
                                      className={`timetable-entry practical-entry ${getEntryDurationClass(
                                        entry
                                      )}`}
                                    >

                                      <div className="entry-type">
                                        PRACTICAL
                                      </div>

                                      <div className="entry-title">
                                        {entry.subjectCode}
                                      </div>

                                      <div className="entry-name">
                                        {entry.subjectName}
                                      </div>

                                      <div className="entry-meta">
                                        Batch{" "}
                                        {entry.batchName}
                                      </div>

                                      {entry.facultyName && (
                                        <div className="entry-meta">
                                          {entry.facultyName}
                                        </div>
                                      )}

                                      {entry.roomName && (
                                        <div className="entry-meta room-meta">
                                          {entry.roomName}
                                        </div>
                                      )}

                                      <div className="entry-meta">
                                        {entry.startTime}
                                        {" – "}
                                        {entry.endTime}
                                      </div>

                                      <div className="entry-meta">
                                        2-hour practical
                                      </div>

                                    </div>
                                  )
                                )}

                              {/* ================================= */}
                              {/* THEORY / OTHER ENTRIES */}
                              {/* ================================= */}

                              {others.map(
                                (entry) => (
                                  <div
                                    key={
                                      entry._id ||
                                      `${day}-${slot.key}-${entry.subjectCode}-${entry.entryType}`
                                    }
                                    className={`${getEntryClass(
                                      entry
                                    )} ${getEntryDurationClass(
                                      entry
                                    )}`}
                                  >

                                    <div className="entry-type">
                                      {entry.entryType}
                                    </div>

                                    <div className="entry-title">
                                      {entry.subjectCode}
                                    </div>

                                    <div className="entry-name">
                                      {entry.subjectName}
                                    </div>

                                    {entry.batchName && (
                                      <div className="entry-meta">
                                        Batch{" "}
                                        {entry.batchName}
                                      </div>
                                    )}

                                    {entry.facultyName && (
                                      <div className="entry-meta">
                                        {entry.facultyName}
                                      </div>
                                    )}

                                    {entry.roomName && (
                                      <div className="entry-meta room-meta">
                                        {entry.roomName}
                                      </div>
                                    )}

                                  </div>
                                )
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}

            </div>
          </div>

          {/* ================================= */}
          {/* VALIDATION */}
          {/* ================================= */}

          <div className="validation-panel">

            <div className="validation-heading">

              <div
                className={
                  timetable.validation
                    ?.isValid
                    ? "validation-icon valid"
                    : "validation-icon invalid"
                }
              >
                {timetable.validation
                  ?.isValid
                  ? "✓"
                  : "!"}
              </div>

              <div>
                <h2>
                  Timetable Validation
                </h2>

                <p>
                  Constraint validation result
                  from the timetable engine.
                </p>
              </div>
            </div>

            {timetable.validation
              ?.isValid ? (
              <div className="validation-success">

                <strong>
                  No conflicts detected
                </strong>

                <span>
                  Faculty, rooms, batches,
                  practical duration, capacity
                  and timetable constraints are
                  satisfied.
                </span>

              </div>
            ) : (
              <div className="validation-failure">

                <strong>
                  Validation requires attention
                </strong>

                {(
                  timetable.validation
                    ?.errors || []
                ).map(
                  (item, index) => (
                    <div key={index}>
                      • {item}
                    </div>
                  )
                )}

              </div>
            )}
          </div>
        </>
      )}

      {/* ====================================== */}
      {/* EMPTY STATE */}
      {/* ====================================== */}

      {!timetable &&
        !generating &&
        !error && (
          <div className="timetable-empty-state">

            <div className="empty-icon">
              📅
            </div>

            <h2>
              Ready to generate
            </h2>

            <p>
              Select CSE and Semester 3, then
              generate an optimized timetable
              using the scheduling engine.
            </p>

          </div>
        )}

    </div>
  );
};

export default CseSemesterTimetable;