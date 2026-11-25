const Semester = require("../models/Semester");
const Subject = require("../models/Subject");
const Faculty = require("../models/Faculty");
const Room = require("../models/Room");
const TimeSlot = require("../models/TimeSlot");
const Batch = require("../models/Batch");
const Availability = require("../models/Availability");

/*
 * =========================================================
 * MASTER TIMETABLE CONFIGURATION
 * =========================================================
 */

const SEMESTER_CONFIG = {
  3: {
    studentCount: 72,
    batchPrefix: "S",
  },

  5: {
    studentCount: 68,
    batchPrefix: "T",
  },

  7: {
    studentCount: 72,
    batchPrefix: "B",
  },
};

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
];

/*
 * =========================================================
 * KEY HELPERS
 * =========================================================
 */

const getKey = (day, slotNumber) =>
  `${day}_${slotNumber}`;

const resourceKey = (
  resourceId,
  day,
  slotNumber
) =>
  `${String(resourceId)}_${getKey(
    day,
    slotNumber
  )}`;

const semesterKey = (
  semesterId,
  day,
  slotNumber
) =>
  `${String(semesterId)}_${getKey(
    day,
    slotNumber
  )}`;

const batchKey = (
  batchId,
  day,
  slotNumber
) =>
  `${String(batchId)}_${getKey(
    day,
    slotNumber
  )}`;

/*
 * =========================================================
 * GENERIC RESOURCE HELPERS
 * =========================================================
 */

const isBusy = (
  schedule,
  resourceId,
  day,
  slotNumber,
  duration = 1
) => {
  for (
    let offset = 0;
    offset < duration;
    offset += 1
  ) {
    if (
      schedule.has(
        resourceKey(
          resourceId,
          day,
          slotNumber + offset
        )
      )
    ) {
      return true;
    }
  }

  return false;
};

const occupyResource = (
  schedule,
  resourceId,
  day,
  slotNumber,
  duration = 1
) => {
  for (
    let offset = 0;
    offset < duration;
    offset += 1
  ) {
    schedule.add(
      resourceKey(
        resourceId,
        day,
        slotNumber + offset
      )
    );
  }
};

/*
 * =========================================================
 * BATCH HELPERS
 * =========================================================
 */

const isBatchBusy = (
  schedule,
  batchId,
  day,
  slotNumber,
  duration = 1
) => {
  for (
    let offset = 0;
    offset < duration;
    offset += 1
  ) {
    if (
      schedule.has(
        batchKey(
          batchId,
          day,
          slotNumber + offset
        )
      )
    ) {
      return true;
    }
  }

  return false;
};

const occupyBatch = (
  schedule,
  batchId,
  day,
  slotNumber,
  duration = 1
) => {
  for (
    let offset = 0;
    offset < duration;
    offset += 1
  ) {
    schedule.add(
      batchKey(
        batchId,
        day,
        slotNumber + offset
      )
    );
  }
};

/*
 * =========================================================
 * SEMESTER HELPERS
 * =========================================================
 */

const isSemesterBusy = (
  schedule,
  semesterId,
  day,
  slotNumber,
  duration = 1
) => {
  for (
    let offset = 0;
    offset < duration;
    offset += 1
  ) {
    if (
      schedule.has(
        semesterKey(
          semesterId,
          day,
          slotNumber + offset
        )
      )
    ) {
      return true;
    }
  }

  return false;
};

const occupySemester = (
  schedule,
  semesterId,
  day,
  slotNumber,
  duration = 1
) => {
  for (
    let offset = 0;
    offset < duration;
    offset += 1
  ) {
    schedule.add(
      semesterKey(
        semesterId,
        day,
        slotNumber + offset
      )
    );
  }
};

/*
 * =========================================================
 * AVAILABILITY
 * =========================================================
 */

const buildAvailabilityMap = (
  records
) => {
  const map = new Map();

  for (const record of records) {
    const key =
      `${record.resourceType}_${String(
        record.resourceId
      )}_${record.day}`;

    map.set(
      key,
      new Set(
        (record.availableSlots || []).map(
          String
        )
      )
    );
  }

  return map;
};

const resourceAvailable = (
  availability,
  resourceType,
  resourceId,
  slot
) => {
  const key =
    `${resourceType}_${String(
      resourceId
    )}_${slot.day}`;

  const allowed =
    availability.get(key);

  /*
   * No Availability record =
   * unrestricted.
   */
  if (!allowed) {
    return true;
  }

  return allowed.has(
    String(slot._id)
  );
};

/*
 * =========================================================
 * FACULTY HELPERS
 * =========================================================
 */

const getFacultyList = (
  subject,
  allFaculty
) => {
  if (
    Array.isArray(subject.faculty) &&
    subject.faculty.length > 0
  ) {
    return subject.faculty;
  }

  return allFaculty.filter(
    (faculty) =>
      String(
        faculty.department
      ) ===
      String(
        subject.department
      )
  );
};

/*
 * =========================================================
 * BATCH CREATION
 * =========================================================
 */

