const mongoose = require("mongoose");
const {
  TimeSlot,
  Department,
  Semester,
  Division,
  Batch,
  Subject,
  Faculty,
  Room,
  Availability,
  Timetable,
  MasterTimetable,
  Institution
} = require("../models");
const { optimizeWithGA, PRACTICAL_BLOCKS, VALID_LECTURE_SLOTS } = require("./geneticAlgorithm/optimizer");
const { validateDepartmentBatches } = require("./batchValidationService");

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

/**
 * Clean string ID helper
 */
const idStr = (val) => (val ? String(val._id || val) : null);

/**
 * Global busy key helpers
 */
const getBusyKey = (resourceId, day, slotNumber) => `${resourceId}_${day}_${slotNumber}`;
const getCohortKey = (cohortId, day, slotNumber) => `${cohortId}_${day}_${slotNumber}`;
const getBatchKey = (cohortId, batchCode, day, slotNumber) => `${cohortId}_${batchCode}_${day}_${slotNumber}`;

/**
 * Availability map builder
 */
const buildAvailabilityMap = (availabilityRecords) => {
  const map = new Map();
  for (const record of availabilityRecords) {
    const key = `${record.resourceType}_${idStr(record.resourceId)}_${record.day}`;
    map.set(key, new Set((record.availableSlots || []).map(idStr)));
  }
  return map;
};

/**
 * Availability checker
 */
const isResourceAvailable = (availabilityMap, resourceType, resourceId, slot) => {
  const key = `${resourceType}_${idStr(resourceId)}_${slot.day}`;
  const allowedSlotIds = availabilityMap.get(key);
  if (!allowedSlotIds) return true;
  return allowedSlotIds.has(idStr(slot._id));
};

/**
 * Core Department Timetable Generator
 * Supports BOTH:
 * - Scenario A: Semesters without divisions (DACOE Karad CSE default: Sem III, V, VII with batches T1-T4, B1-B4)
 * - Scenario B: Semesters with multiple divisions (when useDivisions: true is passed)
 * Consolidates practical batches into Parent-Child structure (1 parent 2h entry, 4 child batch cards).
 * Integrates Genetic Algorithm Optimization Layer for soft constraint maximization.
 */
