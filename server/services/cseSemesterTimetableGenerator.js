const TimeSlot = require("../models/TimeSlot");
const Subject = require("../models/Subject");
const Faculty = require("../models/Faculty");
const Room = require("../models/Room");
const Availability = require("../models/Availability");

/* =========================================================
   CONSTANTS
========================================================= */

const ACADEMIC_DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
];

const PRACTICAL_DURATION_SLOTS = 2;

const PRACTICAL_TIME_PRIORITY = {
  "10:00": 1,
  "12:45": 2,
  "15:00": 3,
};

const SEMESTER_CLASSROOM_MAP = {
  3: "CR18",
  5: "CR56",
  7: "CR57",
};
/*
  Semester 5 preferred practical pattern.

  These are preferences only.
  The scheduler can automatically move
  a practical to another day.
*/
const SEMESTER_5_PRACTICAL_PATTERN = {
  ISL101: {
    T1: "MONDAY",
    T2: "TUESDAY",
    T3: "WEDNESDAY",
    T4: "THURSDAY",
  },

  SPL104: {
    T1: "TUESDAY",
    T2: "WEDNESDAY",
    T3: "THURSDAY",
    T4: "MONDAY",
  },

  JAVAL102: {
    T1: "WEDNESDAY",
    T2: "THURSDAY",
    T3: "MONDAY",
    T4: "TUESDAY",
  },

  BE107: {
    T1: "THURSDAY",
    T2: "MONDAY",
    T3: "TUESDAY",
    T4: "WEDNESDAY",
  },
};

/* =========================================================
   BASIC HELPERS
========================================================= */

function idOf(value) {
  if (!value) return null;

  if (typeof value === "string") {
    return value;
  }

  if (value._id) {
    return value._id.toString();
  }

  return value.toString();
}

function slotKey(day, slotId) {
  return `${String(day).toUpperCase()}_${idOf(slotId)}`;
}

function resourceSlotKey(resourceId, day, slotId) {
  return `${idOf(resourceId)}_${String(day).toUpperCase()}_${idOf(
    slotId
  )}`;
}

function unique(values) {
  return [...new Set(values)];
}

function getEntryTypeForAcademicSubject(subject) {
  const type = String(subject.type || "").toUpperCase();

  if (type === "TUTORIAL") {
    return "TUTORIAL";
  }

  return "LECTURE";
}

function isPracticalSubject(subject) {
  return (
    String(subject.type || "").toUpperCase() === "PRACTICAL" ||
    Number(subject.practicalHours || 0) > 0
  );
}

function getTheoryHours(subject) {
  return Number(subject.weeklyHours || 0);
}

function getPracticalHours(subject) {
  return Number(subject.practicalHours || 0);
}

/* =========================================================
   FACULTY HELPERS
========================================================= */

function getSubjectFacultyIds(subject) {
  const values = [];

  if (subject?.faculty) {
    if (Array.isArray(subject.faculty)) {
      values.push(...subject.faculty);
    } else {
      values.push(subject.faculty);
    }
  }

  if (subject?.faculties) {
    if (Array.isArray(subject.faculties)) {
      values.push(...subject.faculties);
    } else {
      values.push(subject.faculties);
    }
  }

  if (subject?.facultyIds) {
    if (Array.isArray(subject.facultyIds)) {
      values.push(...subject.facultyIds);
    } else {
      values.push(subject.facultyIds);
    }
  }

  return unique(
    values
      .map((value) => idOf(value))
      .filter(Boolean)
  );
}

function getEligibleFaculty(subject, faculties) {
  const facultyIds = getSubjectFacultyIds(subject);

  if (!facultyIds.length) {
    return [];
  }

  return faculties.filter((faculty) =>
    facultyIds.includes(idOf(faculty._id))
  );
}

/* =========================================================
   GLOBAL RESERVATIONS
========================================================= */

function createEmptyGlobalReservations() {
  return {
    faculty: new Map(),
    rooms: new Map(),
  };
}

function isGlobalFacultyFree(
  globalReservations,
  facultyId,
  day,
  slotIds
) {
  if (!globalReservations || !facultyId) {
    return true;
  }

  const map = globalReservations.faculty || new Map();

  for (const slotId of slotIds) {
    if (
      map.has(
        resourceSlotKey(
          facultyId,
          day,
          slotId
        )
      )
    ) {
      return false;
    }
  }

  return true;
}

function isGlobalRoomFree(
  globalReservations,
  roomId,
  day,
  slotIds
) {
  if (!globalReservations || !roomId) {
    return true;
  }

  const map = globalReservations.rooms || new Map();

  for (const slotId of slotIds) {
    if (
      map.has(
        resourceSlotKey(
          roomId,
          day,
          slotId
        )
      )
    ) {
      return false;
    }
  }

  return true;
}

function reserveGlobalEntry(
  globalReservations,
  entry
) {
  if (!globalReservations || !entry) {
    return;
  }

  for (const slotId of entry.slotIds || []) {
    if (entry.faculty) {
      globalReservations.faculty.set(
        resourceSlotKey(
          entry.faculty,
          entry.day,
          slotId
        ),
        true
      );
    }

    if (entry.room) {
      globalReservations.rooms.set(
        resourceSlotKey(
          entry.room,
          entry.day,
          slotId
        ),
        true
      );
    }
  }
}

/* =========================================================
   LOCAL SCHEDULE HELPERS
========================================================= */

function isScheduleFree(
  schedule,
  day,
  slotIds
) {
  for (const slotId of slotIds) {
    if (
      schedule.has(
        slotKey(day, slotId)
      )
    ) {
      return false;
    }
  }

  return true;
}

function reserveSchedule(
  schedule,
  day,
  slotIds,
  value = true
) {
  for (const slotId of slotIds) {
    schedule.set(
      slotKey(day, slotId),
      value
    );
  }
}

function unreserveSchedule(
  schedule,
  day,
  slotIds
) {
  for (const slotId of slotIds) {
    schedule.delete(
      slotKey(day, slotId)
    );
  }
}

function isRoomScheduleFree(
  roomSchedule,
  roomId,
  day,
  slotIds
) {
  if (!roomId) {
    return false;
  }

  for (const slotId of slotIds) {
    if (
      roomSchedule.has(
        resourceSlotKey(
          roomId,
          day,
          slotId
        )
      )
    ) {
      return false;
    }
  }

  return true;
}

function reserveRoomSchedule(
  roomSchedule,
  roomId,
  day,
  slotIds
) {
  if (!roomId) {
    return;
  }

  for (const slotId of slotIds) {
    roomSchedule.set(
      resourceSlotKey(
        roomId,
        day,
        slotId
      ),
      true
    );
  }
}

function unreserveRoomSchedule(
  roomSchedule,
  roomId,
  day,
  slotIds
) {
  if (!roomId) {
    return;
  }

  for (const slotId of slotIds) {
    roomSchedule.delete(
      resourceSlotKey(
        roomId,
        day,
        slotId
      )
    );
  }
}

function isFacultyScheduleFree(
  facultySchedule,
  facultyId,
  day,
  slotIds
) {
  if (!facultyId) {
    return false;
  }

  for (const slotId of slotIds) {
    if (
      facultySchedule.has(
        resourceSlotKey(
          facultyId,
          day,
          slotId
        )
      )
    ) {
      return false;
    }
  }

  return true;
}

function reserveFacultySchedule(
  facultySchedule,
  facultyId,
  day,
  slotIds
) {
  for (const slotId of slotIds) {
    facultySchedule.set(
      resourceSlotKey(
        facultyId,
        day,
        slotId
      ),
      true
    );
  }
}

/* =========================================================
   AVAILABILITY
========================================================= */

function buildAvailabilityMap(records) {
  const map = new Map();

  for (const record of records || []) {
    const resourceId = idOf(record.resourceId);

    if (!resourceId) {
      continue;
    }

    if (!map.has(resourceId)) {
      map.set(resourceId, new Map());
    }

    const dayMap = map.get(resourceId);

    const day = String(
      record.day || ""
    ).toUpperCase();

    if (!dayMap.has(day)) {
      dayMap.set(day, new Set());
    }

    const allowedSlots = dayMap.get(day);

    for (const slotId of record.availableSlots || []) {
      allowedSlots.add(idOf(slotId));
    }
  }

  return map;
}

function isResourceAvailable(
  availabilityMap,
  resourceId,
  day,
  slotIds
) {
  if (!resourceId) {
    return true;
  }

  const resourceMap =
    availabilityMap.get(
      idOf(resourceId)
    );

  /*
    No availability record means
    unrestricted availability.
  */
  if (!resourceMap) {
    return true;
  }

  const allowedSlots =
    resourceMap.get(
      String(day).toUpperCase()
    );

  /*
    Resource has availability records,
    but nothing for this day.
  */
  if (!allowedSlots) {
    return false;
  }

  for (const slotId of slotIds) {
    if (
      !allowedSlots.has(
        idOf(slotId)
      )
    ) {
      return false;
    }
  }

  return true;
}

/* =========================================================
   TIME SLOTS
========================================================= */

function sortSlots(slots) {
  return [...slots].sort((a, b) => {
    const dayDifference =
      ACADEMIC_DAYS.indexOf(
        String(a.day).toUpperCase()
      ) -
      ACADEMIC_DAYS.indexOf(
        String(b.day).toUpperCase()
      );

    if (dayDifference !== 0) {
      return dayDifference;
    }

    return (
      Number(a.slotNumber || 0) -
      Number(b.slotNumber || 0)
    );
  });
}

function getAcademicSlots(timeSlots) {
  return sortSlots(
    timeSlots.filter(
      (slot) =>
        !slot.isBreak &&
        ACADEMIC_DAYS.includes(
          String(slot.day).toUpperCase()
        )
    )
  );
}

function getSlotsForDay(
  academicSlots,
  day
) {
  return academicSlots
    .filter(
      (slot) =>
        String(slot.day).toUpperCase() ===
        String(day).toUpperCase()
    )
    .sort(
      (a, b) =>
        Number(a.slotNumber) -
        Number(b.slotNumber)
    );
}