const ensureBatches = async (
  semester,
  config
) => {
  let existing =
    await Batch.find({
      semester: semester._id,
      isActive: true,
    }).sort({
      startRoll: 1,
    });

  /*
   * Correct batches already exist.
   * Preserve them.
   */
  if (existing.length === 4) {
    return existing;
  }

  /*
   * If there are no usable batches,
   * create the four default batches.
   *
   * We do NOT delete unrelated data.
   */
  if (existing.length === 0) {
    const baseCount =
      Math.floor(
        config.studentCount / 4
      );

    const remainder =
      config.studentCount % 4;

    const batches = [];

    let currentRoll = 1;

    for (
      let i = 0;
      i < 4;
      i += 1
    ) {
      const count =
        baseCount +
        (i < remainder ? 1 : 0);

      const startRoll =
        currentRoll;

      const endRoll =
        currentRoll +
        count -
        1;

      const batch =
        await Batch.create({
          name: `${config.batchPrefix}${i + 1}`,

          code: `${config.batchPrefix}${i + 1}`,

          semester:
            semester._id,

          studentCount:
            count,

          startRoll,

          endRoll,

          isActive: true,
        });

      batches.push(batch);

      currentRoll =
        endRoll + 1;
    }

    return batches;
  }

  /*
   * Existing incomplete data should not
   * silently be destroyed.
   */
  throw new Error(
    `Semester ${semester.number} has ${existing.length} active batches. Exactly 4 are required. Please correct the batch data before generating the master timetable.`
  );
};

/*
 * =========================================================
 * TIME SLOT HELPERS
 * =========================================================
 */

const sortTimeSlots = (
  slots
) => {
  const dayOrder =
    new Map(
      DAYS.map(
        (day, index) => [
          day,
          index,
        ]
      )
    );

  return [...slots].sort(
    (a, b) => {
      const dayDifference =
        dayOrder.get(a.day) -
        dayOrder.get(b.day);

      if (
        dayDifference !== 0
      ) {
        return dayDifference;
      }

      return (
        a.slotNumber -
        b.slotNumber
      );
    }
  );
};

/*
 * =========================================================
 * BUILD REAL 2-HOUR PRACTICAL BLOCKS
 * =========================================================
 */

const buildPracticalBlocks = (
  timeSlots
) => {
  const blocks = [];

  for (const day of DAYS) {
    const daySlots =
      timeSlots
        .filter(
          (slot) =>
            slot.day === day &&
            !slot.isBreak
        )
        .sort(
          (a, b) =>
            a.slotNumber -
            b.slotNumber
        );

    for (
      let i = 0;
      i <
        daySlots.length - 1;
      i += 1
    ) {
      const first =
        daySlots[i];

      const second =
        daySlots[i + 1];

      /*
       * Example valid blocks:
       *
       * 10:00-11:00 +
       * 11:00-12:00
       *
       * 12:45-13:45 +
       * 13:45-14:45
       *
       * 15:00-16:00 +
       * 16:00-17:00
       */
      if (
        second.slotNumber ===
          first.slotNumber + 1 &&
        first.endTime ===
          second.startTime
      ) {
        blocks.push({
          day,

          startSlot:
            first,

          secondSlot:
            second,

          startSlotNumber:
            first.slotNumber,

          endSlotNumber:
            second.slotNumber,

          key: getKey(
            day,
            first.slotNumber
          ),
        });
      }
    }
  }

  return blocks;
};

/*
 * =========================================================
 * FIXED ACTIVITIES
 * =========================================================
 *
 * Current CSE rules:
 *
 * Semester 3:
 *   Library Hour = 2 hours
 *   Mentor Hour  = 2 hours
 *
 * Semester 7:
 *   Project-I = 2 hours × 2
 *
 * These are semester-wide.
 * =========================================================
 */

const reserveFixedActivities = ({
  semesters,
  practicalBlocks,
  semesterSchedule,
  entries,
}) => {
  const activities = [
    {
      semesterNumber: 3,
      title: "Library Hour",
      entryType: "LIBRARY",
      count: 1,
    },

    {
      semesterNumber: 3,
      title: "Mentor Hour",
      entryType: "MENTOR",
      count: 1,
    },

    {
      semesterNumber: 7,
      title: "Project-I",
      entryType: "PROJECT",
      count: 2,
    },
  ];

  /*
   * Prefer afternoon blocks so that fixed
   * activities do not consume too much
   * morning teaching capacity.
   */
  const orderedBlocks =
    [...practicalBlocks].sort(
      (a, b) => {
        const dayDifference =
          DAYS.indexOf(a.day) -
          DAYS.indexOf(b.day);

        if (
          dayDifference !== 0
        ) {
          return dayDifference;
        }

        return (
          b.startSlotNumber -
          a.startSlotNumber
        );
      }
    );

  for (const activity of activities) {
    const semester =
      semesters.find(
        (item) =>
          Number(item.number) ===
          Number(
            activity.semesterNumber
          )
      );

    if (!semester) {
      continue;
    }

    let placedCount = 0;

    /*
     * Rotate through blocks for repeated
     * activities.
     */
    for (
      let attempt = 0;
      attempt <
        orderedBlocks.length &&
        placedCount <
          activity.count;
      attempt += 1
    ) {
      const block =
        orderedBlocks[
          attempt
        ];

      if (
        isSemesterBusy(
          semesterSchedule,
          semester._id,
          block.day,
          block.startSlotNumber,
          2
        )
      ) {
        continue;
      }

      entries.push({
        semester:
          semester._id,

        batch: null,

        subject: null,

        faculty: null,

        room: null,

        timeSlot:
          block.startSlot._id,

        durationSlots: 2,

        entryType:
          activity.entryType,

        title:
          activity.title,
      });

      occupySemester(
        semesterSchedule,
        semester._id,
        block.day,
        block.startSlotNumber,
        2
      );

      placedCount += 1;

      console.log(
        `Reserved ${activity.title} for Semester ${semester.number}: ${block.day} ${block.startSlot.startTime}-${block.secondSlot.endTime}`
      );
    }

    if (
      placedCount <
      activity.count
    ) {
      throw new Error(
        `Unable to reserve "${activity.title}" for Semester ${semester.number}.`
      );
    }
  }
};

