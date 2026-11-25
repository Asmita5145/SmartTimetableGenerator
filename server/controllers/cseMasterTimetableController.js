const SemesterTimetable = require("../models/SemesterTimetable");
const Faculty = require("../models/Faculty");
const Room = require("../models/Room");
const Availability = require("../models/Availability");

const {
  validateMasterTimetable,
} = require("../services/cseMasterTimetableValidator");

// ---------------------------------------------------------
// BUILD AVAILABILITY MAP
// ---------------------------------------------------------

async function buildAvailabilityMaps() {
  const availabilities = await Availability.find({}).lean();

  const facultyAvailabilityMap = new Map();
  const roomAvailabilityMap = new Map();

  for (const record of availabilities) {
    const resourceId = String(record.resourceId);

    const targetMap =
      record.resourceType === "FACULTY"
        ? facultyAvailabilityMap
        : roomAvailabilityMap;

    if (!targetMap.has(resourceId)) {
      targetMap.set(resourceId, new Map());
    }

    const dayMap = targetMap.get(resourceId);

    const slots = new Set(
      (record.availableSlots || []).map((slot) =>
        String(
          typeof slot === "object"
            ? slot.slotId
            : slot
        )
      )
    );

    dayMap.set(record.day, slots);
  }

  return {
    facultyAvailabilityMap,
    roomAvailabilityMap,
  };
}

// ---------------------------------------------------------
// VALIDATE MASTER TIMETABLE
// ---------------------------------------------------------

const validateMasterTimetableController = async (
  req,
  res
) => {
  try {
    const {
      semesterNumbers = [3, 5, 7],
      academicYear = "2026-27",
    } = req.body;

    if (
      !Array.isArray(semesterNumbers) ||
      semesterNumbers.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "semesterNumbers must be a non-empty array.",
      });
    }

    // -----------------------------------------------------
    // FIND TIMETABLES
    // -----------------------------------------------------

const timetables =
  await SemesterTimetable.find({
    academicYear,
  })
    .populate("semester", "name number")
    .populate("department", "name code")
    .sort({ generatedAt: -1, createdAt: -1 })
    .lean();

// Keep ONLY the latest timetable for each requested semester
const selectedTimetables = [];

for (const semesterNumber of semesterNumbers) {
  const latest = timetables.find(
    (timetable) =>
      timetable.semester?.number === semesterNumber
  );

  if (latest) {
    selectedTimetables.push(latest);
  }
}

// Check for missing semesters
const missingSemesters = semesterNumbers.filter(
  (number) =>
    !selectedTimetables.some(
      (timetable) =>
        timetable.semester?.number === number
    )
);

if (missingSemesters.length > 0) {
  return res.status(404).json({
    success: false,
    message:
      "Latest timetable not found for one or more semesters.",
    missingSemesters,
  });
}

    // -----------------------------------------------------
    // AVAILABILITY
    // -----------------------------------------------------

    const {
      facultyAvailabilityMap,
      roomAvailabilityMap,
    } = await buildAvailabilityMaps();

    // -----------------------------------------------------
    // VALIDATE
    // -----------------------------------------------------

    const result =
      validateMasterTimetable({
        semesterTimetables:
          selectedTimetables,

        facultyAvailabilityMap,

        roomAvailabilityMap,
      });

    // -----------------------------------------------------
    // RESPONSE
    // -----------------------------------------------------

    return res.status(200).json({
      success: true,

      message: result.isValid
        ? "No cross-semester conflicts found."
        : "Cross-semester conflicts detected.",

      academicYear,

      semestersChecked:
        semesterNumbers,

      result,
    });
  } catch (error) {
    console.error(
      "Master timetable validation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to validate master timetable.",
      error: error.message,
    });
  }
};

module.exports = {
  validateMasterTimetableController,
};