function getPracticalBlocks(
  academicSlots,
  day
) {
  const daySlots =
    getSlotsForDay(
      academicSlots,
      day
    );

  const blocks = [];

  for (
    let i = 0;
    i <
    daySlots.length -
      PRACTICAL_DURATION_SLOTS +
      1;
    i++
  ) {
    const first =
      daySlots[i];

    const second =
      daySlots[i + 1];

    /*
      Practical sessions require
      consecutive academic slots.
    */
    if (
      Number(second.slotNumber) !==
      Number(first.slotNumber) + 1
    ) {
      continue;
    }

    blocks.push({
      day,

      slotIds: [
        first._id,
        second._id,
      ],

      startTime:
        first.startTime,

      endTime:
        second.endTime,
    });
  }

  return blocks.sort(
    (a, b) =>
      (
        PRACTICAL_TIME_PRIORITY[
          a.startTime
        ] || 99
      ) -
      (
        PRACTICAL_TIME_PRIORITY[
          b.startTime
        ] || 99
      )
  );
}

/* =========================================================
   ROOMS
========================================================= */

function roomIsSuitable(
  room,
  requiredCapacity,
  practical
) {
  if (!room) {
    return false;
  }

  if (
    Number(room.capacity || 0) <
    Number(requiredCapacity || 0)
  ) {
    return false;
  }

  const type =
    String(
      room.type || ""
    ).toUpperCase();

  if (practical) {
    return type.includes("LAB");
  }

  return (
    type === "CLASSROOM" ||
    type === "LECTURE_HALL" ||
    type === "ROOM"
  );
}

/*
  Semester 5 should preferably use Lab5-Lab8.

  We don't make this a hard restriction because
  a valid timetable should still be possible if
  one of those labs is unavailable.
*/
function sortRoomsForUse(
  rooms,
  practical,
  preferSemester5Labs = false
) {
  return rooms
    .filter((room) => {
      const type =
        String(
          room.type || ""
        ).toUpperCase();

      if (practical) {
        return type.includes("LAB");
      }

      return !type.includes("LAB");
    })
    .sort((a, b) => {
      const nameA =
        String(
          a.name || ""
        ).toUpperCase();

      const nameB =
        String(
          b.name || ""
        ).toUpperCase();

      if (practical && preferSemester5Labs) {
        const aPreferred =
          /LAB[5-8]\b/.test(nameA);

        const bPreferred =
          /LAB[5-8]\b/.test(nameB);

        if (
          aPreferred !==
          bPreferred
        ) {
          return aPreferred
            ? -1
            : 1;
        }
      }

      /*
        Smaller suitable rooms first.
      */
      return (
        Number(a.capacity || 0) -
        Number(b.capacity || 0)
      );
    });
}

function getDesignatedClassrooms(
  rooms,
  semesterNumber
) {
  const allClassrooms = sortRoomsForUse(
    rooms,
    false
  );

  const designatedRoomNumber =
    SEMESTER_CLASSROOM_MAP[
      Number(semesterNumber)
    ];

  /*
    For semesters without a designated classroom,
    keep the existing flexible classroom behavior.
  */
  if (!designatedRoomNumber) {
    return allClassrooms;
  }

  const designatedClassroom =
    allClassrooms.filter(
      (room) =>
        String(room.roomNumber || "")
          .toUpperCase() ===
        designatedRoomNumber
    );

  if (!designatedClassroom.length) {
    throw new Error(
      `Designated classroom ${designatedRoomNumber} was not found for Semester ${semesterNumber}.`
    );
  }

  return designatedClassroom;
}
/* =========================================================
   WORKLOAD
========================================================= */

function validateWorkloadBeforeGeneration({
  subjects,
  academicSlots,
  batches,
  fixedActivities,
}) {
  const availableAcademicSlots =
    academicSlots.length;

  const theoryHours =
    subjects
      .filter(
        (subject) =>
          !isPracticalSubject(
            subject
          )
      )
      .reduce(
        (sum, subject) =>
          sum +
          getTheoryHours(subject),
        0
      );

  const practicalHoursPerBatch =
    subjects
      .filter(isPracticalSubject)
      .reduce(
        (sum, subject) =>
          sum +
          getPracticalHours(subject),
        0
      );

  const fixedActivityHours =
    fixedActivities.reduce(
      (sum, activity) =>
        sum +
        Number(
          activity.durationHours || 1
        ),
      0
    );

  const requiredSemesterSlots =
    theoryHours +
    practicalHoursPerBatch +
    fixedActivityHours;

  if (
    requiredSemesterSlots >
    availableAcademicSlots
  ) {
    throw new Error(
      `Insufficient academic slots. Required ${requiredSemesterSlots} slots, available ${availableAcademicSlots}.`
    );
  }  return {
    requiredTheoryHours:
      theoryHours,

    requiredPracticalHoursPerBatch:
      practicalHoursPerBatch,

    fixedActivityHours,

    requiredSemesterSlots,

    availableAcademicSlots,

    batchCount:
      batches.length,
  };
}

/* =========================================================
   PRACTICAL CANDIDATE VALIDATION
========================================================= */

function practicalCandidateIsValid({
  block,
  day,
  batch,
  faculty,
  room,
  batchSchedule,
  facultySchedule,
  roomSchedule,
  facultyAvailability,
  roomAvailability,
  globalReservations,
}) {
  /*
    Batch conflict.
  */
  if (
    !isScheduleFree(
      batchSchedule,
      day,
      block.slotIds
    )
  ) {
    return false;
  }

  /*
    Faculty conflict.
  */
  if (
    !isFacultyScheduleFree(
      facultySchedule,
      faculty._id,
      day,
      block.slotIds
    )
  ) {
    return false;
  }

  /*
    Room conflict.
  */
  if (
    !isRoomScheduleFree(
      roomSchedule,
      room._id,
      day,
      block.slotIds
    )
  ) {
    return false;
  }

  /*
    Cross-semester faculty conflict.
  */
  if (
    !isGlobalFacultyFree(
      globalReservations,
      faculty._id,
      day,
      block.slotIds
    )
  ) {
    return false;
  }

  /*
    Cross-semester room conflict.
  */
  if (
    !isGlobalRoomFree(
      globalReservations,
      room._id,
      day,
      block.slotIds
    )
  ) {
    return false;
  }

  /*
    Faculty availability.
  */
  if (
    !isResourceAvailable(
      facultyAvailability,
      faculty._id,
      day,
      block.slotIds
    )
  ) {
    return false;
  }

  /*
    Room availability.
  */
  if (
    !isResourceAvailable(
      roomAvailability,
      room._id,
      day,
      block.slotIds
    )
  ) {
    return false;
  }

  /*
    Batch capacity.
  */
  if (
    Number(room.capacity || 0) <
    Number(batch.studentCount || 0)
  ) {
    return false;
  }

  return true;
}

/* =========================================================
   PRACTICAL ENTRY
========================================================= */

function createPracticalEntry({
  subject,
  batch,
  faculty,
  room,
  block,
}) {
  return {
    day:
      block.day,

    slotIds:
      block.slotIds,

    startTime:
      block.startTime,

    endTime:
      block.endTime,

    subject:
      subject._id,

    subjectCode:
      subject.code,

    subjectName:
      subject.name,

    entryType:
      "PRACTICAL",

    faculty:
      faculty._id,

    facultyName:
      faculty.name,

    room:
      room._id,

    roomName:
      room.name,

    batch:
      batch._id,

    batchName:
      batch.name,

    durationHours:
      2,

    isFixed:
      false,
  };
}

function reservePractical({
  entry,
  batchSchedule,
  facultySchedule,
  roomSchedule,
  practicalUnionSchedule,
}) {
  reserveSchedule(
    batchSchedule,
    entry.day,
    entry.slotIds,
    true
  );

  reserveFacultySchedule(
    facultySchedule,
    entry.faculty,
    entry.day,
    entry.slotIds
  );

  reserveRoomSchedule(
    roomSchedule,
    entry.room,
    entry.day,
    entry.slotIds
  );

  /*
    A practical for any batch blocks
    semester-wide theory/fixed activities.
  */
  reserveSchedule(
    practicalUnionSchedule,
    entry.day,
    entry.slotIds,
    true
  );
}

/* =========================================================
   PRACTICAL DAY ORDER
========================================================= */

function getPreferredPracticalDays(
  subject,
  batch
) {
  const pattern =
    SEMESTER_5_PRACTICAL_PATTERN[
      subject.code
    ];

  const preferredDay =
    pattern
      ? pattern[batch.name]
      : null;

  return unique([
    ...(preferredDay
      ? [preferredDay]
      : []),
    ...ACADEMIC_DAYS,
  ]);
}

/* =========================================================
   PRACTICAL CANDIDATE GENERATION
========================================================= */