/*
 * =========================================================
 * LECTURE HOURS
 * =========================================================
 */

const getLectureHours = (
  subject
) => {
  const weeklyHours =
    Number(
      subject.weeklyHours || 0
    );

  const practicalHours =
    Number(
      subject.practicalHours || 0
    );

  return Math.max(
    0,
    weeklyHours -
      practicalHours
  );
};

/*
 * =========================================================
 * LECTURE SCHEDULING
 * =========================================================
 *
 * phase:
 *
 * "CONSTRAINED"
 *   Only subjects with very limited
 *   faculty options.
 *
 * "REMAINING"
 *   All subjects not completely
 *   scheduled yet.
 *
 * This solves the major problem where
 * a one-faculty lecture is left until
 * after practical scheduling.
 * =========================================================
 */

const scheduleLectures = ({
  phase,
  semesters,
  subjectsBySemester,
  batchesBySemester,
  faculty,
  classrooms,
  availability,
  timeSlots,
  practicalUnionSchedule,
  semesterSchedule,
  facultySchedule,
  roomSchedule,
  entries,
  lectureHoursScheduled,
}) => {
  const semesterDayUsage =
    new Map();

  const subjectDayUsage =
    new Map();

  /*
   * Initialize semester day usage.
   */
  for (const semester of semesters) {
    semesterDayUsage.set(
      String(semester._id),
      new Map(
        DAYS.map(
          (day) => [
            day,
            0,
          ]
        )
      )
    );
  }

  /*
   * Calculate current lecture counts
   * from already generated entries.
   */
  for (const entry of entries) {
    if (
      entry.entryType !==
        "LECTURE" &&
      entry.entryType !==
        "TUTORIAL"
    ) {
      continue;
    }

    const slot =
      timeSlots.find(
        (item) =>
          String(item._id) ===
          String(entry.timeSlot)
      );

    if (!slot) {
      continue;
    }

    const usage =
      semesterDayUsage.get(
        String(entry.semester)
      );

    if (usage) {
      usage.set(
        slot.day,
        (usage.get(slot.day) ||
          0) + 1
      );
    }
  }

  for (const semester of semesters) {
    const semesterSubjects =
      subjectsBySemester.get(
        String(semester._id)
      ) || [];

    let lectureSubjects =
      semesterSubjects.filter(
        (subject) =>
          getLectureHours(subject) >
          0
      );

    /*
     * CONSTRAINED phase:
     *
     * Schedule one-faculty subjects
     * first.
     *
     * If necessary, also include
     * two-faculty subjects with high
     * lecture demand.
     */
    if (
      phase === "CONSTRAINED"
    ) {
      lectureSubjects =
        lectureSubjects.filter(
          (subject) => {
            const list =
              getFacultyList(
                subject,
                faculty
              );

            return (
              list.length <= 1
            );
          }
        );
    }

    /*
     * REMAINING phase:
     *
     * Schedule subjects that still
     * have unscheduled hours.
     */
    if (
      phase === "REMAINING"
    ) {
      lectureSubjects =
        lectureSubjects.filter(
          (subject) => {
            const required =
              getLectureHours(
                subject
              );

            const scheduled =
              lectureHoursScheduled.get(
                `${String(
                  semester._id
                )}_${String(
                  subject._id
                )}`
              ) || 0;

            return (
              scheduled <
              required
            );
          }
        );
    }

    /*
     * Hardest subjects first.
     */
    lectureSubjects.sort(
      (a, b) => {
        const facultyA =
          getFacultyList(
            a,
            faculty
          ).length;

        const facultyB =
          getFacultyList(
            b,
            faculty
          ).length;

        if (
          facultyA !==
          facultyB
        ) {
          return (
            facultyA -
            facultyB
          );
        }

        return (
          getLectureHours(b) -
          getLectureHours(a)
        );
      }
    );

    for (
      const subject of
        lectureSubjects
    ) {
      const requiredHours =
        getLectureHours(
          subject
        );

      const subjectKey =
        `${String(
          semester._id
        )}_${String(
          subject._id
        )}`;

      if (
        !subjectDayUsage.has(
          subjectKey
        )
      ) {
        subjectDayUsage.set(
          subjectKey,
          new Map(
            DAYS.map(
              (day) => [
                day,
                0,
              ]
            )
          )
        );
      }

      const subjectUsage =
        subjectDayUsage.get(
          subjectKey
        );

      let alreadyScheduled =
        lectureHoursScheduled.get(
          subjectKey
        ) || 0;

      /*
       * Schedule only remaining hours.
       */
      while (
        alreadyScheduled <
        requiredHours
      ) {
        const facultyList =
          getFacultyList(
            subject,
            faculty
          );

        if (
          !facultyList.length
        ) {
          throw new Error(
            `No faculty is available for lecture "${subject.name}" in Semester ${semester.number}.`
          );
        }

        const semesterUsage =
          semesterDayUsage.get(
            String(
              semester._id
            )
          );

        const candidates = [];

        for (
          const slot of timeSlots
        ) {
          /*
           * Semester-wide occupation:
           *
           * - fixed activity
           * - already scheduled lecture
           */
          if (
            isSemesterBusy(
              semesterSchedule,
              semester._id,
              slot.day,
              slot.slotNumber,
              1
            )
          ) {
            continue;
          }

          /*
           * Practical union:
           *
           * Any practical for this
           * semester blocks the entire
           * semester during that hour.
           */
          if (
            isSemesterBusy(
              practicalUnionSchedule,
              semester._id,
              slot.day,
              slot.slotNumber,
              1
            )
          ) {
            continue;
          }

          /*
           * Find free faculty.
           */
          let selectedFaculty =
            null;

          for (
            const candidate of
              facultyList
          ) {
            if (
              isBusy(
                facultySchedule,
                candidate._id,
                slot.day,
                slot.slotNumber,
                1
              )
            ) {
              continue;
            }

            if (
              !resourceAvailable(
                availability,
                "FACULTY",
                candidate._id,
                slot
              )
            ) {
              continue;
            }

            selectedFaculty =
              candidate;

            break;
          }

          if (
            !selectedFaculty
          ) {
            continue;
          }

          /*
           * Find classroom.
           */
          let selectedRoom =
            null;

          const batches =
            batchesBySemester.get(
              String(
                semester._id
              )
            ) || [];

          const requiredCapacity =
            batches.reduce(
              (total, batch) =>
                total +
                Number(
                  batch.studentCount ||
                    0
                ),
              0
            );

          for (
            const classroom of
              classrooms
          ) {
            if (
              Number(
                classroom.capacity ||
                  0
              ) <
              requiredCapacity
            ) {
              continue;
            }

            if (
              isBusy(
                roomSchedule,
                classroom._id,
                slot.day,
                slot.slotNumber,
                1
              )
            ) {
              continue;
            }

            if (
              !resourceAvailable(
                availability,
                "ROOM",
                classroom._id,
                slot
              )
            ) {
              continue;
            }

            selectedRoom =
              classroom;

            break;
          }

          if (
            !selectedRoom
          ) {
            continue;
          }

          const subjectDayCount =
            subjectUsage.get(
              slot.day
            ) || 0;

          const semesterDayCount =
            semesterUsage.get(
              slot.day
            ) || 0;

          /*
           * Score:
           *
           * 1. Do not repeatedly put
           *    same subject on same day.
           * 2. Balance semester days.
           * 3. Prefer slots that do not
           *    unnecessarily damage
           *    practical capacity.
           */
          const practicalBlockPenalty =
            slot.slotNumber % 2 === 0
              ? 0
              : 5;

          const score =
            subjectDayCount *
              10000 +
            semesterDayCount *
              100 +
            practicalBlockPenalty +
            slot.slotNumber +
            DAYS.indexOf(
              slot.day
            ) *
              2;

          candidates.push({
            slot,
            selectedFaculty,
            selectedRoom,
            score,
          });
        }

        if (
          !candidates.length
        ) {
          console.error(
            "Unable to allocate lecture.",
            {
              subject:
                subject.name,

              semester:
                semester.number,

              phase,

              requiredHours,

              alreadyScheduled,

              facultyCount:
                facultyList.length,

              faculty:
                facultyList.map(
                  (item) => ({
                    id: String(
                      item._id
                    ),
                    name:
                      item.name ||
                      item.fullName ||
                      "Unknown",
                  })
                ),
            }
          );

          throw new Error(
            `Unable to schedule lecture "${subject.name}" for Semester ${semester.number}.`
          );
        }

        candidates.sort(
          (a, b) =>
            a.score - b.score
        );

        const selected =
          candidates[0];

        const slot =
          selected.slot;

        entries.push({
          semester:
            semester._id,

          batch: null,

          subject:
            subject._id,

          faculty:
            selected.selectedFaculty
              ._id,

          room:
            selected.selectedRoom
              ._id,

          timeSlot:
            slot._id,

          durationSlots: 1,

          entryType:
            subject.type ===
            "TUTORIAL"
              ? "TUTORIAL"
              : "LECTURE",

          title:
            subject.name,
        });

        occupySemester(
          semesterSchedule,
          semester._id,
          slot.day,
          slot.slotNumber,
          1
        );

        occupyResource(
          facultySchedule,
          selected.selectedFaculty
            ._id,
          slot.day,
          slot.slotNumber,
          1
        );

        occupyResource(
          roomSchedule,
          selected.selectedRoom
            ._id,
          slot.day,
          slot.slotNumber,
          1
        );

        subjectUsage.set(
          slot.day,
          (subjectUsage.get(
            slot.day
          ) || 0) + 1
        );

        semesterUsage.set(
          slot.day,
          (semesterUsage.get(
            slot.day
          ) || 0) + 1
        );

        alreadyScheduled +=
          1;

        lectureHoursScheduled.set(
          subjectKey,
          alreadyScheduled
        );
      }
    }
  }
};

