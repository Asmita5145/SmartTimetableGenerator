const TimeSlot = require("../models/TimeSlot");
const Room = require("../models/Room");
const Availability = require("../models/Availability");
const Subject = require("../models/Subject");

const idOf = (value) => {
  if (!value) return null;
  return String(value._id || value);
};

const doSlotsOverlap = (slot1, duration1, slot2, duration2) => {
  if (!slot1 || !slot2 || slot1.day !== slot2.day) {
    return false;
  }

  const start1 = slot1.slotNumber;
  const end1 = start1 + duration1 - 1;
  const start2 = slot2.slotNumber;
  const end2 = start2 + duration2 - 1;

  return start1 <= end2 && start2 <= end1;
};

const validateTimetable = async (input, suppliedStudentCount) => {
  // Support both validateTimetable(entries, studentCount)
  // and validateTimetable(timetable).
  const isTimetableDocument = !Array.isArray(input) && input != null;

  const entries = Array.isArray(input)
    ? input
    : input?.entries || [];

  const studentCount =
    suppliedStudentCount ??
    input?.division?.studentCount;

  const conflicts = [];

  if (!entries.length) {
    return {
      isValid: false,
      conflicts: [
        {
          type: "EMPTY_TIMETABLE",
          message: "The timetable has no scheduled entries."
        }
      ]
    };
  }

  // 1. Load starting slots and all slots on their days.
  const startSlotIds = [
    ...new Set(entries.map((entry) => idOf(entry.timeSlot)).filter(Boolean))
  ];

  const startSlots = await TimeSlot.find({
    _id: { $in: startSlotIds }
  }).lean();

  const startSlotMap = new Map(
    startSlots.map((slot) => [String(slot._id), slot])
  );

  const days = [...new Set(startSlots.map((slot) => slot.day))];

  const allSlots = await TimeSlot.find({
    day: { $in: days }
  }).lean();

  const slotsByDayAndNumber = new Map();

  for (const slot of allSlots) {
    slotsByDayAndNumber.set(
      `${slot.day}_${slot.slotNumber}`,
      slot
    );
  }

  // 2. Load rooms and subjects.
  const roomIds = [
    ...new Set(entries.map((entry) => idOf(entry.room)).filter(Boolean))
  ];

  const subjectIds = [
    ...new Set(entries.map((entry) => idOf(entry.subject)).filter(Boolean))
  ];

  const [rooms, subjects] = await Promise.all([
    Room.find({ _id: { $in: roomIds } }).lean(),
    Subject.find({ _id: { $in: subjectIds } }).lean()
  ]);

  const roomMap = new Map(
    rooms.map((room) => [String(room._id), room])
  );

  const subjectMap = new Map(
    subjects.map((subject) => [String(subject._id), subject])
  );

  // 3. Load availability for all referenced resources.
  const facultyIds = [
    ...new Set(entries.map((entry) => idOf(entry.faculty)).filter(Boolean))
  ];

  const availabilityRecords = await Availability.find({
    $or: [
      {
        resourceType: "FACULTY",
        resourceId: { $in: facultyIds }
      },
      {
        resourceType: "ROOM",
        resourceId: { $in: roomIds }
      }
    ],
    day: { $in: days }
  }).lean();

  const isResourceAvailableOnSlot = (resourceType, resourceId, slot) => {
    const matchingRecords = availabilityRecords.filter(
      (record) =>
        record.resourceType === resourceType &&
        String(record.resourceId) === String(resourceId) &&
        record.day === slot.day
    );

    if (!matchingRecords.length) {
      return true; // No availability record for that day = unrestricted.
    }

    const allowedSlotIds = new Set(
      matchingRecords.flatMap((record) =>
        (record.availableSlots || []).map(String)
      )
    );

    return allowedSlotIds.has(String(slot._id));
  };

  // 4. Validate each entry individually.
  const expandedEntries = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const label = `Entry ${index + 1}`;

    const subjectId = idOf(entry.subject);
    const roomId = idOf(entry.room);
    const facultyId = idOf(entry.faculty);
    const startSlotId = idOf(entry.timeSlot);

    const startSlot = startSlotMap.get(startSlotId);
    const room = roomMap.get(roomId);
    const subject = subjectMap.get(subjectId);

    const duration = Number(entry.durationSlots || 1);

    if (!startSlot) {
      conflicts.push({
        type: "INVALID_TIME_SLOT",
        message: `${label}: starting time slot was not found.`
      });
      continue;
    }

    if (startSlot.isBreak) {
      conflicts.push({
        type: "BREAK_SLOT",
        message: `${label}: a class cannot start during a break.`
      });
    }

    if (!room) {
      conflicts.push({
        type: "INVALID_ROOM",
        message: `${label}: room was not found.`
      });
    }

    if (!subject) {
      conflicts.push({
        type: "INVALID_SUBJECT",
        message: `${label}: subject was not found.`
      });
    }

    if (!facultyId) {
      conflicts.push({
        type: "INVALID_FACULTY",
        message: `${label}: faculty is missing.`
      });
    }

    if (![1, 2].includes(duration)) {
      conflicts.push({
        type: "INVALID_DURATION",
        message: `${label}: duration must be one or two slots.`
      });
      continue;
    }

    if (!subject || !room) {
      continue;
    }

    // Practical checks
    if (subject.type === "PRACTICAL") {
      if (duration !== 2) {
        conflicts.push({
          type: "SUBJECT_DURATION",
          message: `Practical "${subject.name}" must occupy two slots.`
        });
      }
      if (room.type !== "LAB") {
        conflicts.push({
          type: "PRACTICAL_ROOM",
          message: `Practical "${subject.name}" must use a laboratory.`
        });
      }
      // Practical batch capacity (laboratory capacity vs batch size ~30)
      const batchCapacityNeeded = studentCount ? Math.ceil(studentCount / 2) : 30;
      if (room.capacity < Math.min(30, batchCapacityNeeded)) {
        conflicts.push({
          type: "ROOM_CAPACITY",
          message: `Lab ${room.roomNumber} has capacity ${room.capacity}, but batch requires ${batchCapacityNeeded} seats.`
        });
      }
    } else if (subject.type === "PROJECT") {
      // Project hours can occupy 1 or 2 slots in Project Lab or Classroom
      if (studentCount != null && room.capacity < Math.min(35, studentCount)) {
        conflicts.push({
          type: "ROOM_CAPACITY",
          message: `Room ${room.roomNumber} has capacity ${room.capacity}, but Project requires ${Math.min(35, studentCount)} seats.`
        });
      }
    } else {
      // Lecture or Tutorial: must occupy 1 slot, in a classroom
      if (duration !== 1) {
        conflicts.push({
          type: "SUBJECT_DURATION",
          message: `${subject.type} "${subject.name}" must occupy one slot.`
        });
      }
      if (room.type !== "CLASSROOM") {
        conflicts.push({
          type: "LECTURE_ROOM",
          message: `${subject.type} "${subject.name}" must use a classroom.`
        });
      }
      if (studentCount != null && room.capacity < studentCount) {
        conflicts.push({
          type: "ROOM_CAPACITY",
          message: `Room ${room.roomNumber} has capacity ${room.capacity}, but the division has ${studentCount} students.`
        });
      }
    }

    const occupiedSlots = [];

    for (let offset = 0; offset < duration; offset += 1) {
      const slot = slotsByDayAndNumber.get(
        `${startSlot.day}_${startSlot.slotNumber + offset}`
      );

      if (!slot) {
        conflicts.push({
          type: "INVALID_DURATION",
          message: `${label}: required consecutive slot ${startSlot.slotNumber + offset} does not exist.`
        });
        break;
      }

      if (slot.isBreak) {
        conflicts.push({
          type: "BREAK_OVERLAP",
          message: `${label} overlaps a break slot (${slot.startTime} - ${slot.endTime}).`
        });
        break;
      }

      if (!isResourceAvailableOnSlot("FACULTY", facultyId, slot)) {
        conflicts.push({
          type: "FACULTY_UNAVAILABLE",
          message: `Faculty is not available on ${slot.day} between ${slot.startTime} and ${slot.endTime}.`
        });
      }

      if (!isResourceAvailableOnSlot("ROOM", roomId, slot)) {
        conflicts.push({
          type: "ROOM_UNAVAILABLE",
          message: `Room is not available on ${slot.day} between ${slot.startTime} and ${slot.endTime}.`
        });
      }

      occupiedSlots.push(slot);
    }

    expandedEntries.push({
      entry,
      index,
      label,
      facultyId,
      roomId,
      subjectId,
      startSlot,
      duration,
      occupiedSlots
    });
  }

  // 5. Cross-entry conflict checks (within the timetable).
  for (let i = 0; i < expandedEntries.length; i += 1) {
    for (let j = i + 1; j < expandedEntries.length; j += 1) {
      const a = expandedEntries[i];
      const b = expandedEntries[j];

      if (!doSlotsOverlap(a.startSlot, a.duration, b.startSlot, b.duration)) {
        continue;
      }

      // Check division clash (same division cannot have two subjects at the same time)
      conflicts.push({
        type: "DIVISION_CONFLICT",
        message: `${a.label} and ${b.label} are scheduled at the same time for this division.`
      });

      if (a.facultyId === b.facultyId) {
        conflicts.push({
          type: "FACULTY_CONFLICT",
          message: `Faculty is double-booked on ${a.startSlot.day} during slot ${a.startSlot.slotNumber}.`
        });
      }

      if (a.roomId === b.roomId) {
        conflicts.push({
          type: "ROOM_CONFLICT",
          message: `Room is double-booked on ${a.startSlot.day} during slot ${a.startSlot.slotNumber}.`
        });
      }
    }
  }

  return {
    isValid: conflicts.length === 0,
    conflicts
  };
};

module.exports = {
  validateTimetable,
  doSlotsOverlap
};