function getPracticalCandidates({
  assignment,
  academicSlots,
  labRooms,
  batchSchedules,
  facultySchedule,
  roomSchedule,
  facultyAvailability,
  roomAvailability,
  globalReservations,
  studentCount,
}) {
  const {
    subject,
    batch,
    eligibleFaculty,
    preferredDays,
  } = assignment;

  const batchId =
    idOf(batch._id);

  const batchSchedule =
    batchSchedules.get(
      batchId
    );

  const candidates = [];

  const batchStudentCount =
    Number(
      batch.studentCount ||
        studentCount ||
        0
    );

  /*
    IMPORTANT:

    All five weekdays are considered.

    Preferred day affects only the score.
    It is NOT a hard restriction.
  */
  for (
    let dayIndex = 0;
    dayIndex <
    ACADEMIC_DAYS.length;
    dayIndex++
  ) {
    const day =
      ACADEMIC_DAYS[dayIndex];

    const preferenceIndex =
      preferredDays.indexOf(day);

    const preferencePenalty =
      preferenceIndex === 0
        ? 0
        : preferenceIndex >= 0
        ? preferenceIndex * 10
        : 50;

    const blocks =
      getPracticalBlocks(
        academicSlots,
        day
      );

    for (
      const block of blocks
    ) {
      /*
        Find possible faculty.
      */
      const availableFaculty =
        eligibleFaculty.filter(
          (faculty) =>
            isFacultyScheduleFree(
              facultySchedule,
              faculty._id,
              day,
              block.slotIds
            ) &&
            isGlobalFacultyFree(
              globalReservations,
              faculty._id,
              day,
              block.slotIds
            ) &&
            isResourceAvailable(
              facultyAvailability,
              faculty._id,
              day,
              block.slotIds
            )
        );

      if (
        !availableFaculty.length
      ) {
        continue;
      }

      /*
        Find possible laboratories.
      */
      const availableLabs =
        labRooms.filter(
          (room) =>
            roomIsSuitable(
              room,
              batchStudentCount,
              true
            ) &&
            isRoomScheduleFree(
              roomSchedule,
              room._id,
              day,
              block.slotIds
            ) &&
            isGlobalRoomFree(
              globalReservations,
              room._id,
              day,
              block.slotIds
            ) &&
            isResourceAvailable(
              roomAvailability,
              room._id,
              day,
              block.slotIds
            )
        );

      if (
        !availableLabs.length
      ) {
        continue;
      }

      for (
        const faculty of
          availableFaculty
      ) {
        for (
          const room of
            availableLabs
        ) {
          if (
            !practicalCandidateIsValid({
              block,
              day,
              batch,
              faculty,
              room,
              batchSchedule,
              facultySchedule,
              roomSchedule,
              facultyAvailability,
              roomAvailability,
              globalReservations,
            })
          ) {
            continue;
          }

          const timePriority =
            PRACTICAL_TIME_PRIORITY[
              block.startTime
            ] || 99;

          const roomName =
            String(
              room.name || ""
            ).toUpperCase();

          /*
            Strongly prefer Lab5-Lab8
            for Semester 5.
          */
          const roomPriority =
            /LAB[5-8]\b/.test(
              roomName
            )
              ? 0
              : 100;

          /*
            Prefer a less-used faculty.
          */
          let facultyLoad = 0;

          for (
            const key of
              facultySchedule.keys()
          ) {
            if (
              String(key).startsWith(
                `${idOf(
                  faculty._id
                )}_`
              )
            ) {
              facultyLoad++;
            }
          }

          /*
            Prefer less-used rooms too.
          */
          let roomLoad = 0;

          for (
            const key of
              roomSchedule.keys()
          ) {
            if (
              String(key).startsWith(
                `${String(
                  day
                ).toUpperCase()}_`
              )
            ) {
              roomLoad++;
            }
          }

          candidates.push({
            subject,
            batch,
            faculty,
            room,
            block,

            /*
              Lower score is better.

              Preferred day is important,
              but never mandatory.
            */
            score:
              preferencePenalty * 10000 +
              timePriority * 100 +
              roomPriority +
              facultyLoad * 2 +
              roomLoad,
          });
        }
      }
    }
  }

  candidates.sort(
    (a, b) =>
      a.score - b.score
  );

  return candidates;
}

/* =========================================================
   SEMESTER 5 PRACTICAL SCHEDULER
========================================================= */

/* =========================================================
   SEMESTER 5 INTELLIGENT PRACTICAL SCHEDULER
   ========================================================

   This scheduler uses:

   1. MRV - Minimum Remaining Values
   2. Backtracking
   3. Candidate scoring
   4. Constraint propagation
   5. Cross-semester reservations
   6. Faculty availability
   7. Room/lab availability
   8. Batch conflicts
   9. Faculty conflicts
   10. Lab capacity
   11. Preferred practical days

   IMPORTANT:

   Preferred days are SOFT constraints.

   The scheduler is allowed to move a practical
   to another day when that produces a better
   globally feasible timetable.

========================================================= */

