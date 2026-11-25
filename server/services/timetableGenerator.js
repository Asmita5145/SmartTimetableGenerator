const TimeSlot = require("../models/TimeSlot");
const Availability = require("../models/Availability");

const DAY_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

const generateTimetable = async ({
  divisionId = null,
  studentCount = null,
  subjects,
  faculty,
  rooms,
}) => {
  // --------------------------------------------------
  // 1. BASIC VALIDATION
  // --------------------------------------------------

  if (!Array.isArray(subjects) || !subjects.length) {
    throw new Error("No subjects are available for timetable generation");
  }

  if (!Array.isArray(faculty) || !faculty.length) {
    throw new Error("No faculty members are available");
  }

  if (!Array.isArray(rooms) || !rooms.length) {
    throw new Error("No classrooms or laboratories are available");
  }

  // divisionId is now OPTIONAL.
  // A timetable can belong directly to a semester.

  // --------------------------------------------------
  // 2. LOAD TIME SLOTS
  // --------------------------------------------------

  const allSlots = await TimeSlot.find().lean();

  if (!allSlots.length) {
    throw new Error("No time slots are configured");
  }

  const timeSlots = allSlots
    .filter((slot) => !slot.isBreak)
    .sort((a, b) => {
      const dayDifference =
        DAY_ORDER.indexOf(a.day) -
        DAY_ORDER.indexOf(b.day);

      return (
        dayDifference ||
        a.slotNumber - b.slotNumber
      );
    });

  if (!timeSlots.length) {
    throw new Error("No working time slots found");
  }

  // --------------------------------------------------
  // 3. GROUP SLOTS BY DAY
  // --------------------------------------------------

  const slotsByDay = new Map();

  for (const slot of allSlots) {
    if (!slotsByDay.has(slot.day)) {
      slotsByDay.set(slot.day, []);
    }

    slotsByDay.get(slot.day).push(slot);
  }

  for (const slots of slotsByDay.values()) {
    slots.sort(
      (a, b) =>
        a.slotNumber - b.slotNumber
    );
  }

  // --------------------------------------------------
  // 4. LOAD AVAILABILITY
  // --------------------------------------------------

  const facultyIds = faculty.map(
    (item) => item._id
  );

  const roomIds = rooms.map(
    (item) => item._id
  );

  const [
    facultyAvailability,
    roomAvailability,
  ] = await Promise.all([
    Availability.find({
      resourceType: "FACULTY",
      resourceId: {
        $in: facultyIds,
      },
    }).lean(),

    Availability.find({
      resourceType: "ROOM",
      resourceId: {
        $in: roomIds,
      },
    }).lean(),
  ]);

  // --------------------------------------------------
  // 5. AVAILABILITY CHECK
  // --------------------------------------------------

  const isAvailable = (
    records,
    resourceId,
    slots
  ) => {
    return slots.every((slot) => {
      const recordsForDay =
        records.filter(
          (record) =>
            String(record.resourceId) ===
              String(resourceId) &&
            record.day === slot.day
        );

      // No availability record for that
      // resource/day = unrestricted.
      if (!recordsForDay.length) {
        return true;
      }

      const allowedSlotIds =
        new Set(
          recordsForDay.flatMap(
            (record) =>
              (record.availableSlots || []).map(
                String
              )
          )
        );

      return allowedSlotIds.has(
        String(slot._id)
      );
    });
  };

  // --------------------------------------------------
  // 6. BUILD REQUIRED SESSIONS
  // --------------------------------------------------

  const sessions = [];

  for (const subject of subjects) {
    const weeklyHours = Number(
      subject.weeklyHours || 0
    );

    if (
      !Number.isFinite(weeklyHours) ||
      weeklyHours < 1
    ) {
      throw new Error(
        `Invalid weekly hours configured for ${subject.name}`
      );
    }

    // ----------------------------------------------
    // PRACTICAL
    // ----------------------------------------------

    if (subject.type === "PRACTICAL") {
      const practicalHours = Number(
        subject.practicalHours || 2
      );

      if (practicalHours !== 2) {
        throw new Error(
          `${subject.name}: practical sessions must be 2 hours`
        );
      }

      if (
        weeklyHours % practicalHours !==
        0
      ) {
        throw new Error(
          `${subject.name}: weekly practical hours must be divisible by 2`
        );
      }

      for (
        let hours = 0;
        hours < weeklyHours;
        hours += 2
      ) {
        sessions.push({
          subject,
          durationSlots: 2,
        });
      }
    }

    // ----------------------------------------------
    // LECTURE / TUTORIAL
    // ----------------------------------------------

    else {
      for (
        let hours = 0;
        hours < weeklyHours;
        hours += 1
      ) {
        sessions.push({
          subject,
          durationSlots: 1,
        });
      }
    }
  }

  // --------------------------------------------------
  // 7. HARDER SESSIONS FIRST
  // --------------------------------------------------

  sessions.sort((a, b) => {
    if (
      a.durationSlots !==
      b.durationSlots
    ) {
      return (
        b.durationSlots -
        a.durationSlots
      );
    }

    return (
      Number(
        b.subject.weeklyHours || 0
      ) -
      Number(
        a.subject.weeklyHours || 0
      )
    );
  });

  // --------------------------------------------------
  // 8. SCHEDULING STATE
  // --------------------------------------------------

  const entries = [];

  const facultySchedule =
    new Set();

  const roomSchedule =
    new Set();

  // Only used when a division exists.
  const divisionSchedule =
    new Set();

  const subjectDayCount =
    new Map();

  const facultyLoad =
    new Map();

  // --------------------------------------------------
  // 9. HELPER KEYS
  // --------------------------------------------------

  const getBusyKey = (
    resourceId,
    slot
  ) =>
    `${resourceId}_${slot.day}_${slot.slotNumber}`;

  const getDivisionKey = (slot) =>
    `${slot.day}_${slot.slotNumber}`;

  // --------------------------------------------------
  // 10. GENERATE EACH SESSION
  // --------------------------------------------------

  for (const session of sessions) {
    const {
      subject,
      durationSlots,
    } = session;

    const subjectId =
      String(subject._id);

    let placed = false;

    // ----------------------------------------------
    // ORDER START SLOTS
    // ----------------------------------------------

    const orderedStartSlots =
      [...timeSlots].sort(
        (a, b) => {
          const countA =
            subjectDayCount.get(
              `${subjectId}_${a.day}`
            ) || 0;

          const countB =
            subjectDayCount.get(
              `${subjectId}_${b.day}`
            ) || 0;

          if (countA !== countB) {
            return (
              countA - countB
            );
          }

          const dayDifference =
            DAY_ORDER.indexOf(a.day) -
            DAY_ORDER.indexOf(b.day);

          return (
            dayDifference ||
            a.slotNumber -
              b.slotNumber
          );
        }
      );

    // ----------------------------------------------
    // TRY EACH START SLOT
    // ----------------------------------------------

    for (
      const startSlot of orderedStartSlots
    ) {
      if (placed) break;

      const daySlots =
        slotsByDay.get(
          startSlot.day
        ) || [];

      const occupiedSlots = [];

      // --------------------------------------------
      // FIND CONSECUTIVE SLOTS
      // --------------------------------------------

      for (
        let offset = 0;
        offset < durationSlots;
        offset += 1
      ) {
        const requiredNumber =
          startSlot.slotNumber +
          offset;

        const slot =
          daySlots.find(
            (item) =>
              item.slotNumber ===
              requiredNumber
          );

        if (
          !slot ||
          slot.isBreak
        ) {
          occupiedSlots.length = 0;
          break;
        }

        occupiedSlots.push(slot);
      }

      if (
        occupiedSlots.length !==
        durationSlots
      ) {
        continue;
      }

      // Extra practical safety check.
      if (durationSlots === 2) {
        const first =
          occupiedSlots[0];

        const second =
          occupiedSlots[1];

        if (
          first.day !== second.day ||
          second.slotNumber !==
            first.slotNumber + 1
        ) {
          continue;
        }
      }

      // --------------------------------------------
      // FIND FACULTY
      // --------------------------------------------

      let possibleFaculty = [];

      if (
        Array.isArray(
          subject.faculty
        ) &&
        subject.faculty.length
      ) {
        const assignedIds =
          new Set(
            subject.faculty.map(
              (item) =>
                String(
                  item._id ||
                    item
                )
            )
          );

        possibleFaculty =
          faculty.filter(
            (item) =>
              assignedIds.has(
                String(item._id)
              )
          );
      }

      // If subject has no faculty assigned,
      // temporarily use available faculty.
      if (!possibleFaculty.length) {
        possibleFaculty =
          [...faculty];
      }

      // Least-loaded faculty first.
      possibleFaculty.sort(
        (a, b) =>
          (
            facultyLoad.get(
              String(a._id)
            ) || 0
          ) -
          (
            facultyLoad.get(
              String(b._id)
            ) || 0
          )
      );

      // --------------------------------------------
      // TRY FACULTY
      // --------------------------------------------

      for (
        const facultyMember of
          possibleFaculty
      ) {
        if (placed) break;

        const facultyId =
          String(
            facultyMember._id
          );

        const facultyBusy =
          occupiedSlots.some(
            (slot) =>
              facultySchedule.has(
                getBusyKey(
                  facultyId,
                  slot
                )
              )
          );

        if (facultyBusy) {
          continue;
        }

        if (
          !isAvailable(
            facultyAvailability,
            facultyMember._id,
            occupiedSlots
          )
        ) {
          continue;
        }

        // ------------------------------------------
        // FIND SUITABLE ROOMS
        // ------------------------------------------

        const suitableRooms =
          rooms
            .filter((room) => {
              // Practical → LAB
              if (
                subject.type ===
                  "PRACTICAL" &&
                room.type !== "LAB"
              ) {
                return false;
              }

              // Lecture/tutorial → CLASSROOM
              if (
                subject.type !==
                  "PRACTICAL" &&
                room.type !==
                  "CLASSROOM"
              ) {
                return false;
              }

              // Capacity
              if (
                studentCount != null &&
                room.capacity <
                  studentCount
              ) {
                return false;
              }

              return true;
            })
            .sort(
              (a, b) =>
                a.capacity -
                b.capacity
            );

        // ------------------------------------------
        // TRY ROOMS
        // ------------------------------------------

        for (
          const room of
            suitableRooms
        ) {
          if (placed) break;

          const roomId =
            String(room._id);

          const roomBusy =
            occupiedSlots.some(
              (slot) =>
                roomSchedule.has(
                  getBusyKey(
                    roomId,
                    slot
                  )
                )
            );

          if (roomBusy) {
            continue;
          }

          if (
            !isAvailable(
              roomAvailability,
              room._id,
              occupiedSlots
            )
          ) {
            continue;
          }

          // ----------------------------------------
          // DIVISION CONFLICT
          // ----------------------------------------

          const divisionBusy =
            occupiedSlots.some(
              (slot) =>
                divisionSchedule.has(
                  getDivisionKey(slot)
                )
            );

          if (divisionBusy) {
            continue;
          }

          // ----------------------------------------
          // CREATE ENTRY
          // ----------------------------------------

          entries.push({
            subject:
              subject._id,

            faculty:
              facultyMember._id,

            room:
              room._id,

            timeSlot:
              startSlot._id,

            durationSlots,
          });

          // ----------------------------------------
          // MARK RESOURCES BUSY
          // ----------------------------------------

          for (
            const slot of
              occupiedSlots
          ) {
            facultySchedule.add(
              getBusyKey(
                facultyId,
                slot
              )
            );

            roomSchedule.add(
              getBusyKey(
                roomId,
                slot
              )
            );

            divisionSchedule.add(
              getDivisionKey(slot)
            );
          }

          // ----------------------------------------
          // UPDATE SUBJECT DAY COUNT
          // ----------------------------------------

          const dayKey =
            `${subjectId}_${startSlot.day}`;

          subjectDayCount.set(
            dayKey,
            (
              subjectDayCount.get(
                dayKey
              ) || 0
            ) + 1
          );

          // ----------------------------------------
          // UPDATE FACULTY LOAD
          // ----------------------------------------

          facultyLoad.set(
            facultyId,
            (
              facultyLoad.get(
                facultyId
              ) || 0
            ) + durationSlots
          );

          placed = true;
          break;
        }
      }
    }

    // ------------------------------------------------
    // COULD NOT PLACE SESSION
    // ------------------------------------------------

    if (!placed) {
      throw new Error(
        `Unable to schedule "${subject.name}". Check weekly hours, faculty assignment, faculty availability, room availability, room capacity, and consecutive slots for practicals.`
      );
    }
  }

  return entries;
};

module.exports = {
  generateTimetable,
};