/*
 * =========================================================
 * PRACTICAL TASK GENERATION
 * =========================================================
 */

const buildPracticalTasks = ({
  semesters,
  subjectsBySemester,
  batchesBySemester,
  faculty,
}) => {
  const tasks = [];

  for (const semester of semesters) {
    const semesterSubjects =
      subjectsBySemester.get(
        String(semester._id)
      ) || [];

    const batches =
      batchesBySemester.get(
        String(semester._id)
      ) || [];

    const practicalSubjects =
      semesterSubjects.filter(
        (subject) => {
          const practicalHours =
            Number(
              subject.practicalHours ||
                0
            );

          return (
            subject.type ===
              "PRACTICAL" ||
            practicalHours > 0
          );
        }
      );

    for (
      const subject of
        practicalSubjects
    ) {
      const facultyList =
        getFacultyList(
          subject,
          faculty
        );

      if (
        !facultyList.length
      ) {
        throw new Error(
          `No faculty is assigned to practical "${subject.name}" in Semester ${semester.number}.`
        );
      }

      let practicalHours =
        Number(
          subject.practicalHours ||
            0
        );

      /*
       * A PRACTICAL subject with
       * no explicit practicalHours
       * receives one 2-hour session.
       */
      if (
        practicalHours <= 0 &&
        subject.type ===
          "PRACTICAL"
      ) {
        practicalHours = 2;
      }

      const sessionsPerBatch =
        Math.max(
          1,
          Math.ceil(
            practicalHours / 2
          )
        );

      for (const batch of batches) {
        for (
          let session = 1;
          session <=
            sessionsPerBatch;
          session += 1
        ) {
          tasks.push({
            semester,
            subject,
            batch,
            facultyList,
            session,
            sessionsPerBatch,
          });
        }
      }
    }
  }

  /*
   * Hardest practicals first.
   */
  tasks.sort(
    (a, b) => {
      const facultyDifference =
        a.facultyList.length -
        b.facultyList.length;

      if (
        facultyDifference !==
        0
      ) {
        return facultyDifference;
      }

      return (
        Number(
          b.subject.practicalHours ||
            0
        ) -
        Number(
          a.subject.practicalHours ||
            0
        )
      );
    }
  );

  return tasks;
};