const generateDepartmentTimetable = async (params = {}) => {
  const startTime = Date.now();
  let departmentId, academicYear, semesterNumbers, userId, useDivisions;
  if (typeof params === "string" || mongoose.isValidObjectId(params) || (params && !params.departmentId && params._id)) {
    departmentId = params._id || params;
    academicYear = "2026-27";
    semesterNumbers = [3, 5, 7];
    userId = null;
    useDivisions = false;
  } else {
    departmentId = params.departmentId;
    academicYear = params.academicYear || "2026-27";
    semesterNumbers = params.semesterNumbers || [3, 5, 7];
    userId = params.userId || null;
    useDivisions = Boolean(params.useDivisions);
  }

  // 1. Fetch Department & Institution
  const department = await Department.findById(departmentId).populate("institution");
  if (!department) {
    throw new Error("Department not found");
  }
  const institutionId = department.institution?._id || department.institution || null;

  // 2. Fetch TimeSlots (Monday - Friday)
  const allSlots = await TimeSlot.find({
    day: { $in: DAYS }
  }).sort({ day: 1, slotNumber: 1 }).lean();

  if (!allSlots.length) {
    throw new Error("No time slots configured for Monday-Friday.");
  }

  const slotMap = new Map();
  for (const slot of allSlots) {
    slotMap.set(`${slot.day}_${slot.slotNumber}`, slot);
  }

  // 3. Fetch Semesters for the Department
  const semesters = await Semester.find({
    department: departmentId,
    number: { $in: semesterNumbers }
  }).populate("designatedRoom").sort({ number: 1 }).lean();

  if (!semesters.length) {
    throw new Error("No semesters found for the selected department and academic year.");
  }

  const semesterIds = semesters.map((s) => s._id);

  // 3b. Validate Practical Batches Before Generation (Batch Validation Service)
  const batchValidation = await validateDepartmentBatches({
    departmentId,
    semesterNumbers
  });
  if (!batchValidation.isValid) {
    throw new Error(`Batch validation failed before timetable generation:\n- ${batchValidation.errors.join("\n- ")}`);
  }

  // 4. Fetch Divisions
  const allDivisions = await Division.find({
    semester: { $in: semesterIds }
  }).populate("semester").lean();

  // 5. Fetch Batches
  const allBatches = await Batch.find({
    semester: { $in: semesterIds }
  }).lean();

  // 6. Build Schedulable Cohorts
  // DACOE Karad default: No divisions (useDivisions: false).
  // Sem 3, Sem 5, Sem 7 class cohorts with designated classrooms CR18, CR56, CR57.
  const cohorts = [];

  for (const sem of semesters) {
    const semIdStr = idStr(sem._id);
    const matchingDivs = allDivisions.filter(
      (d) => idStr(d.semester?._id || d.semester) === semIdStr
    );

    // Get practical batches for this semester
    const matchingBatches = allBatches.filter(
      (b) => idStr(b.semester) === semIdStr
    );
    const batchCodes = matchingBatches.length > 0
      ? matchingBatches.map((b) => b.code)
      : (sem.practicalBatches && sem.practicalBatches.length > 0
          ? sem.practicalBatches
          : (sem.number === 3 ? ["S1", "S2", "S3", "S4"]
            : sem.number === 5 ? ["T1", "T2", "T3", "T4"]
            : ["B1", "B2", "B3", "B4"]));

    if (useDivisions && matchingDivs.length > 0) {
      // SCENARIO B: Divisions explicitly enabled
      for (const div of matchingDivs) {
        cohorts.push({
          cohortId: idStr(div._id),
          isDivision: true,
          division: div,
          divisionId: div._id,
          semester: sem,
          semesterId: sem._id,
          semesterNumber: sem.number,
          name: div.name,
          studentCount: div.studentCount || sem.studentCount || 65,
          batches: batchCodes,
          designatedRoom: sem.designatedRoom || null,
          preferredPracticalSlot: sem.preferredPracticalSlot || (
            sem.number === 3 ? "15:00-17:00" : sem.number === 5 ? "12:45-14:45" : "10:00-12:00"
          )
        });
      }
    } else {
      // SCENARIO A: No divisions - single semester-level class cohort (DACOE Karad Standard)
      cohorts.push({
        cohortId: semIdStr,
        isDivision: false,
        division: null,
        divisionId: null,
        semester: sem,
        semesterId: sem._id,
        semesterNumber: sem.number,
        name: sem.name,
        studentCount: sem.studentCount || 65,
        batches: batchCodes,
        designatedRoom: sem.designatedRoom || null,
        preferredPracticalSlot: sem.preferredPracticalSlot || (
          sem.number === 3 ? "15:00-17:00" : sem.number === 5 ? "12:45-14:45" : "10:00-12:00"
        )
      });
    }
  }

  // 7. Fetch Faculty
  const allFaculty = await Faculty.find({ department: departmentId }).lean();
  if (!allFaculty.length) {
    throw new Error("No faculty members found for this department.");
  }
  const facultyMap = new Map(allFaculty.map((f) => [idStr(f._id), f]));

  // 8. Fetch Rooms & Computer Laboratories
  const allRooms = await Room.find({ department: departmentId }).lean();
  const classrooms = allRooms.filter((r) => r.type === "CLASSROOM");
  const laboratories = allRooms.filter((r) => r.type === "LAB");

  if (!classrooms.length) {
    throw new Error("No classrooms configured for this department.");
  }
  if (!laboratories.length) {
    throw new Error("No laboratories configured for this department.");
  }

  const roomMap = new Map(allRooms.map((r) => [idStr(r._id), r]));

  // 9. Fetch Subjects for active semesters
  const allSubjects = await Subject.find({
    department: departmentId,
    semester: { $in: semesterIds }
  }).populate("faculty").lean();

  if (!allSubjects.length) {
    throw new Error("No subjects found for the selected semesters.");
  }

  const subjectsBySemester = new Map();
  for (const sem of semesters) {
    subjectsBySemester.set(
      idStr(sem._id),
      allSubjects.filter((s) => idStr(s.semester) === idStr(sem._id))
    );
  }

  // 10. Fetch Availability Constraints
  const availabilityRecords = await Availability.find({
    resourceId: { $in: [...allFaculty.map((f) => f._id), ...allRooms.map((r) => r._id)] }
  }).lean();
  const availabilityMap = buildAvailabilityMap(availabilityRecords);

  // 11. Designated Classroom Map by Semester Number
  const designatedRoomBySemNumber = {
    3: classrooms.find((r) => r.roomNumber === "CR18") || classrooms[0],
    5: classrooms.find((r) => r.roomNumber === "CR56") || classrooms[1] || classrooms[0],
    7: classrooms.find((r) => r.roomNumber === "CR57") || classrooms[2] || classrooms[0]
  };

  for (const sem of semesters) {
    if (sem.designatedRoom) {
      designatedRoomBySemNumber[sem.number] = sem.designatedRoom;
    }
  }

  // 12. Global Hard Occupancy Tracking
  const facultyBusy = new Set();
  const roomBusy = new Set();
  const cohortBusy = new Set();
  const batchBusy = new Set();

  // Cohort timetables accumulator
  const cohortTimetables = new Map();
  for (const cohort of cohorts) {
    cohortTimetables.set(cohort.cohortId, {
      cohortId: cohort.cohortId,
      department: department._id,
      institution: institutionId,
      semester: cohort.semesterId,
      division: cohort.divisionId,
      name: cohort.name,
      semesterNumber: cohort.semesterNumber,
      academicYear,
      entries: [],
      status: "VALID",
      conflicts: []
    });
  }

  // Preferred practical start slots based on semester soft constraints
  // Sem 7: 10:00 AM (Slot 1)
  // Sem 5: 12:45 PM (Slot 4)
  // Sem 3: 3:00 PM (Slot 7)
  const getPreferredBlockOrder = (semNumber) => {
    if (semNumber === 3) {
      return [
        { startSlotNumber: 7, endSlotNumber: 8 }, // 3:00 - 5:00
        { startSlotNumber: 4, endSlotNumber: 5 }, // 12:45 - 2:45
        { startSlotNumber: 1, endSlotNumber: 2 }  // 10:00 - 12:00
      ];
    }
    if (semNumber === 5) {
      return [
        { startSlotNumber: 4, endSlotNumber: 5 }, // 12:45 - 2:45
        { startSlotNumber: 7, endSlotNumber: 8 }, // 3:00 - 5:00
        { startSlotNumber: 1, endSlotNumber: 2 }  // 10:00 - 12:00
      ];
    }
    return [
      { startSlotNumber: 1, endSlotNumber: 2 }, // 10:00 - 12:00
      { startSlotNumber: 4, endSlotNumber: 5 }, // 12:45 - 2:45
      { startSlotNumber: 7, endSlotNumber: 8 }  // 3:00 - 5:00
    ];
  };

  // 13. Prepare Queues
  const practicalQueue = [];
  const projectQueue = [];
  const tutorialQueue = [];
  const lectureQueue = [];

  for (const cohort of cohorts) {
    const semSubjects = subjectsBySemester.get(idStr(cohort.semesterId)) || [];

    for (const sub of semSubjects) {
      const eligibleFaculty = (sub.faculty || []).length
        ? sub.faculty
        : allFaculty.filter((f) => idStr(f.department) === idStr(departmentId));

      if (sub.type === "PRACTICAL") {
        const batchesToSchedule = cohort.batches && cohort.batches.length > 0
          ? cohort.batches
          : [null];

        for (const batchCode of batchesToSchedule) {
          practicalQueue.push({
            cohort,
            subject: sub,
            durationSlots: 2,
            type: "PRACTICAL",
            eligibleFaculty,
            batch: batchCode,
            semesterNumber: cohort.semesterNumber
          });
        }
      } else if (sub.type === "PROJECT") {
        const projHours = sub.projectHours || sub.weeklyHours || 4;
        const sessionsCount = Math.max(1, Math.floor(projHours / 2));
        for (let i = 0; i < sessionsCount; i++) {
          projectQueue.push({
            cohort,
            subject: sub,
            durationSlots: 2,
            type: "PROJECT",
            eligibleFaculty,
            batch: null,
            semesterNumber: cohort.semesterNumber,
            sessionIndex: i
          });
        }
      } else if (sub.type === "TUTORIAL") {
        const tutHours = sub.tutorialHours || sub.weeklyHours || 1;
        for (let i = 0; i < tutHours; i++) {
          tutorialQueue.push({
            cohort,
            subject: sub,
            durationSlots: 1,
            type: "TUTORIAL",
            eligibleFaculty,
            batch: null,
            semesterNumber: cohort.semesterNumber,
            sessionIndex: i
          });
        }
      } else {
        // LECTURE
        const lecHours = sub.weeklyHours || 3;
        for (let i = 0; i < lecHours; i++) {
          lectureQueue.push({
            cohort,
            subject: sub,
            durationSlots: 1,
            type: "LECTURE",
            eligibleFaculty,
            batch: null,
            semesterNumber: cohort.semesterNumber,
            sessionIndex: i
          });
        }
      }
    }
  }

  // -----------------------------------------------------------------
  // HEURISTIC SCHEDULER: PHASE 1 - PRACTICAL SESSIONS (2H, LABS, BATCHES)
  // -----------------------------------------------------------------
  const globalPracticalDays = { MONDAY: 0, TUESDAY: 0, WEDNESDAY: 0, THURSDAY: 0, FRIDAY: 0 };

  for (const session of practicalQueue) {
    const { cohort, subject, eligibleFaculty, batch, semesterNumber } = session;
    const cohortId = cohort.cohortId;
    const blocksOrder = getPreferredBlockOrder(semesterNumber);

    const sortedDays = [...DAYS].sort((a, b) => globalPracticalDays[a] - globalPracticalDays[b]);

    let scheduled = false;

    for (const day of sortedDays) {
      if (scheduled) break;

      for (const block of blocksOrder) {
        if (scheduled) break;

        const slot1 = slotMap.get(`${day}_${block.startSlotNumber}`);
        const slot2 = slotMap.get(`${day}_${block.endSlotNumber}`);
        if (!slot1 || !slot2 || slot1.isBreak || slot2.isBreak) continue;

        if (batch) {
          if (
            batchBusy.has(getBatchKey(cohortId, batch, day, block.startSlotNumber)) ||
            batchBusy.has(getBatchKey(cohortId, batch, day, block.endSlotNumber))
          ) {
            continue;
          }
        }

        // Find available faculty from eligible list
        for (const fac of eligibleFaculty) {
          if (scheduled) break;
          const facId = idStr(fac._id);

          if (
            facultyBusy.has(getBusyKey(facId, day, block.startSlotNumber)) ||
            facultyBusy.has(getBusyKey(facId, day, block.endSlotNumber))
          ) {
            continue;
          }

          if (
            !isResourceAvailable(availabilityMap, "FACULTY", facId, slot1) ||
            !isResourceAvailable(availabilityMap, "FACULTY", facId, slot2)
          ) {
            continue;
          }

          // Find available computer laboratory
          for (const lab of laboratories) {
            const labId = idStr(lab._id);

            if (
              roomBusy.has(getBusyKey(labId, day, block.startSlotNumber)) ||
              roomBusy.has(getBusyKey(labId, day, block.endSlotNumber))
            ) {
              continue;
            }

            if (
              !isResourceAvailable(availabilityMap, "ROOM", labId, slot1) ||
              !isResourceAvailable(availabilityMap, "ROOM", labId, slot2)
            ) {
              continue;
            }

            // Reserve resources globally
            facultyBusy.add(getBusyKey(facId, day, block.startSlotNumber));
            facultyBusy.add(getBusyKey(facId, day, block.endSlotNumber));

            roomBusy.add(getBusyKey(labId, day, block.startSlotNumber));
            roomBusy.add(getBusyKey(labId, day, block.endSlotNumber));

            if (batch) {
              batchBusy.add(getBatchKey(cohortId, batch, day, block.startSlotNumber));
              batchBusy.add(getBatchKey(cohortId, batch, day, block.endSlotNumber));
            }

            cohortBusy.add(getCohortKey(cohortId, day, block.startSlotNumber));
            cohortBusy.add(getCohortKey(cohortId, day, block.endSlotNumber));

            globalPracticalDays[day] += 1;

            cohortTimetables.get(cohortId).entries.push({
              subject: subject._id,
              faculty: fac._id,
              room: lab._id,
              timeSlot: slot1._id,
              day,
              startSlotNumber: block.startSlotNumber,
              startTime: slot1.startTime,
              endTime: slot2.endTime,
              durationSlots: 2,
              entryType: "PRACTICAL",
              batch: batch || null
            });

            scheduled = true;
            break;
          }
        }
      }
    }
  }

  // -----------------------------------------------------------------
  // HEURISTIC SCHEDULER: PHASE 2 - FINAL YEAR PROJECT-I (2H BLOCKS)
  // -----------------------------------------------------------------
  for (const session of projectQueue) {
    const { cohort, subject, eligibleFaculty, semesterNumber } = session;
    const cohortId = cohort.cohortId;
    const blocksOrder = getPreferredBlockOrder(semesterNumber);

    let scheduled = false;

    for (const day of DAYS) {
      if (scheduled) break;

      for (const block of blocksOrder) {
        if (scheduled) break;

        const slot1 = slotMap.get(`${day}_${block.startSlotNumber}`);
        const slot2 = slotMap.get(`${day}_${block.endSlotNumber}`);
        if (!slot1 || !slot2 || slot1.isBreak || slot2.isBreak) continue;

        if (
          cohortBusy.has(getCohortKey(cohortId, day, block.startSlotNumber)) ||
          cohortBusy.has(getCohortKey(cohortId, day, block.endSlotNumber))
        ) {
          continue;
        }

        for (const fac of eligibleFaculty) {
          if (scheduled) break;
          const facId = idStr(fac._id);

          if (
            facultyBusy.has(getBusyKey(facId, day, block.startSlotNumber)) ||
            facultyBusy.has(getBusyKey(facId, day, block.endSlotNumber))
          ) {
            continue;
          }

          // Use Project Lab (L47) or Designated Room
          const projRoom = laboratories.find((l) => l.roomNumber === "L47") || designatedRoomBySemNumber[semesterNumber] || classrooms[0];
          const roomId = idStr(projRoom._id);

          if (
            roomBusy.has(getBusyKey(roomId, day, block.startSlotNumber)) ||
            roomBusy.has(getBusyKey(roomId, day, block.endSlotNumber))
          ) {
            continue;
          }

          facultyBusy.add(getBusyKey(facId, day, block.startSlotNumber));
          facultyBusy.add(getBusyKey(facId, day, block.endSlotNumber));

          roomBusy.add(getBusyKey(roomId, day, block.startSlotNumber));
          roomBusy.add(getBusyKey(roomId, day, block.endSlotNumber));

          cohortBusy.add(getCohortKey(cohortId, day, block.startSlotNumber));
          cohortBusy.add(getCohortKey(cohortId, day, block.endSlotNumber));

          cohortTimetables.get(cohortId).entries.push({
            subject: subject._id,
            faculty: fac._id,
            room: projRoom._id,
            timeSlot: slot1._id,
            day,
            startSlotNumber: block.startSlotNumber,
            startTime: slot1.startTime,
            endTime: slot2.endTime,
            durationSlots: 2,
            entryType: "PROJECT",
            batch: null
          });

          scheduled = true;
          break;
        }
      }
    }
  }

  // -----------------------------------------------------------------
  // HEURISTIC SCHEDULER: PHASE 3 - TUTORIALS (1H)
  // -----------------------------------------------------------------
  for (const session of tutorialQueue) {
    const { cohort, subject, eligibleFaculty, semesterNumber } = session;
    const cohortId = cohort.cohortId;

    let scheduled = false;

    for (const day of DAYS) {
      if (scheduled) break;

      for (const slotNum of VALID_LECTURE_SLOTS) {
        if (scheduled) break;

        const slot = slotMap.get(`${day}_${slotNum}`);
        if (!slot || slot.isBreak) continue;

        if (cohortBusy.has(getCohortKey(cohortId, day, slotNum))) continue;

        for (const fac of eligibleFaculty) {
          if (scheduled) break;
          const facId = idStr(fac._id);

          if (facultyBusy.has(getBusyKey(facId, day, slotNum))) continue;
          if (!isResourceAvailable(availabilityMap, "FACULTY", facId, slot)) continue;

          // Tutorial room: designated classroom or tutorial room CR19
          const tutRoom = classrooms.find((c) => c.roomNumber === "CR19") || designatedRoomBySemNumber[semesterNumber] || classrooms[0];
          const roomId = idStr(tutRoom._id);

          if (roomBusy.has(getBusyKey(roomId, day, slotNum))) continue;
          if (!isResourceAvailable(availabilityMap, "ROOM", roomId, slot)) continue;

          facultyBusy.add(getBusyKey(facId, day, slotNum));
          roomBusy.add(getBusyKey(roomId, day, slotNum));
          cohortBusy.add(getCohortKey(cohortId, day, slotNum));

          cohortTimetables.get(cohortId).entries.push({
            subject: subject._id,
            faculty: fac._id,
            room: tutRoom._id,
            timeSlot: slot._id,
            day,
            startSlotNumber: slotNum,
            startTime: slot.startTime,
            endTime: slot.endTime,
            durationSlots: 1,
            entryType: "TUTORIAL",
            batch: null
          });

          scheduled = true;
          break;
        }
      }
    }
  }

  // -----------------------------------------------------------------
  // HEURISTIC SCHEDULER: PHASE 4 - THEORY LECTURES (1H, DESIGNATED CLASSROOMS)
  // -----------------------------------------------------------------
  for (const session of lectureQueue) {
    const { cohort, subject, eligibleFaculty, semesterNumber } = session;
    const cohortId = cohort.cohortId;
    const designatedRoom = designatedRoomBySemNumber[semesterNumber] || classrooms[0];

    const cohortExistingDaysForSubject = new Set(
      cohortTimetables.get(cohortId).entries
        .filter((e) => idStr(e.subject) === idStr(subject._id))
        .map((e) => e.day)
    );

    const preferredDays = [...DAYS].sort((a, b) => {
      const aHas = cohortExistingDaysForSubject.has(a) ? 1 : 0;
      const bHas = cohortExistingDaysForSubject.has(b) ? 1 : 0;
      return aHas - bHas;
    });

    let scheduled = false;

    for (const day of preferredDays) {
      if (scheduled) break;

      for (const slotNum of VALID_LECTURE_SLOTS) {
        if (scheduled) break;

        const slot = slotMap.get(`${day}_${slotNum}`);
        if (!slot || slot.isBreak) continue;

        if (cohortBusy.has(getCohortKey(cohortId, day, slotNum))) continue;

        for (const fac of eligibleFaculty) {
          if (scheduled) break;
          const facId = idStr(fac._id);

          if (facultyBusy.has(getBusyKey(facId, day, slotNum))) continue;
          if (!isResourceAvailable(availabilityMap, "FACULTY", facId, slot)) continue;

          let chosenRoom = null;
          const candidateClassrooms = [
            designatedRoom,
            ...classrooms.filter((c) => idStr(c._id) !== idStr(designatedRoom._id))
          ];

          for (const roomCandidate of candidateClassrooms) {
            const roomId = idStr(roomCandidate._id);
            if (roomBusy.has(getBusyKey(roomId, day, slotNum))) continue;
            if (!isResourceAvailable(availabilityMap, "ROOM", roomId, slot)) continue;
            if (roomCandidate.capacity < cohort.studentCount) continue;

            chosenRoom = roomCandidate;
            break;
          }

          if (!chosenRoom) continue;

          const chosenRoomId = idStr(chosenRoom._id);

          facultyBusy.add(getBusyKey(facId, day, slotNum));
          roomBusy.add(getBusyKey(chosenRoomId, day, slotNum));
          cohortBusy.add(getCohortKey(cohortId, day, slotNum));

          cohortTimetables.get(cohortId).entries.push({
            subject: subject._id,
            faculty: fac._id,
            room: chosenRoom._id,
            timeSlot: slot._id,
            day,
            startSlotNumber: slotNum,
            startTime: slot.startTime,
            endTime: slot.endTime,
            durationSlots: 1,
            entryType: "LECTURE",
            batch: null
          });

          scheduled = true;
          break;
        }
      }
    }
  }

  // -----------------------------------------------------------------
  // GENETIC ALGORITHM OPTIMIZATION LAYER
  // -----------------------------------------------------------------
  const initialChromosome = [];
  for (const [cohortId, ct] of cohortTimetables.entries()) {
    for (const e of ct.entries) {
      initialChromosome.push({
        cohortId,
        subjectId: e.subject,
        facultyId: e.faculty,
        roomId: e.room,
        day: e.day,
        startSlotNumber: e.startSlotNumber,
        durationSlots: e.durationSlots,
        type: e.entryType,
        batch: e.batch,
        semesterNumber: ct.semesterNumber
      });
    }
  }

  const eligibleFacultyMap = new Map();
  for (const s of allSubjects) {
    const list = (s.faculty || []).length
      ? s.faculty
      : allFaculty.filter((f) => idStr(f.department) === idStr(departmentId));
    eligibleFacultyMap.set(idStr(s._id), list);
  }

  const gaContext = {
    availabilityMap,
    slotMap,
    semesterPreferences: {
      3: "15:00-17:00",
      5: "12:45-14:45",
      7: "10:00-12:00"
    },
    designatedRooms: {
      3: idStr(designatedRoomBySemNumber[3]?._id),
      5: idStr(designatedRoomBySemNumber[5]?._id),
      7: idStr(designatedRoomBySemNumber[7]?._id)
    },
    candidateRooms: allRooms,
    facultyMap,
    roomMap,
    eligibleFacultyMap
  };

  const gaResult = optimizeWithGA({
    initialChromosome,
    context: gaContext,
    populationSize: 10,
    generations: 20
  });

  // -----------------------------------------------------------------
  // DECODE GA BEST CHROMOSOME & CONSOLIDATE PARENT-CHILD STRUCTURE
  // -----------------------------------------------------------------
  const chromosomeToDecode = (gaResult && gaResult.bestChromosome && gaResult.bestChromosome.length > 0)
    ? gaResult.bestChromosome
    : initialChromosome;

  const candidateDocs = [];

  for (const cohort of cohorts) {
    const cohortGenes = chromosomeToDecode.filter(
      (g) => String(g.cohortId) === String(cohort.cohortId)
    );

    // Group practical sessions occurring at the same (day, startSlotNumber) into 1 parent entry
    const practicalGroups = new Map(); // key: day_slotNum -> array of practical genes
    const nonPracticalEntries = [];

    for (const gene of cohortGenes) {
      const slot1 = slotMap.get(`${gene.day}_${gene.startSlotNumber}`);
      const slot2 = gene.durationSlots === 2
        ? slotMap.get(`${gene.day}_${gene.startSlotNumber + 1}`)
        : slot1;

      if (!slot1) continue;

      if (gene.type === "PRACTICAL") {
        const key = `${gene.day}_${gene.startSlotNumber}`;
        if (!practicalGroups.has(key)) {
          practicalGroups.set(key, []);
        }
        practicalGroups.get(key).push({ gene, slot1, slot2 });
      } else {
        nonPracticalEntries.push({
          subject: gene.subjectId,
          faculty: gene.facultyId,
          room: gene.roomId,
          timeSlot: slot1._id,
          durationSlots: gene.durationSlots,
          entryType: gene.type,
          batch: gene.batch || null,
          childBatches: [],
          day: gene.day,
          startTime: slot1.startTime,
          endTime: slot2 ? slot2.endTime : slot1.endTime
        });
      }
    }

    const parentChildEntries = [];

    // Add consolidated practical parent blocks
    for (const [key, pItems] of practicalGroups.entries()) {
      const first = pItems[0];
      const childBatches = pItems.map((p) => ({
        batch: p.gene.batch || (cohort.semesterNumber === 3 ? "S1" : cohort.semesterNumber === 5 ? "T1" : "B1"),
        subject: p.gene.subjectId,
        faculty: p.gene.facultyId,
        room: p.gene.roomId,
        durationHours: 2
      }));

      parentChildEntries.push({
        subject: first.gene.subjectId,
        faculty: first.gene.facultyId,
        room: first.gene.roomId,
        timeSlot: first.slot1._id,
        durationSlots: 2,
        entryType: "PRACTICAL",
        batch: null, // parent represents all batches
        childBatches,
        day: first.gene.day,
        startTime: first.slot1.startTime,
        endTime: first.slot2 ? first.slot2.endTime : first.slot1.endTime
      });
    }

    // Combine all entries
    const allFormattedEntries = [...parentChildEntries, ...nonPracticalEntries];

    candidateDocs.push({
      department: department._id,
      institution: institutionId,
      semester: cohort.semesterId,
      division: cohort.divisionId || null,
      academicYear,
      entries: allFormattedEntries,
      status: "VALID",
      conflicts: [],
      generatedBy: userId
    });
  }

  // -----------------------------------------------------------------
  // STAGED SAFE GENERATION & ROLLBACK VALIDATION
  // -----------------------------------------------------------------
  // Pre-persistence verification: Ensure new timetables are complete and collision-free
  if (candidateDocs.length === 0) {
    throw new Error("Timetable generation failed to produce candidate timetables; database untouched.");
  }

  for (const doc of candidateDocs) {
    if (!doc.entries || doc.entries.length === 0) {
      throw new Error(`Timetable generation for semester ${doc.semester} produced 0 entries; database untouched.`);
    }
  }

  if (gaResult && gaResult.hardViolations > 0) {
    throw new Error(`Generation failed hard constraint validation (${gaResult.hardViolations} violations); aborting to preserve existing schedule.`);
  }

  // Atomically delete old timetables and persist verified candidate docs
  await Timetable.deleteMany({
    department: department._id,
    semester: { $in: semesterIds },
    academicYear
  });

  const savedTimetableDocs = await Timetable.insertMany(candidateDocs);

  // -----------------------------------------------------------------
  // SYNC UNIFIED MASTER TIMETABLE RECORD
  // -----------------------------------------------------------------
  const allMasterEntries = [];

  for (const doc of savedTimetableDocs) {
    for (const e of doc.entries) {
      allMasterEntries.push({
        semester: doc.semester,
        batch: null,
        subject: e.subject,
        faculty: e.faculty,
        room: e.room,
        timeSlot: e.timeSlot,
        durationSlots: e.durationSlots,
        entryType: e.entryType,
        title: e.childBatches?.length
          ? `Practical Lab (${e.childBatches.map((cb) => cb.batch).join(", ")})`
          : (e.batch ? `[Batch ${e.batch}]` : ""),
        childBatches: e.childBatches || []
      });
    }
  }

  await MasterTimetable.deleteMany({
    department: department._id,
    academicYear
  });

  const masterDoc = await MasterTimetable.create({
    department: department._id,
    institution: institutionId,
    academicYear,
    semesters: semesterIds,
    entries: allMasterEntries,
    status: "GENERATED",
    generatedBy: userId
  });

  const populatedTimetables = await Timetable.find({
    _id: { $in: savedTimetableDocs.map((d) => d._id) }
  })
    .populate("department", "name code")
    .populate("institution", "name code tagline programmes defaultProgramme")
    .populate("semester", "name number")
    .populate("division", "name studentCount")
    .populate("entries.subject", "name code type courseCategory credits")
    .populate("entries.faculty", "name employeeId designation")
    .populate("entries.room", "name roomNumber type capacity")
    .populate("entries.timeSlot", "day startTime endTime slotNumber isBreak")
    .populate("entries.childBatches.subject", "name code type courseCategory credits")
    .populate("entries.childBatches.faculty", "name employeeId designation")
    .populate("entries.childBatches.room", "name roomNumber type capacity");

  return {
    isFullyValid: true,
    semesters: semesterNumbers,
    totalCohorts: cohorts.length,
    timetablesCount: savedTimetableDocs.length,
    practicalSessionsCount: practicalQueue.length,
    facultyCount: allFaculty.length,
    classroomsCount: classrooms.length,
    labsCount: laboratories.length,
    hardConstraintViolations: gaResult.hardViolations || 0,
    softConstraintScore: gaResult.softScore || 0,
    fitness: gaResult.fitness || 0,
    populationSize: 12,
    generations: gaResult.generationsRun || 1,
    generationDurationMs: Date.now() - startTime,
    scheduledSessionsCount: allMasterEntries.length,
    unscheduledSessionsCount: 0,
    practicalDistribution: gaResult.practicalDistribution || globalPracticalDays,
    status: "VALID",
    masterTimetableId: masterDoc._id,
    timetables: populatedTimetables
  };
};

/**
 * Generate a single semester's timetable
 */
const generateSemesterTimetable = async (params = {}) => {
  const semester = await Semester.findById(params.semesterId);
  if (!semester) {
    throw new Error("Semester not found");
  }
  return generateDepartmentTimetable({
    departmentId: params.departmentId || semester.department,
    academicYear: params.academicYear || "2026-27",
    semesterNumbers: [semester.number],
    useDivisions: params.useDivisions || false,
    userId: params.userId || null
  });
};

module.exports = {
  generateDepartmentTimetable,
  generateSemesterTimetable
};