function scheduleSemester5PracticalsIntelligent({
  practicalSubjects,
  batches,
  faculties,
  rooms,
  academicSlots,
  studentCount,
  facultyAvailability,
  roomAvailability,
  batchSchedules,
  facultySchedule,
  roomSchedule,
  practicalUnionSchedule,
  globalReservations,
}) {
  /*
    ============================================================
    SEMESTER 5 PRACTICAL SCHEDULER
    ============================================================

    Design goals:

    1. Every practical is exactly 2 consecutive academic slots.
    2. Different batches may have practicals at the same time.
    3. A batch cannot have two activities at the same time.
    4. A faculty member cannot teach two batches at the same time.
    5. A laboratory cannot host two batches at the same time.
    6. Faculty/lab availability and cross-semester reservations are hard constraints.
    7. Practical capacity must be sufficient for the batch.
    8. Semester-wide theory/fixed activities are blocked by the UNION of
       all practical slots. Therefore practicals should be packed into as
       few unique semester-wide blocks as the real resources allow.
    9. The configured preferred days are soft preferences only.

    The scheduler first searches for the smallest feasible number of
    unique practical blocks. This is intentional: Semester 5 has 16
    batch-practical entries (4 subjects x 4 batches) and only 30
    semester-wide academic slots, so unnecessary spreading of practicals
    can make an otherwise feasible theory timetable impossible.
  */

  const labRooms = sortRoomsForUse(
    rooms,
    true,
    true
  );

  if (!labRooms.length) {
    throw new Error(
      "No laboratory rooms are available for Semester 5 practicals."
    );
  }

  const practicalBlocks = [];

  for (const day of ACADEMIC_DAYS) {
    practicalBlocks.push(
      ...getPracticalBlocks(
        academicSlots,
        day
      )
    );
  }

  if (!practicalBlocks.length) {
    throw new Error(
      "No valid consecutive 2-hour practical blocks are available for Semester 5."
    );
  }

  /* ------------------------------------------------------------
     BUILD TASKS
     ------------------------------------------------------------ */

  const tasks = [];

  for (const subject of practicalSubjects) {
    const practicalHours =
      getPracticalHours(subject);

    if (practicalHours <= 0) {
      continue;
    }

    if (
      practicalHours % PRACTICAL_DURATION_SLOTS !==
      0
    ) {
      throw new Error(
        `Practical subject ${subject.code} requires ${practicalHours} hours. Practical sessions must be exactly 2 hours.`
      );
    }

    const sessionsPerBatch =
      practicalHours /
      PRACTICAL_DURATION_SLOTS;

    const eligibleFaculty =
      getEligibleFaculty(
        subject,
        faculties
      );

    if (!eligibleFaculty.length) {
      throw new Error(
        `Faculty not found for practical subject ${subject.code}.`
      );
    }

    for (const batch of batches) {
      const batchId = idOf(batch._id);

      if (!batchSchedules.has(batchId)) {
        batchSchedules.set(
          batchId,
          new Map()
        );
      }

      const preferredDays =
        getPreferredPracticalDays(
          subject,
          batch
        );

      for (
        let sessionIndex = 0;
        sessionIndex < sessionsPerBatch;
        sessionIndex++
      ) {
        tasks.push({
          id:
            `${subject.code}_${batch.name}_${sessionIndex}`,
          subject,
          batch,
          eligibleFaculty,
          preferredDays,
          sessionIndex,
          sessionsPerBatch,
        });
      }
    }
  }

  if (!tasks.length) {
    return [];
  }

  /* ------------------------------------------------------------
     RESOURCE HELPERS
     ------------------------------------------------------------ */

  function countSuitableLabs(batch) {
    const requiredCapacity =
      Number(
        batch.studentCount ||
          studentCount ||
          0
      );

    return labRooms.filter(
      (room) =>
        Number(room.capacity || 0) >=
        requiredCapacity
    ).length;
  }

  function countFacultyLoad(facultyId) {
    const prefix =
      `${idOf(facultyId)}_`;

    let count = 0;

    for (const key of facultySchedule.keys()) {
      if (
        String(key).startsWith(prefix)
      ) {
        count++;
      }
    }

    return count;
  }

  function countRoomLoad(roomId) {
    const prefix =
      `${idOf(roomId)}_`;

    let count = 0;

    for (const key of roomSchedule.keys()) {
      if (
        String(key).startsWith(prefix)
      ) {
        count++;
      }
    }

    return count;
  }

  function countBatchDayLoad(batchSchedule, day) {
    if (!batchSchedule) {
      return 0;
    }

    const prefix =
      `${String(day).toUpperCase()}_`;

    let count = 0;

    for (const key of batchSchedule.keys()) {
      if (
        String(key).startsWith(prefix)
      ) {
        count++;
      }
    }

    return count;
  }

  function blockKey(block) {
    return block.slotIds
      .map(idOf)
      .join("_");
  }

  /* ------------------------------------------------------------
     TASK ORDER

     Hard-to-place tasks are considered first. This is only an
     ordering heuristic; it never relaxes a constraint.
     ------------------------------------------------------------ */

  tasks.sort((a, b) => {
    const facultyDifference =
      a.eligibleFaculty.length -
      b.eligibleFaculty.length;

    if (facultyDifference !== 0) {
      return facultyDifference;
    }

    const labDifference =
      countSuitableLabs(a.batch) -
      countSuitableLabs(b.batch);

    if (labDifference !== 0) {
      return labDifference;
    }

    return (
      Number(b.subject.practicalHours || 0) -
      Number(a.subject.practicalHours || 0)
    );
  });

  /* ------------------------------------------------------------
     SEARCH STATE
     ------------------------------------------------------------ */

  let entries = [];
  let scheduledTaskIds = new Set();
  let usedPracticalBlocks = new Set();

  function resetAttempt() {
    entries = [];
    scheduledTaskIds = new Set();
    usedPracticalBlocks = new Set();

    for (const batch of batches) {
      batchSchedules.set(
        idOf(batch._id),
        new Map()
      );
    }

    facultySchedule.clear();
    roomSchedule.clear();
    practicalUnionSchedule.clear();
  }

  function candidateScore(task, block, faculty, room, blockAlreadyUsed) {
    let score = 0;

    /*
      Unique-block minimization is the primary soft objective.
      Existing block = strongly preferred.
      New block = strongly penalized.
    */
    if (blockAlreadyUsed) {
      score -= 100000;
    } else {
      score += 100000;
    }

    const day =
      String(block.day).toUpperCase();

    const preferredIndex =
      task.preferredDays.indexOf(day);

    if (preferredIndex === 0) {
      score -= 10000;
    } else if (preferredIndex > 0) {
      score -=
        Math.max(
          1000,
          7000 - preferredIndex * 1000
        );
    } else {
      score += 5000;
    }

    /* Prefer the configured practical periods. */
    score +=
      (PRACTICAL_TIME_PRIORITY[
        block.startTime
      ] || 99) * 10;

    /* Avoid overloading one batch on a single day. */
    const batchSchedule =
      batchSchedules.get(
        idOf(task.batch._id)
      );

    score +=
      countBatchDayLoad(
        batchSchedule,
        day
      ) * 100;

    /* Balance resource use. */
    score +=
      countFacultyLoad(faculty._id) * 20;

    score +=
      countRoomLoad(room._id) * 10;

    /* Prefer the Semester 5 lab range when available. */
    const roomName = String(
      room.name ||
        room.roomNumber ||
        room.code ||
        ""
    ).toUpperCase();

    if (
      /LAB[5-8]\b/.test(roomName)
    ) {
      score -= 500;
    }

    return score;
  }

  function generateCandidates(task, blockLimit) {
    const candidates = [];

    const batchSchedule =
      batchSchedules.get(
        idOf(task.batch._id)
      );

    const requiredCapacity =
      Number(
        task.batch.studentCount ||
          studentCount ||
          0
      );

    for (const block of practicalBlocks) {
      const currentBlockKey =
        blockKey(block);

      const blockAlreadyUsed =
        usedPracticalBlocks.has(
          currentBlockKey
        );

      if (
        !blockAlreadyUsed &&
        usedPracticalBlocks.size >= blockLimit
      ) {
        continue;
      }

      if (
        !isScheduleFree(
          batchSchedule,
          block.day,
          block.slotIds
        )
      ) {
        continue;
      }

      const availableFaculty =
        task.eligibleFaculty.filter(
          (faculty) =>
            isFacultyScheduleFree(
              facultySchedule,
              faculty._id,
              block.day,
              block.slotIds
            ) &&
            isGlobalFacultyFree(
              globalReservations,
              faculty._id,
              block.day,
              block.slotIds
            ) &&
            isResourceAvailable(
              facultyAvailability,
              faculty._id,
              block.day,
              block.slotIds
            )
        );

      if (!availableFaculty.length) {
        continue;
      }

      const availableLabs =
        labRooms.filter(
          (room) =>
            roomIsSuitable(
              room,
              requiredCapacity,
              true
            ) &&
            isRoomScheduleFree(
              roomSchedule,
              room._id,
              block.day,
              block.slotIds
            ) &&
            isGlobalRoomFree(
              globalReservations,
              room._id,
              block.day,
              block.slotIds
            ) &&
            isResourceAvailable(
              roomAvailability,
              room._id,
              block.day,
              block.slotIds
            )
        );

      if (!availableLabs.length) {
        continue;
      }

      for (const faculty of availableFaculty) {
        for (const room of availableLabs) {
          if (
            !practicalCandidateIsValid({
              block,
              day: block.day,
              batch: task.batch,
              faculty,
              room,
              batchSchedule,
              facultySchedule,
              roomSchedule,
              facultyAvailability,
              roomAvailability,
              globalReservations,
            })
          ) {
            continue;
          }

          candidates.push({
            task,
            block,
            faculty,
            room,
            blockKey: currentBlockKey,
            blockAlreadyUsed,
            score: candidateScore(
              task,
              block,
              faculty,
              room,
              blockAlreadyUsed
            ),
          });
        }
      }
    }

    candidates.sort(
      (a, b) =>
        a.score - b.score
    );

    return candidates;
  }

  function applyCandidate(candidate) {
    const {
      task,
      block,
      faculty,
      room,
      blockKey: currentBlockKey,
    } = candidate;

    const batchSchedule =
      batchSchedules.get(
        idOf(task.batch._id)
      );

    const entry =
      createPracticalEntry({
        subject: task.subject,
        batch: task.batch,
        faculty,
        room,
        block,
      });

    reservePractical({
      entry,
      batchSchedule,
      facultySchedule,
      roomSchedule,
      practicalUnionSchedule,
    });

    entries.push(entry);
    scheduledTaskIds.add(task.id);
    usedPracticalBlocks.add(
      currentBlockKey
    );

    return entry;
  }

  function undoCandidate(candidate, entry) {
    const {
      task,
      block,
      faculty,
      room,
      blockKey: currentBlockKey,
    } = candidate;

    const batchSchedule =
      batchSchedules.get(
        idOf(task.batch._id)
      );

    const index =
      entries.lastIndexOf(entry);

    if (index >= 0) {
      entries.splice(index, 1);
    }

    if (batchSchedule) {
      unreserveSchedule(
        batchSchedule,
        block.day,
        block.slotIds
      );
    }

    for (const slotId of block.slotIds) {
      facultySchedule.delete(
        resourceSlotKey(
          faculty._id,
          block.day,
          slotId
        )
      );
    }

    unreserveRoomSchedule(
      roomSchedule,
      room._id,
      block.day,
      block.slotIds
    );

    scheduledTaskIds.delete(
      task.id
    );

    /*
      The block may still be used by another practical entry.
      Recalculate instead of blindly deleting it.
    */
    let stillUsed = false;

    for (const existingEntry of entries) {
      if (
        existingEntry.entryType !==
        "PRACTICAL"
      ) {
        continue;
      }

      if (
        existingEntry.slotIds
          .map(idOf)
          .join("_") ===
        currentBlockKey
      ) {
        stillUsed = true;
        break;
      }
    }

    if (!stillUsed) {
      usedPracticalBlocks.delete(
        currentBlockKey
      );
    }

    /*
      Rebuild the union from remaining practical entries.
      This is deliberately explicit and prevents stale union state
      during backtracking.
    */
    practicalUnionSchedule.clear();

    for (const existingEntry of entries) {
      if (
        existingEntry.entryType !==
        "PRACTICAL"
      ) {
        continue;
      }

      reserveSchedule(
        practicalUnionSchedule,
        existingEntry.day,
        existingEntry.slotIds,
        true
      );
    }
  }

  function forwardCheck(
    remainingTasks,
    blockLimit
  ) {
    for (const task of remainingTasks) {
      if (
        !generateCandidates(
          task,
          blockLimit
        ).length
      ) {
        return false;
      }
    }

    return true;
  }

  /*
    Lower bound:

    At one practical block, a batch can have only one practical.
    Therefore a block can contain at most `batches.length` practical
    entries, regardless of the number of labs.
  */
  const lowerBound = Math.max(
    1,
    Math.ceil(
      tasks.length /
        Math.max(1, batches.length)
    )
  );

  const maxUsefulBlocks =
    practicalBlocks.length;

  /*
    Keep the search bounded. The first feasible budget is accepted,
    which means we minimize the number of semester-wide practical
    blocks without requiring an expensive global optimization pass.
  */
  const MAX_SEARCH_NODES_PER_BUDGET =
    10000;

  let successful = false;
  let successfulBudget = null;
  let totalSearchNodes = 0;

  for (
    let blockLimit = lowerBound;
    blockLimit <= maxUsefulBlocks;
    blockLimit++
  ) {
    resetAttempt();

    let searchNodes = 0;

    function solve(remainingTasks) {
      searchNodes++;
      totalSearchNodes++;

      if (
        searchNodes >
        MAX_SEARCH_NODES_PER_BUDGET
      ) {
        return false;
      }

      if (!remainingTasks.length) {
        return true;
      }

      if (
        !task ||
        !candidates.length
      ) {
        return false;
      }

      const nextRemaining =
        remainingTasks.filter(
          (item) =>
            item.id !== task.id
        );

      for (const candidate of candidates) {
        const entry =
          applyCandidate(
            candidate
          );

        if (
          forwardCheck(
            nextRemaining,
            blockLimit
          ) &&
          solve(nextRemaining)
        ) {
          return true;
        }

        undoCandidate(
          candidate,
          entry
        );
      }

      return false;
    }

    if (solve(tasks)) {
      successful = true;
      successfulBudget =
        blockLimit;
      break;
    }
  }

  if (!successful) {
    resetAttempt();

    throw new Error(
      `Unable to schedule Semester 5 practicals. No conflict-free arrangement was found within the available practical blocks. Required practical entries: ${tasks.length}. Valid 2-hour blocks: ${practicalBlocks.length}. Search states explored: ${totalSearchNodes}. Check faculty assignments/availability, laboratory availability/capacity, or cross-semester reservations.`
    );
  }

  /* ------------------------------------------------------------
     FINAL CONSISTENCY CHECK
     ------------------------------------------------------------ */

  if (
    scheduledTaskIds.size !==
    tasks.length
  ) {
    resetAttempt();

    throw new Error(
      `Semester 5 practical scheduler completed with ${scheduledTaskIds.size} of ${tasks.length} required practical sessions.`
    );
  }

  for (const entry of entries) {
    if (
      entry.entryType !==
      "PRACTICAL"
    ) {
      continue;
    }

    if (
      entry.slotIds.length !==
      PRACTICAL_DURATION_SLOTS
    ) {
      resetAttempt();

      throw new Error(
        `Invalid practical duration generated for ${entry.subjectCode} - ${entry.batchName}.`
      );
    }

    const batchSchedule =
      batchSchedules.get(
        idOf(entry.batch)
      );

    if (!batchSchedule) {
      resetAttempt();

      throw new Error(
        `Batch schedule missing for ${entry.batchName}.`
      );
    }
  }

  /*
    The first successful budget is the smallest feasible number of
    semester-wide practical blocks found by this hard-constraint search.
  */
  if (
    process.env.DEBUG_TIMETABLE ===
    "true"
  ) {
    console.log(
      `[SEM5 PRACTICAL] Scheduled ${entries.length} practical entries using ${successfulBudget} unique practical blocks.`
    );
  }

  return entries;
}