/*
 * =========================================================
 * PRACTICAL SCHEDULING
 * =========================================================
 *
 * VERY IMPORTANT:
 *
 * Practical batches are allowed to run
 * simultaneously:
 *
 * S1 -> LAB1
 * S2 -> LAB2
 * S3 -> LAB3
 * S4 -> LAB4
 *
 * Therefore we DO NOT use semesterSchedule
 * to prevent one practical batch from
 * blocking another practical batch.
 *
 * Instead:
 *
 * batchSchedule
 * facultySchedule
 * roomSchedule
 *
 * control practical conflicts.
 *
 * practicalUnionSchedule records the
 * UNION of all practical periods and is
 * later used to prevent lectures.
 * =========================================================
 */

const schedulePracticals = ({
  tasks,
  practicalBlocks,
  availability,
  facultySchedule,
  roomSchedule,
  batchSchedule,
  semesterSchedule,
  practicalUnionSchedule,
  entries,
}) => {
  const blockUsage =
    new Map();

  const dayUsage =
    new Map();

  const subjectBatchDays =
    new Map();

  for (const day of DAYS) {
    dayUsage.set(day, 0);
  }

  for (const task of tasks) {
    const candidates = [];

    const subjectBatchKey =
      `${String(
        task.subject._id
      )}_${String(
        task.batch._id
      )}`;

    const usedDays =
      subjectBatchDays.get(
        subjectBatchKey
      ) || new Set();

    for (
      const block of
        practicalBlocks
    ) {
      /*
       * Fixed activities and constrained
       * lectures are already in
       * semesterSchedule.
       */
      if (
        isSemesterBusy(
          semesterSchedule,
          task.semester._id,
          block.day,
          block.startSlotNumber,
          2
        )
      ) {
        continue;
      }

      /*
       * Batch conflict.
       */
      if (
        isBatchBusy(
          batchSchedule,
          task.batch._id,
          block.day,
          block.startSlotNumber,
          2
        )
      ) {
        continue;
      }

      /*
       * Find faculty.
       */
      let selectedFaculty =
        null;

      for (
        const candidate of
          task.facultyList
      ) {
        if (
          isBusy(
            facultySchedule,
            candidate._id,
            block.day,
            block.startSlotNumber,
            2
          )
        ) {
          continue;
        }

        if (
          !resourceAvailable(
            availability,
            "FACULTY",
            candidate._id,
            block.startSlot
          ) ||
          !resourceAvailable(
            availability,
            "FACULTY",
            candidate._id,
            block.secondSlot
          )
        ) {
          continue;
        }

        selectedFaculty =
          candidate;

        break;
      }

      if (
        !selectedFaculty
      ) {
        continue;
      }

      /*
       * Find lab.
       */
      let selectedRoom =
        null;

      for (
        const lab of
          task.labs ||
          []
      ) {
        if (
          Number(
            lab.capacity || 0
          ) <
          Number(
            task.batch.studentCount ||
              0
          )
        ) {
          continue;
        }

        if (
          isBusy(
            roomSchedule,
            lab._id,
            block.day,
            block.startSlotNumber,
            2
          )
        ) {
          continue;
        }

        if (
          !resourceAvailable(
            availability,
            "ROOM",
            lab._id,
            block.startSlot
          ) ||
          !resourceAvailable(
            availability,
            "ROOM",
            lab._id,
            block.secondSlot
          )
        ) {
          continue;
        }

        selectedRoom = lab;

        break;
      }

      if (!selectedRoom) {
        continue;
      }

      const usage =
        blockUsage.get(
          block.key
        ) || 0;

      const dayCount =
        dayUsage.get(
          block.day
        ) || 0;

      const sameDay =
        usedDays.has(
          block.day
        );

      /*
       * Prefer:
       *
       * 1. Reusing a block for the
       *    same semester where possible.
       * 2. Less-loaded days.
       * 3. Less-used blocks.
       * 4. Avoid same subject/batch
       *    repeating on same day.
       */
      const score =
        (sameDay
          ? 5000
          : 0) +
        dayCount * 100 -
        usage * 300 +
        DAYS.indexOf(
          block.day
        ) *
          2 +
        block.startSlotNumber;

      candidates.push({
        block,
        selectedFaculty,
        selectedRoom,
        score,
      });
    }

    /*
     * =====================================================
     * PRACTICAL FAILURE DIAGNOSTIC
     * =====================================================
     */

    if (!candidates.length) {
      console.error(
        "Unable to allocate practical batch.",
        {
          subject:
            task.subject.name,

          semester:
            task.semester.number,

          batch:
            task.batch.name,

          facultyCount:
            task.facultyList.length,

          requiredSession:
            `${task.session}/${task.sessionsPerBatch}`,

          practicalBlocks:
            practicalBlocks.map(
              (block) => ({
                day:
                  block.day,

                start:
                  block.startSlot
                    .startTime,

                end:
                  block.secondSlot
                    .endTime,
              })
            ),
        }
      );

      throw new Error(
        `Unable to find a practical block for "${task.subject.name}" in Semester ${task.semester.number}, Batch ${task.batch.name}.`
      );
    }

    candidates.sort(
      (a, b) =>
        a.score - b.score
    );

    const selected =
      candidates[0];

    const block =
      selected.block;

    const selectedFaculty =
      selected.selectedFaculty;

    const selectedRoom =
      selected.selectedRoom;

    /*
     * Create timetable entry.
     */
    entries.push({
      semester:
        task.semester._id,

      batch:
        task.batch._id,

      subject:
        task.subject._id,

      faculty:
        selectedFaculty._id,

      room:
        selectedRoom._id,

      timeSlot:
        block.startSlot._id,

      durationSlots: 2,

      entryType:
        "PRACTICAL",

      title:
        task.subject.name,
    });

    /*
     * Batch is occupied.
     */
    occupyBatch(
      batchSchedule,
      task.batch._id,
      block.day,
      block.startSlotNumber,
      2
    );

    /*
     * Faculty globally occupied.
     */
    occupyResource(
      facultySchedule,
      selectedFaculty._id,
      block.day,
      block.startSlotNumber,
      2
    );

    /*
     * Lab globally occupied.
     */
    occupyResource(
      roomSchedule,
      selectedRoom._id,
      block.day,
      block.startSlotNumber,
      2
    );

    /*
     * IMPORTANT:
     *
     * Do NOT add practicals to
     * semesterSchedule.
     *
     * Otherwise S1 practical would
     * prevent S2/S3/S4 practicals
     * from running simultaneously.
     *
     * Instead add them to the separate
     * practicalUnionSchedule.
     */
    occupySemester(
      practicalUnionSchedule,
      task.semester._id,
      block.day,
      block.startSlotNumber,
      2
    );

    blockUsage.set(
      block.key,
      (blockUsage.get(
        block.key
      ) || 0) + 1
    );

    dayUsage.set(
      block.day,
      (dayUsage.get(
        block.day
      ) || 0) + 1
    );

    if (
      !subjectBatchDays.has(
        subjectBatchKey
      )
    ) {
      subjectBatchDays.set(
        subjectBatchKey,
        new Set()
      );
    }

    subjectBatchDays
      .get(subjectBatchKey)
      .add(block.day);
  }

  console.log(
    "Master practical scheduling completed.",
    {
      totalPracticalSessions:
        tasks.length,

      blockUsage:
        Object.fromEntries(
          blockUsage
        ),

      dayUsage:
        Object.fromEntries(
          dayUsage
        ),
    }
  );
};

