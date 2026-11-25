const mongoose = require("mongoose");

/*
  Global CSE Master Timetable Validator

  Checks conflicts BETWEEN semesters for:
  - Faculty
  - Classroom / Lab
  - Faculty availability
  - Room availability
  - Invalid timetable references

  It does NOT generate or modify timetables.
  It only validates already-generated semester timetables.
*/

function getSlotKey(day, slotId) {
  return `${day}_${String(slotId)}`;
}

function addConflict(list, conflict) {
  list.push(conflict);
}

function validateMasterTimetable({
  semesterTimetables = [],
  facultyAvailabilityMap = new Map(),
  roomAvailabilityMap = new Map(),
}) {
  const errors = [];
  const warnings = [];

  // ---------------------------------------------------------
  // GLOBAL RESOURCE OCCUPANCY
  // ---------------------------------------------------------

  const facultySchedule = new Map();
  const roomSchedule = new Map();

  /*
    facultySchedule:
      facultyId -> slotKey -> assignments[]

    roomSchedule:
      roomId -> slotKey -> assignments[]
  */

  let totalEntries = 0;
  let totalPracticalEntries = 0;
  let totalTheoryEntries = 0;

  // ---------------------------------------------------------
  // PROCESS EVERY SEMESTER
  // ---------------------------------------------------------

  for (const timetable of semesterTimetables) {
    if (!timetable) continue;

    const semesterNumber =
      timetable.semester?.number ??
      timetable.semester?.semesterNumber ??
      timetable.semesterNumber ??
      "UNKNOWN";

    const semesterName =
      timetable.semester?.name ??
      `Semester ${semesterNumber}`;

    const entries = timetable.entries || [];

    for (const entry of entries) {
      totalEntries++;

      const isPractical = entry.entryType === "PRACTICAL";

      if (isPractical) {
        totalPracticalEntries++;
      } else {
        totalTheoryEntries++;
      }

      // -----------------------------------------------------
      // BASIC VALIDATION
      // -----------------------------------------------------

      if (!entry.day) {
        errors.push(
          `Semester ${semesterNumber}: entry "${entry.subjectName}" has no day.`
        );

        continue;
      }

      if (!entry.slotIds || entry.slotIds.length === 0) {
        errors.push(
          `Semester ${semesterNumber}: "${entry.subjectName}" has no slot IDs.`
        );

        continue;
      }

      // -----------------------------------------------------
      // SLOT LOOP
      // -----------------------------------------------------

      for (const slotId of entry.slotIds) {
        const slotKey = getSlotKey(
          entry.day,
          slotId
        );

        // ---------------------------------------------------
        // FACULTY CONFLICT
        // ---------------------------------------------------

        if (entry.faculty) {
          const facultyId = String(
            entry.faculty._id || entry.faculty
          );

          if (!facultySchedule.has(facultyId)) {
            facultySchedule.set(facultyId, new Map());
          }

          const facultySlots =
            facultySchedule.get(facultyId);

          if (!facultySlots.has(slotKey)) {
            facultySlots.set(slotKey, []);
          }

          const assignments =
            facultySlots.get(slotKey);

          // Check existing assignments
          for (const existing of assignments) {
            if (
              String(existing.timetableId) !==
              String(timetable._id) ||
              existing.entryId !== String(entry._id)
            ) {
              addConflict(errors, {
                type: "FACULTY_CONFLICT",
                severity: "ERROR",
                message:
                  `Faculty conflict: ${entry.facultyName || "Faculty"} ` +
                  `is assigned to Semester ${existing.semesterNumber} ` +
                  `"${existing.subjectName}" and Semester ${semesterNumber} ` +
                  `"${entry.subjectName}" on ${entry.day} at ${entry.startTime}.`,
                facultyId,
                day: entry.day,
                slotId: String(slotId),
                semester1: existing.semesterNumber,
                semester2: semesterNumber,
                subject1: existing.subjectName,
                subject2: entry.subjectName,
              });
            }
          }

          assignments.push({
            timetableId: timetable._id,
            entryId: String(entry._id),
            semesterNumber,
            semesterName,
            subjectName: entry.subjectName,
            facultyName: entry.facultyName,
            day: entry.day,
            startTime: entry.startTime,
            endTime: entry.endTime,
          });
        }

        // ---------------------------------------------------
        // ROOM / LAB CONFLICT
        // ---------------------------------------------------

        if (entry.room) {
          const roomId = String(
            entry.room._id || entry.room
          );

          if (!roomSchedule.has(roomId)) {
            roomSchedule.set(roomId, new Map());
          }

          const roomSlots =
            roomSchedule.get(roomId);

          if (!roomSlots.has(slotKey)) {
            roomSlots.set(slotKey, []);
          }

          const assignments =
            roomSlots.get(slotKey);

          for (const existing of assignments) {
            if (
              String(existing.timetableId) !==
              String(timetable._id) ||
              existing.entryId !== String(entry._id)
            ) {
              addConflict(errors, {
                type: "ROOM_CONFLICT",
                severity: "ERROR",
                message:
                  `Room conflict: ${entry.roomName || "Room"} ` +
                  `is used by Semester ${existing.semesterNumber} ` +
                  `"${existing.subjectName}" and Semester ${semesterNumber} ` +
                  `"${entry.subjectName}" on ${entry.day} at ${entry.startTime}.`,
                roomId,
                roomName: entry.roomName,
                day: entry.day,
                slotId: String(slotId),
                semester1: existing.semesterNumber,
                semester2: semesterNumber,
                subject1: existing.subjectName,
                subject2: entry.subjectName,
              });
            }
          }

          assignments.push({
            timetableId: timetable._id,
            entryId: String(entry._id),
            semesterNumber,
            semesterName,
            subjectName: entry.subjectName,
            roomName: entry.roomName,
            day: entry.day,
            startTime: entry.startTime,
            endTime: entry.endTime,
          });
        }

        // ---------------------------------------------------
        // FACULTY AVAILABILITY
        // ---------------------------------------------------

        if (entry.faculty) {
          const facultyId = String(
            entry.faculty._id || entry.faculty
          );

          const availability =
            facultyAvailabilityMap.get(facultyId);

          /*
            No availability record = unrestricted.

            If a record exists, only explicitly available
            slots are allowed.
          */

          if (availability) {
            const availableSlots =
              availability.get(entry.day);

            if (
              availableSlots &&
              availableSlots.size > 0 &&
              !availableSlots.has(String(slotId))
            ) {
              addConflict(errors, {
                type: "FACULTY_UNAVAILABLE",
                severity: "ERROR",
                message:
                  `Faculty unavailable: ${entry.facultyName || "Faculty"} ` +
                  `is assigned to Semester ${semesterNumber} ` +
                  `"${entry.subjectName}" on ${entry.day} ` +
                  `at slot ${slotId}.`,
                facultyId,
                semesterNumber,
                subjectName: entry.subjectName,
                day: entry.day,
                slotId: String(slotId),
              });
            }
          }
        }

        // ---------------------------------------------------
        // ROOM AVAILABILITY
        // ---------------------------------------------------

        if (entry.room) {
          const roomId = String(
            entry.room._id || entry.room
          );

          const availability =
            roomAvailabilityMap.get(roomId);

          if (availability) {
            const availableSlots =
              availability.get(entry.day);

            if (
              availableSlots &&
              availableSlots.size > 0 &&
              !availableSlots.has(String(slotId))
            ) {
              addConflict(errors, {
                type: "ROOM_UNAVAILABLE",
                severity: "ERROR",
                message:
                  `Room unavailable: ${entry.roomName || "Room"} ` +
                  `is assigned to Semester ${semesterNumber} ` +
                  `"${entry.subjectName}" on ${entry.day} ` +
                  `at slot ${slotId}.`,
                roomId,
                semesterNumber,
                subjectName: entry.subjectName,
                day: entry.day,
                slotId: String(slotId),
              });
            }
          }
        }
      }
    }
  }

  // ---------------------------------------------------------
  // REMOVE DUPLICATE CONFLICTS
  // ---------------------------------------------------------

  const uniqueErrors = [];
  const seenErrors = new Set();

  for (const error of errors) {
    const key = JSON.stringify([
      error.type,
      error.facultyId,
      error.roomId,
      error.day,
      error.slotId,
      error.semester1,
      error.semester2,
      error.subject1,
      error.subject2,
      error.subjectName,
    ]);

    if (!seenErrors.has(key)) {
      seenErrors.add(key);
      uniqueErrors.push(error);
    }
  }

  // ---------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------

  const facultyConflicts =
    uniqueErrors.filter(
      (e) => e.type === "FACULTY_CONFLICT"
    ).length;

  const roomConflicts =
    uniqueErrors.filter(
      (e) => e.type === "ROOM_CONFLICT"
    ).length;

  const facultyAvailabilityConflicts =
    uniqueErrors.filter(
      (e) => e.type === "FACULTY_UNAVAILABLE"
    ).length;

  const roomAvailabilityConflicts =
    uniqueErrors.filter(
      (e) => e.type === "ROOM_UNAVAILABLE"
    ).length;

  return {
    isValid: uniqueErrors.length === 0,

    summary: {
      semestersChecked: semesterTimetables.length,
      totalEntries,
      totalTheoryEntries,
      totalPracticalEntries,

      facultyConflicts,
      roomConflicts,
      facultyAvailabilityConflicts,
      roomAvailabilityConflicts,

      totalErrors: uniqueErrors.length,
      totalWarnings: warnings.length,
    },

    errors: uniqueErrors,
    warnings,
  };
}

module.exports = {
  validateMasterTimetable,
};