/* =========================================================
   GENERAL PRACTICAL SCHEDULER
========================================================= */

async function schedulePracticals({
  practicalSubjects,
  batches,
  faculties,
  rooms,
  academicSlots,
  studentCount,
  facultyAvailability,
  roomAvailability,
  batchSchedules,
  facultySchedule,
  roomSchedule,
  practicalUnionSchedule,
  globalReservations,
  semesterNumber,
}) {
  /*
    Semester 5 gets the coordinated MRV
    scheduler.
  */
  if (
    Number(semesterNumber) === 5
  ) {
    return scheduleSemester5PracticalsIntelligent({
      practicalSubjects,
      batches,
      faculties,
      rooms,
      academicSlots,
      studentCount,
      facultyAvailability,
      roomAvailability,
      batchSchedules,
      facultySchedule,
      roomSchedule,
      practicalUnionSchedule,
      globalReservations,
    });
  }

  /*
    -------------------------------------------------------
    GENERAL PRACTICAL SCHEDULER
    -------------------------------------------------------
  */

  const entries = [];

  const labRooms =
    sortRoomsForUse(
      rooms,
      true
    );

  if (!labRooms.length) {
    throw new Error(
      "No laboratory rooms are available."
    );
  }

  for (
    const subject of practicalSubjects
  ) {
    const practicalHours =
      getPracticalHours(subject);

    if (
      practicalHours <= 0
    ) {
      continue;
    }

    if (
      practicalHours %
        PRACTICAL_DURATION_SLOTS !==
      0
    ) {
      throw new Error(
        `Practical subject ${subject.code} requires ${practicalHours} hours. Practical sessions must be 2 hours.`
      );
    }

    const sessionsPerBatch =
      practicalHours /
      PRACTICAL_DURATION_SLOTS;

    const eligibleFaculty =
      getEligibleFaculty(
        subject,
        faculties
      );

    if (
      !eligibleFaculty.length
    ) {
      throw new Error(
        `Faculty not found for practical subject ${subject.code}.`
      );
    }

    for (
      const batch of batches
    ) {
      const batchId =
        idOf(batch._id);

      if (
        !batchSchedules.has(
          batchId
        )
      ) {
        batchSchedules.set(
          batchId,
          new Map()
        );
      }

      const batchSchedule =
        batchSchedules.get(
          batchId
        );

      let scheduled = 0;

      for (
        const day of ACADEMIC_DAYS
      ) {
        if (
          scheduled >=
          sessionsPerBatch
        ) {
          break;
        }

        const blocks =          getPracticalBlocks(
            academicSlots,
            day
          );

        for (
          const block of blocks
        ) {
          if (
            scheduled >=
            sessionsPerBatch
          ) {
            break;
          }

          const availableFaculty =
            eligibleFaculty.filter(
              (faculty) =>
                isFacultyScheduleFree(
                  facultySchedule,
                  faculty._id,
                  day,
                  block.slotIds
                ) &&
                isGlobalFacultyFree(
                  globalReservations,
                  faculty._id,
                  day,
                  block.slotIds
                ) &&
                isResourceAvailable(
                  facultyAvailability,
                  faculty._id,
                  day,
                  block.slotIds
                )
            );

          if (
            !availableFaculty.length
          ) {
            continue;
          }

          const availableLabs =
            labRooms.filter(
              (room) =>
                roomIsSuitable(
                  room,
                  batch.studentCount ||
                    studentCount,
                  true
                ) &&
                isRoomScheduleFree(
                  roomSchedule,
                  room._id,
                  day,
                  block.slotIds
                ) &&
                isGlobalRoomFree(
                  globalReservations,
                  room._id,
                  day,
                  block.slotIds
                ) &&
                isResourceAvailable(
                  roomAvailability,
                  room._id,
                  day,
                  block.slotIds
                )
            );

          if (
            !availableLabs.length
          ) {
            continue;
          }

          let selectedFaculty =
            null;

          let selectedRoom =
            null;

          for (
            const faculty of
              availableFaculty
          ) {
            for (
              const room of
                availableLabs
            ) {
              if (
                practicalCandidateIsValid({
                  block,
                  day,
                  batch,
                  faculty,
                  room,
                  batchSchedule,
                  facultySchedule,
                  roomSchedule,
                  facultyAvailability,
                  roomAvailability,
                  globalReservations,
                })
              ) {
                selectedFaculty =
                  faculty;

                selectedRoom =
                  room;

                break;
              }
            }

            if (
              selectedFaculty &&
              selectedRoom
            ) {
              break;
            }
          }

          if (
            !selectedFaculty ||
            !selectedRoom
          ) {
            continue;
          }

          const entry =
            createPracticalEntry({
              subject,
              batch,
              faculty:
                selectedFaculty,
              room:
                selectedRoom,
              block,
            });

          reservePractical({
            entry,
            batchSchedule,
            facultySchedule,
            roomSchedule,
            practicalUnionSchedule,
          });

          entries.push(
            entry
          );

          scheduled++;
        }
      }

      if (
        scheduled <
        sessionsPerBatch
      ) {
        throw new Error(
          `Unable to schedule practical ${subject.code} for batch ${batch.name}. Required ${sessionsPerBatch} session(s), scheduled ${scheduled}.`
        );
      }
    }
  }

  return entries;
}

/* =========================================================
   FIXED ACTIVITIES
========================================================= */

function createFixedEntry({
  activity,
  block,
  room,
}) {
  return {
    day:
      block.day,

    slotIds:
      block.slotIds,

    startTime:
      block.startTime,

    endTime:
      block.endTime,

    subjectCode:
      activity.code ||
      "ACTIVITY",

    subjectName:
      activity.name ||
      "Activity",

    entryType:
      activity.entryType ||
      "ACTIVITY",

    faculty:
      null,

    facultyName:
      null,

    room:
      room?._id || null,

    roomName:
      room?.name || null,

    batch:
      null,

    batchName:
      null,

    durationHours:
      Number(
        activity.durationHours || 1
      ),

    isFixed:
      true,
  };
}

function fixedCandidateIsValid({
  block,
  room,
  semesterSchedule,
  roomSchedule,
  practicalUnionSchedule,
  roomAvailability,
  globalReservations,
  studentCount,
}) {
  if (
    !isScheduleFree(
      semesterSchedule,
      block.day,
      block.slotIds
    )
  ) {
    return false;
  }

  if (
    !isScheduleFree(
      practicalUnionSchedule,
      block.day,
      block.slotIds
    )
  ) {
    return false;
  }

  if (
    !isRoomScheduleFree(
      roomSchedule,
      room._id,
      block.day,
      block.slotIds
    )
  ) {
    return false;
  }

  if (
    !isGlobalRoomFree(
      globalReservations,
      room._id,
      block.day,
      block.slotIds
    )
  ) {
    return false;
  }

  if (
    !isResourceAvailable(
      roomAvailability,
      room._id,
      block.day,
      block.slotIds
    )
  ) {
    return false;
  }

  if (
    Number(room.capacity || 0) <
    Number(studentCount || 0)
  ) {
    return false;
  }

  return true;
}

async function scheduleFixedActivities({
  fixedActivities,
  academicSlots,
  rooms,
  studentCount,
  semesterNumber,
  semesterSchedule,
  roomSchedule,
  practicalUnionSchedule,
  roomAvailability,
  globalReservations,
}) {
  const entries = [];

  if (!fixedActivities.length) {
    return entries;
  }

const classrooms =
  getDesignatedClassrooms(
    rooms,
    semesterNumber
  );

  for (
    const activity of fixedActivities
  ) {
    const requiredSlots =
      Number(
        activity.durationHours || 1
      );

    let placed = false;

    /*
      Exact requested day/time first.
    */
    if (
      activity.day &&
      activity.startTime
    ) {
      const daySlots =
        getSlotsForDay(
          academicSlots,
          activity.day
        );

      const startIndex =
        daySlots.findIndex(
          (slot) =>
            slot.startTime ===
            activity.startTime
        );

      if (
        startIndex >= 0
      ) {
        const blockSlots =
          daySlots.slice(
            startIndex,
            startIndex +
              requiredSlots
          );

        if (
          blockSlots.length ===
          requiredSlots
        ) {
          const block = {
            day:
              activity.day,

            slotIds:
              blockSlots.map(
                (slot) =>
                  slot._id
              ),

            startTime:
              blockSlots[0]
                .startTime,

            endTime:
              blockSlots[
                blockSlots.length - 1
              ].endTime,
          };

          for (
            const room of classrooms
          ) {
            if (
              fixedCandidateIsValid({
                block,
                room,
                semesterSchedule,
                roomSchedule,
                practicalUnionSchedule,
                roomAvailability,
                globalReservations,
                studentCount,
              })
            ) {
              const entry =
                createFixedEntry({
                  activity,
                  block,
                  room,
                });

              entries.push(
                entry
              );

              reserveSchedule(
                semesterSchedule,
                block.day,
                block.slotIds
              );

              reserveRoomSchedule(
                roomSchedule,
                room._id,
                block.day,
                block.slotIds
              );

              placed = true;

              break;
            }
          }
        }
      }
    }

    /*
      Automatic fallback.
    */
    if (!placed) {
      for (
        const day of ACADEMIC_DAYS
      ) {
        if (placed) break;

        const blocks =
          getSlotsForDay(
            academicSlots,
            day
          );

        for (
          let i = 0;
          i <=
          blocks.length -
            requiredSlots;
          i++
        ) {
          const blockSlots =
            blocks.slice(
              i,
              i + requiredSlots
            );

          if (
            blockSlots.length !==
            requiredSlots
          ) {
            continue;
          }

          const block = {
            day,

            slotIds:
              blockSlots.map(
                (slot) =>
                  slot._id
              ),

            startTime:
              blockSlots[0]
                .startTime,

            endTime:
              blockSlots[
                blockSlots.length - 1
              ].endTime,
          };

          for (
            const room of classrooms
          ) {
            if (
              fixedCandidateIsValid({
                block,
                room,
                semesterSchedule,
                roomSchedule,
                practicalUnionSchedule,
                roomAvailability,
                globalReservations,
                studentCount,
              })
            ) {
              const entry =
                createFixedEntry({
                  activity,
                  block,
                  room,
                });

              entries.push(
                entry
              );

              reserveSchedule(
                semesterSchedule,
                block.day,
                block.slotIds
              );

              reserveRoomSchedule(
                roomSchedule,
                room._id,
                block.day,
                block.slotIds
              );

              placed = true;

              break;
            }
          }

          if (placed) break;
        }
      }
    }

    if (!placed) {
      throw new Error(
        `Unable to schedule fixed activity ${activity.code || activity.name}.`
      );
    }
  }

  return entries;
}