/*
 * =========================================================
 * FINAL VALIDATION
 * =========================================================
 */

const validateEntries = ({
  entries,
  timeSlots,
}) => {
  const facultyValidation =
    new Set();

  const roomValidation =
    new Set();

  const batchValidation =
    new Set();

  const semesterValidation =
    new Set();

  for (const entry of entries) {
    const startSlot =
      timeSlots.find(
        (slot) =>
          String(slot._id) ===
          String(
            entry.timeSlot
          )
      );

    if (!startSlot) {
      throw new Error(
        `Invalid TimeSlot reference found for "${entry.title}".`
      );
    }

    /*
     * Make sure a multi-hour entry
     * really has all corresponding
     * TimeSlot records.
     */
    for (
      let offset = 0;
      offset <
        Number(
          entry.durationSlots ||
            1
        );
      offset += 1
    ) {
      const slotNumber =
        startSlot.slotNumber +
        offset;

      const actualSlot =
        timeSlots.find(
          (slot) =>
            slot.day ===
              startSlot.day &&
            Number(
              slot.slotNumber
            ) ===
              Number(
                slotNumber
              )
        );

      if (!actualSlot) {
        throw new Error(
          `Invalid duration for "${entry.title}" on ${startSlot.day}.`
        );
      }

      /*
       * Faculty conflict.
       */
      if (entry.faculty) {
        const key =
          resourceKey(
            entry.faculty,
            startSlot.day,
            slotNumber
          );

        if (
          facultyValidation.has(
            key
          )
        ) {
          throw new Error(
            `Faculty conflict detected for "${entry.title}" on ${startSlot.day} slot ${slotNumber}.`
          );
        }

        facultyValidation.add(
          key
        );
      }

      /*
       * Room conflict.
       */
      if (entry.room) {
        const key =
          resourceKey(
            entry.room,
            startSlot.day,
            slotNumber
          );

        if (
          roomValidation.has(
            key
          )
        ) {
          throw new Error(
            `Room/Lab conflict detected for "${entry.title}" on ${startSlot.day} slot ${slotNumber}.`
          );
        }

        roomValidation.add(
          key
        );
      }

      /*
       * Batch conflict.
       */
      if (entry.batch) {
        const key =
          batchKey(
            entry.batch,
            startSlot.day,
            slotNumber
          );

        if (
          batchValidation.has(
            key
          )
        ) {
          throw new Error(
            `Batch conflict detected for "${entry.title}" on ${startSlot.day} slot ${slotNumber}.`
          );
        }

        batchValidation.add(
          key
        );
      }

      /*
       * Semester-wide conflict.
       *
       * Only lectures/activities are
       * semester-wide.
       *
       * Practical batches are NOT checked
       * here because S1/S2/S3/S4 may
       * legitimately run together.
       */
      if (
        !entry.batch
      ) {
        const key =
          semesterKey(
            entry.semester,
            startSlot.day,
            slotNumber
          );

        if (
          semesterValidation.has(
            key
          )
        ) {
          throw new Error(
            `Semester conflict detected for "${entry.title}" on ${startSlot.day} slot ${slotNumber}.`
          );
        }

        semesterValidation.add(
          key
        );
      }
    }
  }
};

