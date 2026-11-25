import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
];

const TimetableDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [timetable, setTimetable] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);

  const [subjects, setSubjects] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [validationResult, setValidationResult] =
    useState(null);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [actionMessage, setActionMessage] =
    useState("");

  const [editMode, setEditMode] =
    useState(false);

  const [editEntries, setEditEntries] =
    useState([]);

  // ==========================================
  // LOAD TIMETABLE
  // ==========================================

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        timetableResponse,
        slotsResponse,
        subjectsResponse,
        facultyResponse,
        roomsResponse,
      ] = await Promise.all([
        api.get(`/timetables/${id}`),
        api.get("/timeslots"),
        api.get("/subjects"),
        api.get("/faculty"),
        api.get("/rooms"),
      ]);

      setTimetable(
        timetableResponse.data.timetable
      );

      setTimeSlots(
        slotsResponse.data.timeSlots || []
      );

      setSubjects(
        subjectsResponse.data.subjects || []
      );

      setFacultyList(
        facultyResponse.data.faculty || []
      );

      setRooms(
        roomsResponse.data.rooms || []
      );
    } catch (err) {
      console.error(
        "Error loading timetable:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to load timetable"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, [id]);

  // ==========================================
  // ORDER TIME SLOTS
  // ==========================================

  const orderedSlots = useMemo(() => {
    const uniqueSlots = [];

    [...timeSlots]
      .sort(
        (a, b) =>
          a.slotNumber - b.slotNumber
      )
      .forEach((slot) => {
        const exists = uniqueSlots.some(
          (existingSlot) =>
            existingSlot.slotNumber ===
            slot.slotNumber
        );

        if (!exists) {
          uniqueSlots.push(slot);
        }
      });

    return uniqueSlots;
  }, [timeSlots]);

  // ==========================================
  // GET AVAILABLE START SLOTS
  // ==========================================

  const getStartSlots = (duration) => {
    return timeSlots
      .filter((slot) => {
        if (slot.isBreak) {
          return false;
        }

        if (duration === 1) {
          return true;
        }

        const nextSlot = timeSlots.find(
          (next) =>
            next.day === slot.day &&
            next.slotNumber ===
              slot.slotNumber + 1
        );

        return (
          nextSlot &&
          !nextSlot.isBreak
        );
      })
      .sort((a, b) => {
        if (a.day !== b.day) {
          return (
            DAYS.indexOf(a.day) -
            DAYS.indexOf(b.day)
          );
        }

        return (
          a.slotNumber -
          b.slotNumber
        );
      });
  };

  // ==========================================
  // FIND ENTRY
  // ==========================================

  const getEntry = (day, slot) => {
    if (!timetable?.entries) {
      return null;
    }

    return timetable.entries.find(
      (entry) => {
        if (!entry.timeSlot) {
          return false;
        }

        if (entry.timeSlot.day !== day) {
          return false;
        }

        const startSlot =
          entry.timeSlot.slotNumber;

        const duration =
          entry.durationSlots || 1;

        return (
          slot.slotNumber >= startSlot &&
          slot.slotNumber <
            startSlot + duration
        );
      }
    );
  };

  // ==========================================
  // ENTRY START
  // ==========================================

  const isEntryStart = (day, slot) => {
    const entry = getEntry(day, slot);

    if (!entry) {
      return false;
    }

    return (
      entry.timeSlot?.slotNumber ===
      slot.slotNumber
    );
  };

  // ==========================================
  // STATUS CLASS
  // ==========================================

  const getStatusClass = (status) => {
    if (status === "PUBLISHED") {
      return "status-published";
    }

    if (status === "GENERATED" || status === "VALID") {
      return "status-generated";
    }

    return "status-draft";
  };

  // ==========================================
  // START EDIT MODE
  // ==========================================

  const handleStartEdit = () => {
    if (timetable.status === "PUBLISHED") {
      setActionMessage(
        "Published timetables cannot be edited."
      );
      return;
    }

    const copiedEntries =
      timetable.entries.map((entry) => ({
        _id: entry._id,

        subject:
          entry.subject?._id ||
          entry.subject,

        faculty:
          entry.faculty?._id ||
          entry.faculty,

        room:
          entry.room?._id ||
          entry.room,

        timeSlot:
          entry.timeSlot?._id ||
          entry.timeSlot,

        durationSlots:
          entry.durationSlots || 1,
      }));

    setEditEntries(copiedEntries);
    setEditMode(true);
    setActionMessage("");
    setValidationResult(null);
  };

  // ==========================================
  // CANCEL EDIT
  // ==========================================

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditEntries([]);
    setActionMessage("");
  };

  // ==========================================
  // UPDATE EDIT ENTRY
  // ==========================================

  const updateEditEntry = (
    index,
    field,
    value
  ) => {
    setEditEntries((current) =>
      current.map((entry, entryIndex) => {
        if (entryIndex !== index) {
          return entry;
        }

        const updatedEntry = {
          ...entry,
          [field]: value,
        };

        // Automatically change duration
        // when subject type changes.
        if (field === "subject") {
          const selectedSubject =
            subjects.find(
              (subject) =>
                subject._id === value
            );

          if (
            selectedSubject?.type ===
            "PRACTICAL"
          ) {
            updatedEntry.durationSlots = 2;
          } else {
            updatedEntry.durationSlots = 1;
          }
        }

        return updatedEntry;
      })
    );
  };

  // ==========================================
  // SAVE EDITED TIMETABLE
  // ==========================================

  const handleSaveEdit = async () => {
  try {
    setActionLoading(true);
    setActionMessage("");
    setError("");

    // Save each changed timetable entry through the dedicated
    // entry-edit API so every change is validated individually.
    for (const entry of editEntries) {
      const originalEntry = timetable.entries.find(
        (item) => item._id === entry._id
      );

      if (!originalEntry) continue;

      const hasChanged =
        String(originalEntry.timeSlot?._id || originalEntry.timeSlot) !==
          String(entry.timeSlot) ||
        String(originalEntry.faculty?._id || originalEntry.faculty) !==
          String(entry.faculty) ||
        String(originalEntry.room?._id || originalEntry.room) !==
          String(entry.room);

      // Skip entries that were not changed.
      if (!hasChanged) continue;

      try {
        await api.put(
          `/timetables/${id}/entries/${entry._id}`,
          {
            timeSlot: entry.timeSlot,
            faculty: entry.faculty,
            room: entry.room
          }
        );
      } catch (entryError) {
        const result = entryError.response?.data?.result;

        // Keep the original timetable unchanged in the UI.
        await fetchTimetable();

        if (result) {
          setValidationResult(result);
        }

        setActionMessage(
          entryError.response?.data?.message ||
            "This edit creates a timetable conflict."
        );

        setActionLoading(false);
        return;
      }
    }

    // Reload the timetable after all successful edits.
    await fetchTimetable();

    setEditMode(false);
    setEditEntries([]);
    setValidationResult(null);

    setActionMessage(
      "Timetable updated successfully. Please validate it before publishing."
    );
  } catch (err) {
    console.error("Error updating timetable:", err);

    setError(
      err.response?.data?.message ||
        "Failed to update timetable."
    );
  } finally {
    setActionLoading(false);
  }
};

  // ==========================================
  // VALIDATE
  // ==========================================

  const handleValidate = async () => {
    try {
      setActionLoading(true);
      setActionMessage("");
      setValidationResult(null);

      const response = await api.post(
        `/timetables/${id}/validate`
      );

      console.log("VALIDATION RESPONSE:", response.data);

      const result = response.data.result;

      setValidationResult(result);

      if (result.isValid) {
        setActionMessage(
          "Timetable is valid. No conflicts found."
        );
      } else {
        setActionMessage(
          "Timetable has conflicts. Please review them before publishing."
        );
      }
    } catch (err) {
      console.error(
        "Error validating timetable:",
        err
      );

      setActionMessage(
        err.response?.data?.message ||
          "Failed to validate timetable."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // PUBLISH
  // ==========================================

  const handlePublish = async () => {
    try {
      setActionLoading(true);
      setActionMessage("");

      const response = await api.post(
        `/timetables/${id}/publish`
      );

      if (response.data.timetable) {
        setTimetable(
          response.data.timetable
        );
      } else {
        setTimetable((current) => ({
          ...current,
          status: "PUBLISHED",
        }));
      }

      setValidationResult({
        isValid: true,
        conflicts: [],
      });

      setActionMessage(
        "Timetable published successfully."
      );
    } catch (err) {
      console.error(
        "Error publishing timetable:",
        err
      );

      setActionMessage(
        err.response?.data?.message ||
          "Failed to publish timetable."
      );
    } finally {
      setActionLoading(false);
    }
  };
  
  // ==========================================
// DELETE TIMETABLE
// ==========================================

const handleDelete = async () => {
  if (timetable.status === "PUBLISHED") {
    setActionMessage(
      "Published timetables cannot be deleted."
    );
    return;
  }

  const confirmed = window.confirm(
    "Are you sure you want to delete this timetable?"
  );

  if (!confirmed) {
    return;
  }

  try {
    setActionLoading(true);
    setActionMessage("");

    await api.delete(
      `/timetables/${id}`
    );

    navigate("/timetables");
  } catch (err) {
    console.error(
      "Error deleting timetable:",
      err
    );

    setActionMessage(
      err.response?.data?.message ||
        "Failed to delete timetable."
    );
  } finally {
    setActionLoading(false);
  }
};

// ==========================================
// REGENERATE TIMETABLE
// ==========================================

const handleRegenerate = async () => {
  const confirmed = window.confirm(
    "Regenerate a new timetable for this Department, Semester and Division?"
  );

  if (!confirmed) {
    return;
  }

  try {
    setActionLoading(true);
    setActionMessage("");
    setValidationResult(null);

    const response = await api.post(
      "/timetable-generator/generate",
      {
        departmentId:
          timetable.department?._id ||
          timetable.department,

        semesterId:
          timetable.semester?._id ||
          timetable.semester,

        divisionId:
          timetable.division?._id ||
          timetable.division,
      }
    );

    const newTimetable =
      response.data.timetable;

    if (newTimetable?._id) {
      navigate(
        `/timetables/${newTimetable._id}`
      );
    }
  } catch (err) {
    console.error(
      "Error regenerating timetable:",
      err
    );

    setActionMessage(
      err.response?.data?.message ||
        "Failed to regenerate timetable."
    );
  } finally {
    setActionLoading(false);
  }
};
  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div>
        <div className="page-heading">
          <div>
            <h1>Timetable</h1>
            <p>
              Loading timetable...
            </p>
          </div>
        </div>

        <div className="section-card">
          <div className="empty-state">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================

  if (error) {
    return (
      <div>
        <div className="page-heading">
          <div>
            <h1>Timetable</h1>
            <p>
              Unable to load timetable.
            </p>
          </div>
        </div>

        <div className="page-error">
          {error}
        </div>

        <button
          className="secondary-button"
          onClick={() =>
            navigate("/timetables")
          }
        >
          ← Back to Timetables
        </button>
      </div>
    );
  }

  if (!timetable) {
    return null;
  }

  const assignedClassroom =
    timetable.entries?.find((e) => e.room?.type === "CLASSROOM")?.room?.roomNumber ||
    timetable.entries?.find((e) => e.room?.roomNumber)?.room?.roomNumber ||
    "CR18";

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div className="timetable-details-page">

      {/* ======================================
          HEADER
      ====================================== */}

      <div className="page-heading">

        <div>

          <button
            className="back-button"
            onClick={() =>
              navigate("/timetables")
            }
          >
            ← Back to Timetables
          </button>

          <h1>
            {timetable.department?.name ||
              "Department"}
          </h1>

          <p>
            {timetable.semester?.name ||
              "Semester"}{" "}
            • Division{" "}
            {timetable.division?.name ||
              "-"}{" "}
            •{" "}
            {timetable.division
              ?.studentCount || 0}{" "}
            students
          </p>

        </div>

        <div className="timetable-actions">

        <button
          className="secondary-button"
          onClick={() => window.print()}
          title="Print official timetable"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <span>🖨️</span> Print Timetable
        </button>

        <span
            className={`status-badge ${getStatusClass(
            timetable.status
            )}`}
        >
            {timetable.status}
        </span>

        {timetable.status !== "PUBLISHED" && (
            <>
            <button
                className="edit-button"
                onClick={handleStartEdit}
                disabled={actionLoading}
            >
                Edit
            </button>

            <button
                className="secondary-button"
                onClick={handleRegenerate}
                disabled={
                actionLoading || editMode
                }
            >
                {actionLoading
                ? "Generating..."
                : "Regenerate"}
            </button>
            </>
        )}

        {timetable.status !== "PUBLISHED" && (
        <button
            className="delete-button"
            onClick={handleDelete}
            disabled={
            actionLoading || editMode
            }
        >
            Delete
        </button>
        )}
        <button
            className="secondary-button"
            onClick={handleValidate}
            disabled={
            actionLoading || editMode
            }
        >
            {actionLoading
            ? "Checking..."
            : "Validate"}
        </button>

        {timetable.status !==
            "PUBLISHED" && (
            <button
            className="primary-button"
            onClick={handlePublish}
            disabled={
                actionLoading || editMode
            }
            >
            {actionLoading
                ? "Publishing..."
                : "Publish"}
            </button>
        )}

        </div>

      </div>

      {/* ======================================
          ACTION MESSAGE
      ====================================== */}

        {actionMessage && (
        <div
            className={
            actionMessage.includes("successfully")
                ? "page-success"
                : "page-error"
            }
        >
            {actionMessage}
        </div>
        )}

      {/* ======================================
          EDIT PANEL
      ====================================== */}

      {editMode && (
        <div className="section-card edit-timetable-card">

          <div className="card-header">

            <div>
              <h2>
                Edit Timetable
              </h2>

              <p>
                Modify subject, faculty,
                room or time slot.
              </p>
            </div>

          </div>

          <div className="edit-entry-list">

            {editEntries.map(
              (entry, index) => {

                const selectedSubject =
                  subjects.find(
                    (subject) =>
                      subject._id ===
                      entry.subject
                  );

                const allowedFaculty =
                  selectedSubject?.faculty
                    ?.length > 0
                    ? facultyList.filter(
                        (faculty) =>
                          selectedSubject.faculty.some(
                            (facultyId) =>
                              (
                                facultyId?._id ||
                                facultyId
                              ).toString() ===
                              faculty._id.toString()
                          )
                      )
                    : facultyList;

                const startSlots =
                  getStartSlots(
                    entry.durationSlots
                  );

                return (
                  <div
                    className="edit-entry-row"
                    key={
                      entry._id || index
                    }
                  >

                    {/* SESSION NUMBER */}

                    <div className="edit-session-number">
                      <span>
                        Session
                      </span>

                      <strong>
                        {index + 1}
                      </strong>
                    </div>

                    {/* SUBJECT */}

                    <div className="form-group">
                      <label>
                        Subject
                      </label>

                      <select
                        value={
                          entry.subject || ""
                        }
                        onChange={(e) =>
                          updateEditEntry(
                            index,
                            "subject",
                            e.target.value
                          )
                        }
                      >

                        <option value="">
                          Select Subject
                        </option>

                        {subjects.map(
                          (subject) => (
                            <option
                              key={
                                subject._id
                              }
                              value={
                                subject._id
                              }
                            >
                              {subject.name} (
                              {subject.code})
                            </option>
                          )
                        )}

                      </select>
                    </div>

                    {/* FACULTY */}

                    <div className="form-group">
                      <label>
                        Faculty
                      </label>

                      <select
                        value={
                          entry.faculty || ""
                        }
                        onChange={(e) =>
                          updateEditEntry(
                            index,
                            "faculty",
                            e.target.value
                          )
                        }
                      >

                        <option value="">
                          Select Faculty
                        </option>

                        {allowedFaculty.map(
                          (faculty) => (
                            <option
                              key={
                                faculty._id
                              }
                              value={
                                faculty._id
                              }
                            >
                              {faculty.name}
                            </option>
                          )
                        )}

                      </select>
                    </div>

                    {/* ROOM */}

                    <div className="form-group">
                      <label>
                        Room
                      </label>

                      <select
                        value={
                          entry.room || ""
                        }
                        onChange={(e) =>
                          updateEditEntry(
                            index,
                            "room",
                            e.target.value
                          )
                        }
                      >

                        <option value="">
                          Select Room
                        </option>

                        {rooms.map(
                          (room) => (
                            <option
                              key={
                                room._id
                              }
                              value={
                                room._id
                              }
                            >
                              {room.roomNumber} -{" "}
                              {room.type}
                            </option>
                          )
                        )}

                      </select>
                    </div>

                    {/* TIME SLOT */}

                    <div className="form-group">
                      <label>
                        Time Slot
                      </label>

                      <select
                        value={
                          entry.timeSlot || ""
                        }
                        onChange={(e) =>
                          updateEditEntry(
                            index,
                            "timeSlot",
                            e.target.value
                          )
                        }
                      >

                        <option value="">
                          Select Time
                        </option>

                        {startSlots.map((slot) => {
                        let displayEndTime = slot.endTime;

                        if (entry.durationSlots === 2) {
                            const nextSlot = timeSlots.find(
                            (next) =>
                                next.day === slot.day &&
                                next.slotNumber ===
                                slot.slotNumber + 1
                            );

                            if (nextSlot) {
                            displayEndTime = nextSlot.endTime;
                            }
                        }

                        return (
                            <option
                            key={slot._id}
                            value={slot._id}
                            >
                            {slot.day} - {slot.startTime} to{" "}
                            {displayEndTime}
                            </option>
                        );
                        })}

                      </select>

                      {entry.durationSlots ===
                        2 && (
                        <small className="edit-help-text">
                          Practical occupies
                          two consecutive
                          slots.
                        </small>
                      )}

                    </div>

                  </div>
                );
              }
            )}

          </div>

          {/* EDIT ACTIONS */}

          <div className="form-actions">

            <button
              className="secondary-button"
              onClick={
                handleCancelEdit
              }
              disabled={actionLoading}
            >
              Cancel
            </button>

            <button
              className="primary-button"
              onClick={
                handleSaveEdit
              }
              disabled={actionLoading}
            >
              {actionLoading
                ? "Saving..."
                : "Save Changes"}
            </button>

          </div>

        </div>
      )}

      {/* ======================================
          VALIDATION CONFLICTS
      ====================================== */}

      {validationResult &&
        !validationResult.isValid &&
        validationResult.conflicts?.length >
          0 && (
          <div className="section-card validation-card">

            <div className="card-header">

              <div>
                <h2>
                  Validation Conflicts
                </h2>

                <p>
                  The following issues must
                  be resolved before
                  publishing.
                </p>
              </div>

            </div>

            <div className="validation-conflicts">

              {validationResult.conflicts.map(
                (conflict, index) => (
                  <div
                    className="conflict-item"
                    key={index}
                  >

                    <strong>
                      Conflict {index + 1}
                    </strong>

                    <p>
                      {typeof conflict ===
                      "string"
                        ? conflict
                        : conflict.message ||
                          JSON.stringify(
                            conflict
                          )}
                    </p>

                  </div>
                )
              )}

            </div>

          </div>
        )}

      {/* ======================================
          INFORMATION CARDS
      ====================================== */}

      <div className="timetable-info-card">

        <div className="timetable-info-item">
          <span>Department</span>

          <strong>
            {timetable.department?.code ||
              "-"}
          </strong>
        </div>

        <div className="timetable-info-item">
          <span>Semester</span>

          <strong>
            {timetable.semester?.name ||
              "-"}
          </strong>
        </div>

        <div className="timetable-info-item">
          <span>Division</span>

          <strong>
            {timetable.division?.name ||
              "-"}
          </strong>
        </div>

        <div className="timetable-info-item">
          <span>Total Sessions</span>

          <strong>
            {timetable.entries?.length ||
              0}
          </strong>
        </div>

      </div>

      {/* ======================================
          WEEKLY TIMETABLE
      ====================================== */}

      <div className="section-card timetable-card">

        <div className="card-header">

          <div>
            <h2>
              Weekly Timetable
            </h2>

            <p>
              Monday to Friday • 10:00 AM
              to 5:00 PM
            </p>
          </div>

        </div>

        <div className="timetable-grid-wrapper">

          {/* Institutional Header (DACOE Karad Form 02: Class Timetable) */}
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
              CLASS TIME TABLE (Academic Year: {timetable.academicYear || "2026-27"})
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", background: "#fff", padding: "10px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", textAlign: "left" }}>
              <div><strong style={{ color: "#475569" }}>Class: </strong><span>{timetable.semester?.number === 3 || timetable.semester?.name?.includes("Third") ? "Second Year (S.Y. B.Tech)" : timetable.semester?.number === 5 || timetable.semester?.name?.includes("Fifth") ? "Third Year (T.Y. B.Tech)" : "Final Year (B.Tech CSE)"}</span></div>
              <div><strong style={{ color: "#475569" }}>Division: </strong><span>{timetable.division?.name || "Single Cohort (No Divisions)"}</span></div>
              <div><strong style={{ color: "#475569" }}>Class Room: </strong><span>{assignedClassroom}</span></div>
              <div><strong style={{ color: "#475569" }}>W.E.F.: </strong><span>01/07/2026</span></div>
            </div>
          </div>

          <table className="timetable-grid">

            <thead>

              <tr>

                <th className="time-column">
                  Time
                </th>

                {DAYS.map((day) => (
                  <th key={day}>
                    {day}
                  </th>
                ))}

              </tr>

            </thead>

            <tbody>

              {orderedSlots.map(
                (slot) => {

                  // BREAK

                  if (slot.isBreak) {
                    return (
                      <tr
                        key={slot._id}
                        className="break-row"
                      >

                        <td className="time-cell break-time">

                          <strong>
                            {slot.startTime}
                          </strong>

                          <span>
                            {slot.endTime}
                          </span>

                        </td>

                        <td
                          colSpan={
                            DAYS.length
                          }
                          className="break-cell"
                        >
                          BREAK
                        </td>

                      </tr>
                    );
                  }

                  // NORMAL SLOT

                  return (
                    <tr key={slot._id}>

                      <td className="time-cell">

                        <strong>
                          {slot.startTime}
                        </strong>

                        <span>
                          {slot.endTime}
                        </span>

                      </td>

                      {DAYS.map((day) => {

                        const entry =
                          getEntry(
                            day,
                            slot
                          );

                        const startsHere =
                          isEntryStart(
                            day,
                            slot
                          );

                        // Practical continuation

                        if (
                          entry &&
                          !startsHere
                        ) {
                          return null;
                        }

                        // Class
                        if (
                          entry &&
                          startsHere
                        ) {
                          const duration =
                            entry.durationSlots ||
                            1;

                          const hasChildBatches =
                            entry.childBatches &&
                            entry.childBatches.length > 0;

                          // PARENT-CHILD PRACTICAL BATCH GRID (Phase 6)
                          if (hasChildBatches) {
                            return (
                              <td
                                key={`${day}-${slot._id}`}
                                className="timetable-cell"
                                rowSpan={duration}
                                style={{
                                  background: "#f0fdf4",
                                  border: "1.5px solid #a7f3d0",
                                  verticalAlign: "top",
                                  padding: "6px"
                                }}
                              >
                                <div style={{
                                  background: "#ecfdf5",
                                  borderRadius: "6px",
                                  padding: "4px 8px",
                                  marginBottom: "6px",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  borderBottom: "1px solid #d1fae5"
                                }}>
                                  <span style={{ fontSize: "11px", fontWeight: "800", color: "#065f46" }}>
                                    🔬 PRACTICAL LAB (2H)
                                  </span>
                                  <span style={{ fontSize: "10px", color: "#047857", fontWeight: "700" }}>
                                    {entry.childBatches.length} Batches
                                  </span>
                                </div>

                                <div style={{
                                  display: "grid",
                                  gridTemplateColumns: entry.childBatches.length > 2 ? "1fr 1fr" : "1fr",
                                  gap: "6px"
                                }}>
                                  {entry.childBatches.map((cb, cIdx) => (
                                    <div
                                      key={cb._id || cIdx}
                                      style={{
                                        background: "#ffffff",
                                        border: "1px solid #a7f3d0",
                                        borderRadius: "6px",
                                        padding: "6px 8px",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                                      }}
                                    >
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                                        <span style={{ background: "#059669", color: "#fff", fontSize: "10px", fontWeight: "800", padding: "1px 5px", borderRadius: "3px" }}>
                                          Batch {cb.batch}
                                        </span>
                                        <span style={{ fontSize: "9px", color: "#047857", fontWeight: "700" }}>
                                          2H
                                        </span>
                                      </div>
                                      <strong style={{ display: "block", fontSize: "12px", color: "#0f172a", lineHeight: "1.2" }}>
                                        {cb.subject?.code || cb.subject?.name || "Lab"}
                                      </strong>
                                      <small style={{ display: "block", fontSize: "11px", color: "#334155" }}>
                                        👨‍🏫 {cb.faculty?.name || "Faculty"}
                                      </small>
                                      <small style={{ display: "block", fontSize: "10px", color: "#047857", fontWeight: "600" }}>
                                        📍 {cb.room?.roomNumber || cb.room?.name || "Lab"}
                                      </small>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            );
                          }

                          // Regular Theory, Tutorial, or Project Entry
                          return (
                            <td
                              key={`${day}-${slot._id}`}
                              className="timetable-cell"
                              rowSpan={
                                duration
                              }
                            >

                              <div className="timetable-entry">

                                <strong>
                                  {entry
                                    .subject
                                    ?.name ||
                                    "Subject"}
                                </strong>

                                <span>
                                  {entry
                                    .subject
                                    ?.code ||
                                    ""}
                                </span>

                                <small>
                                  {entry
                                    .faculty
                                    ?.name ||
                                    "Faculty"}
                                </small>

                                <small>
                                  Room:{" "}
                                  {entry
                                    .room
                                    ?.roomNumber ||
                                    entry.room
                                      ?.name ||
                                    "-"}
                                </small>

                                {duration ===
                                  2 && (
                                  <em>
                                    {entry.entryType === "PROJECT" ? "Project • 2 Hours" : "Practical • 2 Hours"}
                                  </em>
                                )}

                              </div>

                            </td>
                          );
                        }

                        // FREE

                        return (
                          <td
                            key={`${day}-${slot._id}`}
                            className="timetable-cell free-cell"
                          >
                            <span>
                              FREE
                            </span>
                          </td>
                        );
                      })}

                    </tr>
                  );
                }
              )}

            </tbody>

          </table>

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
              <strong style={{ display: "block", color: "#0f172a" }}>Class Coordinator</strong>
              <span style={{ color: "#64748b" }}>Dept. of CSE</span>
            </div>
            <div style={{ padding: "10px", border: "1px dashed #cbd5e1", borderRadius: "6px", background: "#f8fafc" }}>
              <div style={{ height: "30px" }}></div>
              <strong style={{ display: "block", color: "#0f172a" }}>Prof. S. B. Thorat</strong>
              <span style={{ color: "#64748b" }}>Time-Table Incharge</span>
            </div>
            <div style={{ padding: "10px", border: "1px dashed #cbd5e1", borderRadius: "6px", background: "#f8fafc" }}>
              <div style={{ height: "30px" }}></div>
              <strong style={{ display: "block", color: "#0f172a" }}>Prof. A. H. Renushe</strong>
              <span style={{ color: "#64748b" }}>Head of Department</span>
            </div>
            <div style={{ padding: "10px", border: "1px dashed #cbd5e1", borderRadius: "6px", background: "#f8fafc" }}>
              <div style={{ height: "30px" }}></div>
              <strong style={{ display: "block", color: "#0f172a" }}>Dr. A. M. Mulla</strong>
              <span style={{ color: "#64748b" }}>Principal</span>
            </div>
          </div>

        </div>

      </div>

      {/* ======================================
          LEGEND
      ====================================== */}

      <div className="timetable-legend">

        <div>
          <span className="legend-box class-legend"></span>
          Class
        </div>

        <div>
          <span className="legend-box free-legend"></span>
          Free Period
        </div>

        <div>
          <span className="legend-box break-legend"></span>
          Break
        </div>

      </div>

    </div>
  );
};

export default TimetableDetails;