/* =========================================================
   THEORY
========================================================= */

function theoryCandidateIsValid({
  block,
  faculty,
  room,
  semesterSchedule,
  facultySchedule,
  roomSchedule,
  practicalUnionSchedule,
  facultyAvailability,
  roomAvailability,
  globalReservations,
  studentCount,
}) {
  if (
    !isScheduleFree(
      semesterSchedule,
      block.day,
      block.slotIds
    )
  ) {
    return false;
  }

  /*
    Theory cannot overlap practicals
    of any batch.
  */
  if (
    !isScheduleFree(
      practicalUnionSchedule,
      block.day,
      block.slotIds
    )
  ) {
    return false;
  }

  if (
    !isFacultyScheduleFree(
      facultySchedule,
      faculty._id,
      block.day,
      block.slotIds
    )
  ) {
    return false;
  }

  if (
    !isRoomScheduleFree(
      roomSchedule,
      room._id,
      block.day,
      block.slotIds
    )
  ) {
    return false;
  }

  if (
    !isGlobalFacultyFree(
      globalReservations,
      faculty._id,
      block.day,
      block.slotIds
    )
  ) {
    return false;
  }

  if (
    !isGlobalRoomFree(
      globalReservations,
      room._id,
      block.day,
      block.slotIds
    )
  ) {
    return false;
  }

  if (
    !isResourceAvailable(
      facultyAvailability,
      faculty._id,
      block.day,
      block.slotIds
    )
  ) {
    return false;
  }

  if (
    !isResourceAvailable(
      roomAvailability,
      room._id,
      block.day,
      block.slotIds
    )
  ) {
    return false;
  }

  if (
    Number(room.capacity || 0) <
    Number(studentCount || 0)
  ) {
    return false;
  }

  return true;
}

function createTheoryEntry({
  subject,
  faculty,
  room,
  block,
}) {
  return {
    day:
      block.day,

    slotIds:
      block.slotIds,

    startTime:
      block.startTime,

    endTime:
      block.endTime,

    subject:
      subject._id,

    subjectCode:
      subject.code,

    subjectName:
      subject.name,

    entryType:
      getEntryTypeForAcademicSubject(
        subject
      ),

    faculty:
      faculty._id,

    facultyName:
      faculty.name,

    room:
      room._id,

    roomName:
      room.name,

    batch:
      null,

    batchName:
      null,

    durationHours:
      1,

    isFixed:
      false,
  };
}