/*
 * =========================================================
 * MASTER TIMETABLE GENERATOR
 * =========================================================
 */

async function generateMasterTimetable({
  departmentId,
}) {
  const semesterNumbers = [
    3,
    5,
    7,
  ];

  /*
   * =======================================================
   * 1. LOAD SEMESTERS
   * =======================================================
   */

  const semesters =
    await Semester.find({
      department:
        departmentId,

      number: {
        $in: semesterNumbers,
      },
    }).sort({
      number: 1,
    });

  if (
    semesters.length !== 3
  ) {
    throw new Error(
      "CSE master timetable requires Semesters 3, 5 and 7."
    );
  }

  /*
   * =======================================================
   * 2. LOAD TIME SLOTS
   * =======================================================
   */

  const timeSlotsRaw =
    await TimeSlot.find({
      isBreak: false,

      day: {
        $in: DAYS,
      },
    }).lean();

  const timeSlots =
    sortTimeSlots(
      timeSlotsRaw
    );

  if (!timeSlots.length) {
    throw new Error(
      "No usable TimeSlots were found for Monday-Friday."
    );
  }

  /*
   * =======================================================
   * 3. BUILD PRACTICAL BLOCKS
   * =======================================================
   */

  const practicalBlocks =
    buildPracticalBlocks(
      timeSlots
    );

  if (
    !practicalBlocks.length
  ) {
    throw new Error(
      "No valid 2-hour practical blocks could be constructed from the TimeSlot records."
    );
  }

  console.log(
    "Practical blocks detected:",
    practicalBlocks.map(
      (block) => ({
        day:
          block.day,

        start:
          block.startSlot
            .startTime,

        end:
          block.secondSlot
            .endTime,
      })
    )
  );

  /*
   * =======================================================
   * 4. LOAD SUBJECTS
   * =======================================================
   */

  const subjects =
    await Subject.find({
      department:
        departmentId,

      semester: {
        $in: semesters.map(
          (semester) =>
            semester._id
        ),
      },
    }).populate(
      "faculty"
    );

  /*
   * =======================================================
   * 5. LOAD FACULTY
   * =======================================================
   */

  const faculty =
    await Faculty.find({
      department:
        departmentId,
    });

  /*
   * =======================================================
   * 6. LOAD ROOMS
   * =======================================================
   */

  const rooms =
    await Room.find({
      department:
        departmentId,
    });

  const labs =
    rooms.filter(
      (room) =>
        room.type ===
        "LAB"
    );

  const classrooms =
    rooms.filter(
      (room) =>
        room.type ===
        "CLASSROOM"
    );

  if (
    labs.length < 4
  ) {
    throw new Error(
      `Master timetable requires at least 4 laboratories. Found ${labs.length}.`
    );
  }

  if (
    classrooms.length === 0
  ) {
    throw new Error(
      "No classrooms are available for lecture scheduling."
    );
  }

  /*
   * =======================================================
   * 7. LOAD/CREATE BATCHES
   * =======================================================
   */

  const batchesBySemester =
    new Map();

  for (
    const semester of
      semesters
  ) {
    const config =
      SEMESTER_CONFIG[
        semester.number
      ];

    if (!config) {
      throw new Error(
        `No master timetable configuration exists for Semester ${semester.number}.`
      );
    }

    const batches =
      await ensureBatches(
        semester,
        config
      );

    if (
      batches.length !== 4
    ) {
      throw new Error(
        `Semester ${semester.number} must contain exactly 4 active practical batches.`
      );
    }

    batchesBySemester.set(
      String(
        semester._id
      ),
      batches
    );
  }

  /*
   * =======================================================
   * 8. AVAILABILITY
   * =======================================================
   */

  const resourceIds = [
    ...faculty.map(
      (item) =>
        item._id
    ),

    ...rooms.map(
      (item) =>
        item._id
    ),
  ];

  const availabilityRecords =
    await Availability.find({
      resourceId: {
        $in: resourceIds,
      },
    }).lean();

  const availability =
    buildAvailabilityMap(
      availabilityRecords
    );

  /*
   * =======================================================
   * 9. GROUP SUBJECTS
   * =======================================================
   */

  const subjectsBySemester =
    new Map();

  for (
    const semester of
      semesters
  ) {
    subjectsBySemester.set(
      String(
        semester._id
      ),
      subjects.filter(
        (subject) =>
          String(
            subject.semester
          ) ===
          String(
            semester._id
          )
      )
    );
  }

  /*
   * =======================================================
   * 10. GLOBAL SCHEDULES
   * =======================================================
   *
   * These are shared across Sem 3,
   * Sem 5 and Sem 7.
   */

  const facultySchedule =
    new Set();

  const roomSchedule =
    new Set();

  const batchSchedule =
    new Set();

  /*
   * Semester-wide schedule:
   *
   * fixed activities
   * constrained lectures
   * remaining lectures
   */
  const semesterSchedule =
    new Set();

  /*
   * Separate practical union:
   *
   * practical periods for a semester.
   *
   * This prevents lectures from being
   * placed while a semester has any
   * batch in practical.
   */
  const practicalUnionSchedule =
    new Set();

  const entries = [];

  /*
   * Number of lecture hours already
   * scheduled for each subject.
   */
  const lectureHoursScheduled =
    new Map();

  /*
   * =======================================================
   * 11. FIXED ACTIVITIES FIRST
   * =======================================================
   */

  reserveFixedActivities({
    semesters,

    practicalBlocks,

    semesterSchedule,

    entries,
  });

  /*
   * =======================================================
   * 12. CONSTRAINED LECTURES FIRST
   * =======================================================
   *
   * This is the important change.
   *
   * Example:
   *
   * Discrete Mathematics
   * facultyCount = 1
   *
   * It gets scheduled BEFORE practicals
   * consume its only faculty member.
   * =======================================================
   */

  console.log(
    "Scheduling constrained lectures first..."
  );

  scheduleLectures({
    phase: "CONSTRAINED",

    semesters,

    subjectsBySemester,

    batchesBySemester,

    faculty,

    classrooms,

    availability,

    timeSlots,

    practicalUnionSchedule,

    semesterSchedule,

    facultySchedule,

    roomSchedule,

    entries,

    lectureHoursScheduled,
  });

  /*
   * =======================================================
   * 13. BUILD PRACTICAL TASKS
   * =======================================================
   */

  const practicalTasks =
    buildPracticalTasks({
      semesters,

      subjectsBySemester,

      batchesBySemester,

      faculty,
    });

  /*
   * Add labs to every task.
   */
  for (
    const task of
      practicalTasks
  ) {
    task.labs = labs;
  }

  /*
   * =======================================================
   * 14. GLOBAL PRACTICAL SCHEDULING
   * =======================================================
   */

  schedulePracticals({
    tasks:
      practicalTasks,

    practicalBlocks,

    availability,

    facultySchedule,

    roomSchedule,

    batchSchedule,

    semesterSchedule,

    practicalUnionSchedule,

    entries,
  });

  /*
   * =======================================================
   * 15. REMAINING LECTURES
   * =======================================================
   *
   * At this stage:
   *
   * - fixed activities exist
   * - constrained lectures exist
   * - practicals exist
   *
   * Remaining lecture subjects use
   * whatever valid capacity remains.
   * =======================================================
   */

  console.log(
    "Scheduling remaining lectures..."
  );

  scheduleLectures({
    phase: "REMAINING",

    semesters,

    subjectsBySemester,

    batchesBySemester,

    faculty,

    classrooms,

    availability,

    timeSlots,

    practicalUnionSchedule,

    semesterSchedule,

    facultySchedule,

    roomSchedule,

    entries,

    lectureHoursScheduled,
  });

  /*
   * =======================================================
   * 16. FINAL VALIDATION
   * =======================================================
   */

  if (!entries.length) {
    throw new Error(
      "Master timetable generation produced no entries."
    );
  }

  validateEntries({
    entries,

    timeSlots,
  });

  /*
   * =======================================================
   * 17. SUMMARY
   * =======================================================
   */

  const practicalEntries =
    entries.filter(
      (entry) =>
        entry.entryType ===
        "PRACTICAL"
    );

  const lectureEntries =
    entries.filter(
      (entry) =>
        entry.entryType ===
          "LECTURE" ||
        entry.entryType ===
          "TUTORIAL"
    );

  const activityEntries =
    entries.filter(
      (entry) =>
        [
          "LIBRARY",
          "MENTOR",
          "PROJECT",
        ].includes(
          entry.entryType
        )
    );

  console.log(
    "MASTER TIMETABLE GENERATED SUCCESSFULLY",
    {
      semesters:
        semesters.map(
          (semester) =>
            semester.number
        ),

      totalEntries:
        entries.length,

      practicalEntries:
        practicalEntries.length,

      lectureEntries:
        lectureEntries.length,

      activityEntries:
        activityEntries.length,
    }
  );

  /*
   * =======================================================
   * RETURN
   * =======================================================
   */

  return {
    entries,

    semesters,

    batchesBySemester,
  };
}

/*
 * =========================================================
 * EXPORT
 * =========================================================
 */

module.exports = {
  generateMasterTimetable,

  SEMESTER_CONFIG,
};