async function scheduleTheory({
  theorySubjects,
  faculties,
  rooms,
  academicSlots,
  semesterNumber,
  studentCount,
  semesterSchedule,
  facultySchedule,
  roomSchedule,
  practicalUnionSchedule,
  facultyAvailability,
  roomAvailability,
  globalReservations,
}) {
  /*
    ============================================================
    FAST THEORY SCHEDULER
    ============================================================

    Design:
    - No recursive backtracking
    - No MRV search explosion
    - No forward-checking loops
    - Constraint-first ordering
    - Bounded greedy retries
    - Works for Semester 3, 5 and 7
    - Preserves all existing hard constraints

    Hard constraints:
    1. Semester slot cannot overlap
    2. Practical union cannot overlap
    3. Faculty cannot overlap
    4. Room cannot overlap
    5. Cross-semester faculty conflict prevented
    6. Cross-semester room conflict prevented
    7. Faculty availability respected
    8. Room availability respected
    9. Classroom capacity respected
    10. Designated classroom respected
    11. Exact theory workload respected
  */

  const classrooms = getDesignatedClassrooms(
    rooms,
    semesterNumber
  );

  if (!classrooms.length) {
    throw new Error(
      `No classroom is available for Semester ${semesterNumber} theory subjects.`
    );
  }

  /*
    ------------------------------------------------------------
    PREPARE SUBJECTS
    ------------------------------------------------------------
  */

  const subjects = theorySubjects
    .filter(
      (subject) =>
        getTheoryHours(subject) > 0
    )
    .map((subject) => {
      const eligibleFaculty =
        getEligibleFaculty(
          subject,
          faculties
        );

      if (!eligibleFaculty.length) {
        throw new Error(
          `Faculty not found for theory subject ${subject.code}.`
        );
      }

      return {
        subject,
        requiredHours:
          getTheoryHours(subject),
        eligibleFaculty,
      };
    });

  if (!subjects.length) {
    return [];
  }

  /*
    ------------------------------------------------------------
    SLOT ORDER
    ------------------------------------------------------------
  */

  const orderedSlots = [...academicSlots];

  orderedSlots.sort((a, b) => {
    const dayOrder = {
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
    };

    const dayA =
      dayOrder[
        String(a.day).toUpperCase()
      ] || 99;

    const dayB =
      dayOrder[
        String(b.day).toUpperCase()
      ] || 99;

    if (dayA !== dayB) {
      return dayA - dayB;
    }

    return (
      Number(a.slotNumber || 0) -
      Number(b.slotNumber || 0)
    );
  });

  /*
    ------------------------------------------------------------
    FACULTY CONSTRAINT COUNT
    ------------------------------------------------------------

    A faculty member teaching many subjects is more
    constrained, so those subjects should be scheduled first.
  */

  const facultySubjectCount =
    new Map();

  for (const item of subjects) {
    for (const faculty of item.eligibleFaculty) {
      const facultyId =
        idOf(faculty._id);

      facultySubjectCount.set(
        facultyId,
        (facultySubjectCount.get(
          facultyId
        ) || 0) + 1
      );
    }
  }

  /*
    ------------------------------------------------------------
    SUBJECT ORDER
    ------------------------------------------------------------

    Most constrained subjects first.

    Priority:
    1. Fewer faculty choices
    2. Faculty shared by many subjects
    3. More required hours
  */

  const orderedSubjects = [
    ...subjects,
  ];

  orderedSubjects.sort((a, b) => {
    if (
      a.eligibleFaculty.length !==
      b.eligibleFaculty.length
    ) {
      return (
        a.eligibleFaculty.length -
        b.eligibleFaculty.length
      );
    }

    const aConstraint =
      Math.max(
        ...a.eligibleFaculty.map(
          (faculty) =>
            facultySubjectCount.get(
              idOf(faculty._id)
            ) || 0
        )
      );

    const bConstraint =
      Math.max(
        ...b.eligibleFaculty.map(
          (faculty) =>
            facultySubjectCount.get(
              idOf(faculty._id)
            ) || 0
        )
      );

    if (
      aConstraint !== bConstraint
    ) {
      return (
        bConstraint -
        aConstraint
      );
    }

    return (
      b.requiredHours -
      a.requiredHours
    );
  });

  /*
    ------------------------------------------------------------
    GENERATED ENTRIES
    ------------------------------------------------------------
  */

  const generatedEntries = [];

  /*
    ------------------------------------------------------------
    TRACKING
    ------------------------------------------------------------
  */

  const subjectDayUsage =
    new Map();

  const facultyLoads =
    new Map();

  const dayLoads =
    new Map();

  function subjectKey(subject) {
    return idOf(subject._id);
  }

  function getSubjectDayCount(
    subject,
    day
  ) {
    const key =
      `${subjectKey(subject)}_${String(
        day
      ).toUpperCase()}`;

    return (
      subjectDayUsage.get(key) || 0
    );
  }

  function reserveSubjectDay(
    subject,
    day
  ) {
    const key =
      `${subjectKey(subject)}_${String(
        day
      ).toUpperCase()}`;

    subjectDayUsage.set(
      key,
      getSubjectDayCount(
        subject,
        day
      ) + 1
    );
  }

  function getFacultyLoad(
    facultyId
  ) {
    return (
      facultyLoads.get(
        idOf(facultyId)
      ) || 0
    );
  }

  function getDayLoad(day) {
    return (
      dayLoads.get(
        String(day).toUpperCase()
      ) || 0
    );
  }

  function reserveLoad(
    subject,
    day,
    facultyId
  ) {
    const normalizedDay =
      String(day).toUpperCase();

    dayLoads.set(
      normalizedDay,
      getDayLoad(normalizedDay) + 1
    );

    const facultyKey =
      idOf(facultyId);

    facultyLoads.set(
      facultyKey,
      getFacultyLoad(
        facultyId
      ) + 1
    );

    reserveSubjectDay(
      subject,
      normalizedDay
    );
  }

  /*
    ------------------------------------------------------------
    CLEAR GENERATED THEORY
    ------------------------------------------------------------

    Used only when a bounded retry needs to restart.
    Practical/fixed entries remain untouched.
  */

  function clearGeneratedTheory() {
    for (
      const entry of generatedEntries
    ) {
      unreserveSchedule(
        semesterSchedule,
        entry.day,
        entry.slotIds
      );

      if (entry.faculty) {
        for (
          const slotId of
            entry.slotIds
        ) {
          facultySchedule.delete(
            resourceSlotKey(
              entry.faculty,
              entry.day,
              slotId
            )
          );
        }
      }

      if (entry.room) {
        unreserveRoomSchedule(
          roomSchedule,
          entry.room,
          entry.day,
          entry.slotIds
        );
      }
    }

    generatedEntries.length = 0;
    subjectDayUsage.clear();
    facultyLoads.clear();
    dayLoads.clear();
  }

  /*
    ------------------------------------------------------------
    STATIC CANDIDATE CHECK
    ------------------------------------------------------------

    This checks constraints which do not change during
    theory scheduling.
  */

  function isStaticCandidateValid(
    subject,
    faculty,
    room,
    slot
  ) {
    const block = {
      day: slot.day,
      slotIds: [slot._id],
      startTime: slot.startTime,
      endTime: slot.endTime,
    };

    if (
      !roomIsSuitable(
        room,
        studentCount,
        false
      )
    ) {
      return false;
    }

    if (
      !isGlobalFacultyFree(
        globalReservations,
        faculty._id,
        block.day,
        block.slotIds
      )
    ) {
      return false;
    }

    if (
      !isGlobalRoomFree(
        globalReservations,
        room._id,
        block.day,
        block.slotIds
      )
    ) {
      return false;
    }

    if (
      !isResourceAvailable(
        facultyAvailability,
        faculty._id,
        block.day,
        block.slotIds
      )
    ) {
      return false;
    }

    if (
      !isResourceAvailable(
        roomAvailability,
        room._id,
        block.day,
        block.slotIds
      )
    ) {
      return false;
    }

    return true;
  }

  /*
    ------------------------------------------------------------
    DYNAMIC CANDIDATE CHECK
    ------------------------------------------------------------
  */

  function isDynamicCandidateValid(
    subject,
    faculty,
    room,
    slot
  ) {
    const block = {
      day: slot.day,
      slotIds: [slot._id],
      startTime: slot.startTime,
      endTime: slot.endTime,
    };

    return theoryCandidateIsValid({
      block,
      faculty,
      room,
      semesterSchedule,
      facultySchedule,
      roomSchedule,
      practicalUnionSchedule,
      facultyAvailability,
      roomAvailability,
      globalReservations,
      studentCount,
    });
  }

  /*
    ------------------------------------------------------------
    CANDIDATE GENERATION
    ------------------------------------------------------------

    Unlike the old implementation, this is called only once
    for the subject hour being placed.
  */

  function getCandidates(
    item,
    occurrence,
    retrySeed
  ) {
    const candidates = [];

    for (
      const slot of orderedSlots
    ) {
      for (
        const faculty of
          item.eligibleFaculty
      ) {
        /*
          Faculty with more current workload is slightly
          deprioritized, but never rejected.
        */

        if (
          !isStaticCandidateValid(
            item.subject,
            faculty,
            classrooms[0],
            slot
          )
        ) {
          continue;
        }

        if (
          !isFacultyScheduleFree(
            facultySchedule,
            faculty._id,
            slot.day,
            [slot._id]
          )
        ) {
          continue;
        }

        if (
          !isGlobalFacultyFree(
            globalReservations,
            faculty._id,
            slot.day,
            [slot._id]
          )
        ) {
          continue;
        }

        /*
          Try designated classroom(s).

          Normally there is exactly one classroom per
          semester, but this keeps the function generic.
        */

        for (
          const room of classrooms
        ) {
          if (
            !isStaticCandidateValid(
              item.subject,
              faculty,
              room,
              slot
            )
          ) {
            continue;
          }

          if (
            !isDynamicCandidateValid(
              item.subject,
              faculty,
              room,
              slot
            )
          ) {
            continue;
          }

          const sameDayCount =
            getSubjectDayCount(
              item.subject,
              slot.day
            );

          const dayLoad =
            getDayLoad(slot.day);

          const facultyLoad =
            getFacultyLoad(
              faculty._id
            );

          /*
            Score:
            lower = better

            Strongly prefer:
            - first occurrence on a day
            - balanced daily workload
            - balanced faculty workload
            - earlier periods

            retrySeed slightly changes the preference
            between otherwise equivalent candidates.
          */

          let score =
            sameDayCount * 10000 +
            dayLoad * 200 +
            facultyLoad * 20 +
            Number(
              slot.slotNumber || 0
            );

          /*
            Small deterministic variation between retries.
            This allows another valid arrangement without
            creating an expensive search tree.
          */

          if (retrySeed > 0) {
            score +=
              (
                (
                  Number(
                    slot.slotNumber || 0
                  ) +
                  retrySeed +
                  occurrence
                ) %
                5
              );
          }

          candidates.push({
            subject: item.subject,
            faculty,
            room,
            slot,
            block: {
              day: slot.day,
              slotIds: [slot._id],
              startTime:
                slot.startTime,
              endTime:
                slot.endTime,
            },
            score,
          });
        }
      }
    }

    candidates.sort(
      (a, b) =>
        a.score - b.score
    );

    return candidates;
  }

  /*
    ------------------------------------------------------------
    APPLY
    ------------------------------------------------------------
  */

  function applyCandidate(
    candidate
  ) {
    const {
      subject,
      faculty,
      room,
      block,
    } = candidate;

    const entry =
      createTheoryEntry({
        subject,
        faculty,
        room,
        block,
      });

    reserveSchedule(
      semesterSchedule,
      block.day,
      block.slotIds
    );

    reserveFacultySchedule(
      facultySchedule,
      faculty._id,
      block.day,
      block.slotIds
    );

    reserveRoomSchedule(
      roomSchedule,
      room._id,
      block.day,
      block.slotIds
    );

    reserveLoad(
      subject,
      block.day,
      faculty._id
    );

    generatedEntries.push(
      entry
    );

    return entry;
  }

  /*
    ------------------------------------------------------------
    ONE GREEDY ATTEMPT
    ------------------------------------------------------------
  */

  function runAttempt(
    retrySeed
  ) {
    clearGeneratedTheory();

    /*
      Schedule the most constrained subjects first.
    */

    for (
      const item of orderedSubjects
    ) {
      for (
        let occurrence = 0;
        occurrence <
        item.requiredHours;
        occurrence++
      ) {
        const candidates =
          getCandidates(
            item,
            occurrence,
            retrySeed
          );

        if (!candidates.length) {
          return {
            success: false,
            failedSubject:
              item.subject,
            failedOccurrence:
              occurrence + 1,
          };
        }

        /*
          Select the best candidate.
        */

        applyCandidate(
          candidates[0]
        );
      }
    }

    return {
      success: true,
    };
  }

  /*
    ------------------------------------------------------------
    BOUNDED RETRIES
    ------------------------------------------------------------

    This is NOT recursive backtracking.

    Each attempt is a complete fast greedy generation.

    Normally attempt 1 should succeed.
  */

  const MAX_ATTEMPTS = 30;

  let result = null;

  for (
    let attempt = 0;
    attempt < MAX_ATTEMPTS;
    attempt++
  ) {
    result = runAttempt(
      attempt
    );

    if (result.success) {
      break;
    }
  }

  /*
    ------------------------------------------------------------
    FAILURE
    ------------------------------------------------------------
  */

  if (
    !result ||
    !result.success
  ) {
    const failedSubject =
      result &&
      result.failedSubject
        ? result.failedSubject
        : null;

    const failedCode =
      failedSubject
        ? failedSubject.code
        : "UNKNOWN";

    clearGeneratedTheory();

    throw new Error(
      `Unable to generate a conflict-free theory timetable for Semester ${semesterNumber}. ` +
      `Unable to place theory subject ${failedCode}. ` +
      `The fast scheduler tried ${MAX_ATTEMPTS} complete arrangements while respecting faculty, room, practical, availability, capacity and cross-semester constraints.`
    );
  }

  /*
    ------------------------------------------------------------
    FINAL EXACT WORKLOAD CHECK
    ------------------------------------------------------------
  */

  for (
    const item of orderedSubjects
  ) {
    const scheduled =
      generatedEntries.filter(
        (entry) =>
          idOf(entry.subject) ===
          idOf(
            item.subject._id
          )
      ).length;

    if (
      scheduled !==
      item.requiredHours
    ) {
      clearGeneratedTheory();

      throw new Error(
        `Unable to schedule theory subject ${item.subject.code}. ` +
        `Required ${item.requiredHours} hours, scheduled ${scheduled}.`
      );
    }
  }

  /*
    ------------------------------------------------------------
    RETURN
    ------------------------------------------------------------
  */

  return generatedEntries;
}

function countDayEntries(
  schedule,
  day
) {
  let count = 0;

  const prefix =
    `${String(day).toUpperCase()}_`;

  for (
    const key of schedule.keys()
  ) {
    if (
      String(key).startsWith(prefix)
    ) {
      count++;
    }
  }

  return count;
}

/* =========================================================
   VALIDATION
========================================================= */

function validateGeneratedEntries(
  entries
) {
  const errors = [];

  const facultySlots =
    new Map();

  const roomSlots =
    new Map();

  const semesterSlots =
    new Map();

  const batchSlots =
    new Map();

  const practicalSlots =
    new Set();

  /*
    Mark every practical slot.  */
  for (
    const entry of entries
  ) {
    if (
      entry.entryType !==
      "PRACTICAL"
    ) {
      continue;
    }

    for (
      const slotId of
        entry.slotIds
    ) {
      practicalSlots.add(
        slotKey(
          entry.day,
          slotId
        )
      );
    }
  }

  /*
    Validate every entry.
  */
  for (
    const entry of entries
  ) {
    const practical =
      entry.entryType ===
      "PRACTICAL";

    for (
      const slotId of
        entry.slotIds
    ) {
      const key =
        slotKey(
          entry.day,
          slotId
        );

      /*
        Theory/fixed activities cannot
        overlap practicals.
      */
      if (
        !practical &&
        practicalSlots.has(key)
      ) {
        errors.push(
          `SEMESTER_PRACTICAL_CONFLICT: ${entry.subjectCode} overlaps a practical on ${entry.day}.`
        );
      }

      /*
        Semester-wide conflicts.
      */
      if (!practical) {
        if (
          semesterSlots.has(key)
        ) {
          errors.push(
            `SEMESTER_CONFLICT: ${entry.subjectCode} overlaps another semester-wide entry on ${entry.day}.`
          );
        } else {
          semesterSlots.set(
            key,
            entry
          );
        }
      }

      /*
        Faculty conflicts.
      */
      if (entry.faculty) {
        const facultyKey =
          resourceSlotKey(
            entry.faculty,
            entry.day,
            slotId
          );

        if (
          facultySlots.has(
            facultyKey
          )
        ) {
          errors.push(
            `FACULTY_CONFLICT: ${entry.facultyName} has multiple activities on ${entry.day}.`
          );
        } else {
          facultySlots.set(
            facultyKey,
            entry
          );
        }
      }

      /*
        Room conflicts.
      */
      if (entry.room) {
        const roomKey =
          resourceSlotKey(
            entry.room,
            entry.day,
            slotId
          );

        if (
          roomSlots.has(
            roomKey
          )
        ) {
          errors.push(
            `ROOM_CONFLICT: ${entry.roomName} has multiple activities on ${entry.day}.`
          );
        } else {
          roomSlots.set(
            roomKey,
            entry
          );
        }
      }

      /*
        Batch conflicts.
      */
      if (entry.batch) {
        const batchKey =
          resourceSlotKey(
            entry.batch,
            entry.day,
            slotId
          );

        if (
          batchSlots.has(
            batchKey
          )
        ) {
          errors.push(
            `BATCH_CONFLICT: ${entry.batchName} has multiple activities on ${entry.day}.`
          );
        } else {
          batchSlots.set(
            batchKey,
            entry
          );
        }
      }
    }
  }

  return {
    isValid:
      errors.length === 0,

    errors,
  };
}

/* =========================================================
   MAIN GENERATOR
========================================================= */

async function generateCSESemesterTimetable({
  departmentId,
  semesterId,
  semesterNumber,
  studentCount,
  batches,
  fixedActivities = [],
  globalReservations = null,
}) {
  /*
    -------------------------------------------------------
    LOAD SUBJECTS
    -------------------------------------------------------
  */

  const subjects =
    await Subject.find({
      department:
        departmentId,

      semester:
        semesterId,
    }).lean();

  if (!subjects.length) {
    throw new Error(
      `No subjects found for semester ${semesterNumber}.`
    );
  }

  /*
    -------------------------------------------------------
    LOAD FACULTY / ROOMS / SLOTS / AVAILABILITY
    -------------------------------------------------------
  */

  const referencedFacultyIds =
    unique(
      subjects.flatMap(
        (subject) =>
          getSubjectFacultyIds(
            subject
          )
      )
    );

  const [
    faculties,
    rooms,
    timeSlots,
    availabilityRecords,
  ] = await Promise.all([
    Faculty.find({
      $or: [
        {
          department:
            departmentId,
        },
        {
          _id: {
            $in:
              referencedFacultyIds,
          },
        },
      ],
    }).lean(),

    Room.find({}).lean(),

    TimeSlot.find({
      isBreak: false,
    }).lean(),

    Availability.find({}).lean(),
  ]);

  if (!batches.length) {
    throw new Error(
      `No batches found for semester ${semesterNumber}.`
    );
  }

  const academicSlots =
    getAcademicSlots(
      timeSlots
    );

  if (!academicSlots.length) {
    throw new Error(
      "No academic time slots found."
    );
  }

  /*
    -------------------------------------------------------
    AVAILABILITY
    -------------------------------------------------------
  */

  const facultyAvailability =
    buildAvailabilityMap(
      availabilityRecords.filter(
        (record) =>
          String(
            record.resourceType || ""
          ).toUpperCase() ===
          "FACULTY"
      )
    );

  const roomAvailability =
    buildAvailabilityMap(
      availabilityRecords.filter(
        (record) =>
          String(
            record.resourceType || ""
          ).toUpperCase() ===
          "ROOM"
      )
    );

  /*
    -------------------------------------------------------
    WORKLOAD
    -------------------------------------------------------
  */

  const workload =
    validateWorkloadBeforeGeneration({
      subjects,
      academicSlots,
      batches,
      fixedActivities,
    });

  /*
    -------------------------------------------------------
    LOCAL SCHEDULES
    -------------------------------------------------------
  */

  const semesterSchedule =
    new Map();

  const practicalUnionSchedule =
    new Map();

  const facultySchedule =
    new Map();

  const roomSchedule =
    new Map();

  const batchSchedules =
    new Map();

  for (
    const batch of batches
  ) {
    batchSchedules.set(
      idOf(batch._id),
      new Map()
    );
  }

  if (!globalReservations) {
    globalReservations =
      createEmptyGlobalReservations();
  }

  /*
    -------------------------------------------------------
    SUBJECT TYPES
    -------------------------------------------------------
  */

  const practicalSubjects =
    subjects.filter(
      isPracticalSubject
    );

  const theorySubjects =
    subjects.filter(
      (subject) =>
        !isPracticalSubject(
          subject
        )
    );

  /*
    -------------------------------------------------------
    STAGE 1
    PRACTICALS
    -------------------------------------------------------
  */

  const practicalEntries =
    await schedulePracticals({
      practicalSubjects,

      batches,

      faculties,

      rooms,

      academicSlots,

      studentCount,

      facultyAvailability,

      roomAvailability,

      batchSchedules,

      facultySchedule,

      roomSchedule,

      practicalUnionSchedule,

      globalReservations,

      semesterNumber,
    });

  /*
    -------------------------------------------------------
    STAGE 2
    FIXED ACTIVITIES
    -------------------------------------------------------
  */

  const fixedEntries =
    await scheduleFixedActivities({
      fixedActivities,

      academicSlots,

      rooms,

      studentCount,

      semesterNumber,

      semesterSchedule,

      roomSchedule,

      practicalUnionSchedule,

      roomAvailability,

      globalReservations,
    });

  /*
    -------------------------------------------------------
    STAGE 3
    THEORY
    -------------------------------------------------------
  */

  const theoryEntries =
    await scheduleTheory({
      theorySubjects,

      faculties,

      rooms,

      academicSlots,

      semesterNumber,

      studentCount,

      semesterSchedule,

      facultySchedule,

      roomSchedule,

      practicalUnionSchedule,

      facultyAvailability,

      roomAvailability,

      globalReservations,
    });

  /*
    -------------------------------------------------------
    COMBINE
    -------------------------------------------------------
  */

  const entries = [
    ...practicalEntries,
    ...fixedEntries,
    ...theoryEntries,
  ];

  /*
    -------------------------------------------------------
    VALIDATION
    -------------------------------------------------------
  */

  const validation =
    validateGeneratedEntries(
      entries
    );

  const usedTheorySlots =
    theoryEntries.reduce(
      (sum, entry) =>
        sum +
        entry.slotIds.length,
      0
    );

  /*
    Practical slots are calculated
    at semester level.

    Example:

      16 practical entries
      × 2 slots
      ÷ 4 batches
      = 8 semester-level slots
  */
  const usedPracticalSlots =
    practicalEntries.length
      ? practicalEntries.reduce(
          (sum, entry) =>
            sum +
            entry.slotIds.length,
          0
        ) / batches.length
      : 0;

  const usedFixedSlots =
    fixedEntries.reduce(
      (sum, entry) =>
        sum +
        entry.slotIds.length,
      0
    );

  const remainingAcademicSlots =
    Math.max(
      0,
      workload.availableAcademicSlots -
        usedTheorySlots -
        usedPracticalSlots -
        usedFixedSlots
    );

  /*
    -------------------------------------------------------
    RETURN
    -------------------------------------------------------
  */

  /*
  ---------------------------------------------------------
  COMMIT SUCCESSFUL ENTRIES TO GLOBAL RESERVATIONS
  ---------------------------------------------------------

  This makes the generated semester occupy its faculty
  and classroom slots for subsequent semester generation.

  Example:

    Semester 3 generated first
        ↓
    reserve its faculty/room slots
        ↓
    Semester 5 generation sees them as occupied
        ↓
    Semester 7 generation sees both as occupied
*/
if (globalReservations) {
  for (const entry of entries) {
    reserveGlobalEntry(
      globalReservations,
      entry
    );
  }
}

  return {
    entries,

    validation: {
      isValid:
        validation.isValid,

      errors:
        validation.errors,

      warnings: [],

      workload: {
        requiredTheoryHours:
          workload.requiredTheoryHours,

        requiredPracticalHoursPerBatch:
          workload.requiredPracticalHoursPerBatch,

        availableAcademicSlots:
          workload.availableAcademicSlots,

        usedTheorySlots,

        usedPracticalSlots,

        fixedActivityHours:
          workload.fixedActivityHours,

        usedFixedActivitySlots:
          usedFixedSlots,
      },
    },

    workload: {
      requiredTheoryHours:
        workload.requiredTheoryHours,

      requiredPracticalHoursPerBatch:
        workload.requiredPracticalHoursPerBatch,

      fixedActivityHours:
        workload.fixedActivityHours,

      totalPracticalHours:
        workload.requiredPracticalHoursPerBatch *
        batches.length,

      availableAcademicSlots:
        workload.availableAcademicSlots,

      usedTheorySlots,

      usedPracticalSlots,

      usedFixedSlots,

      remainingAcademicSlots,
    },

    summary: {
      studentCount,

      batchCount:
        batches.length,

      totalEntries:
        entries.length,

      practicalEntries:
        practicalEntries.length,

      theoryEntries:
        theoryEntries.length,

      fixedEntries:
        fixedEntries.length,

      practicalBlocksUsed:
        batches.length
          ? practicalEntries.length /
            batches.length
          : 0,
    },
  };
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  generateCSESemesterTimetable,
  createEmptyGlobalReservations,
  reserveGlobalEntry,
};