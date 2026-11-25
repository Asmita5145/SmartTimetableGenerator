const TimeSlot = require("../models/TimeSlot");
const Subject = require("../models/Subject");
const Faculty = require("../models/Faculty");
const Room = require("../models/Room");
const Batch = require("../models/Batch");
const Availability = require("../models/Availability");

const DAY_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

const SEMESTER_CLASSROOM_MAP = {
  3: "CR18",
  5: "CR56",
  7: "CR57",
};

const idOf = (value) =>
  value ? String(value._id || value) : null;

const resourceKey = (resourceId, day, slotId) =>
  `${String(resourceId)}_${day}_${String(slotId)}`;

const semesterKey = (day, slotId) =>
  `${day}_${String(slotId)}`;

/*
 * --------------------------------------------------
 * BASIC HELPERS
 * --------------------------------------------------
 */

function normalizeId(value) {
  return value ? String(value._id || value) : null;
}

function getEntryType(entry, subject) {
  if (entry.entryType) {
    return String(entry.entryType).toUpperCase();
  }

  if (
    subject &&
    String(subject.type || "").toUpperCase() ===
      "PRACTICAL"
  ) {
    return "PRACTICAL";
  }

  return "LECTURE";
}

function isPractical(entryType) {
  return entryType === "PRACTICAL";
}

function isSemesterWide(entryType) {
  return [
    "LECTURE",
    "THEORY",
    "TUTORIAL",
    "MDM",
    "LIBRARY",
    "APTITUDE",
    "MENTOR",
    "PROJECT",
    "ACTIVITY",
  ].includes(entryType);
}

function isFixedActivity(entryType) {
  return [
    "MDM",
    "LIBRARY",
    "APTITUDE",
    "MENTOR",
    "PROJECT",
    "ACTIVITY",
  ].includes(entryType);
}

function getSubjectFacultyIds(subject) {
  if (!subject) {
    return [];
  }

  const facultyValue =
    subject.faculty ||
    subject.faculties ||
    [];

  const values = Array.isArray(facultyValue)
    ? facultyValue
    : [facultyValue];

  return values
    .map(normalizeId)
    .filter(Boolean);
}

function isConsecutive(slots) {
  if (!slots || slots.length !== 2) {
    return false;
  }

  return (
    slots[0].day === slots[1].day &&
    slots[1].slotNumber ===
      slots[0].slotNumber + 1
  );
}

function getSortedSlots(slots) {
  return [...slots].sort((a, b) => {
    const dayA =
      DAY_ORDER.indexOf(a.day);

    const dayB =
      DAY_ORDER.indexOf(b.day);

    if (dayA !== dayB) {
      return dayA - dayB;
    }

    return (
      Number(a.slotNumber || 0) -
      Number(b.slotNumber || 0)
    );
  });
}

function getEntrySlotIds(entry) {
  if (!Array.isArray(entry.slotIds)) {
    return [];
  }

  return [
    ...new Set(
      entry.slotIds.map(String)
    ),
  ];
}

/*
 * --------------------------------------------------
 * AVAILABILITY
 * --------------------------------------------------
 */

async function buildAvailabilityMap() {
  const records =
    await Availability.find({}).lean();

  const map = new Map();

  for (const record of records) {
    const resourceId =
      String(record.resourceId);

    const key =
      `${record.resourceType}_${resourceId}`;

    if (!map.has(key)) {
      map.set(key, new Map());
    }

    map.get(key).set(
      record.day,
      new Set(
        (record.availableSlots || [])
          .map(String)
      )
    );
  }

  return map;
}

function isResourceAvailable(
  availabilityMap,
  resourceType,
  resourceId,
  day,
  slotIds
) {
  if (!resourceId) {
    return true;
  }

  const key =
    `${resourceType}_${String(resourceId)}`;

  /*
   * No availability record means unrestricted.
   */
  if (!availabilityMap.has(key)) {
    return true;
  }

  const resourceAvailability =
    availabilityMap.get(key);

  /*
   * A configured resource without a record
   * for a particular day is unavailable.
   */
  if (
    !resourceAvailability.has(day)
  ) {
    return false;
  }

  const allowedSlots =
    resourceAvailability.get(day);

  return slotIds.every((slotId) =>
    allowedSlots.has(String(slotId))
  );
}

/*
 * --------------------------------------------------
 * VALIDATION
 * --------------------------------------------------
 */

async function validateCseSemesterTimetable({
  entries,
  batches = [],
  studentCount,
  semesterNumber = null,
  workingDays = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
  ],
  subjects = [],
}) {
  const conflicts = [];

  const list = Array.isArray(entries)
    ? entries
    : [];

  /*
   * ------------------------------------------------
   * EMPTY TIMETABLE
   * ------------------------------------------------
   */

  if (!list.length) {
    return {
      isValid: false,

      conflicts: [
        {
          type: "EMPTY_TIMETABLE",
          message:
            "The semester timetable has no entries.",
        },
      ],

      summary: {
        totalEntries: 0,
        theoryEntries: 0,
        practicalEntries: 0,
        fixedEntries: 0,
        totalConflicts: 1,
      },
    };
  }

  /*
   * ------------------------------------------------
   * LOAD REFERENCED IDS
   * ------------------------------------------------
   */

  const slotIds = [
    ...new Set(
      list.flatMap((entry) =>
        getEntrySlotIds(entry)
      )
    ),
  ];

  const subjectIds = [
    ...new Set(
      list
        .map((entry) =>
          normalizeId(entry.subject)
        )
        .filter(Boolean)
    ),
  ];

  const facultyIds = [
    ...new Set(
      list
        .map((entry) =>
          normalizeId(entry.faculty)
        )
        .filter(Boolean)
    ),
  ];

  const roomIds = [
    ...new Set(
      list
        .map((entry) =>
          normalizeId(entry.room)
        )
        .filter(Boolean)
    ),
  ];

  const batchIds = [
    ...new Set(
      [
        ...list.map((entry) =>
          normalizeId(entry.batch)
        ),
        ...batches.map(normalizeId),
      ].filter(Boolean)
    ),
  ];

  /*
   * ------------------------------------------------
   * LOAD DATABASE DOCUMENTS
   * ------------------------------------------------
   */

  const [
    timeSlotDocs,
    subjectDocs,
    facultyDocs,
    roomDocs,
    batchDocs,
  ] = await Promise.all([
    TimeSlot.find({
      _id: { $in: slotIds },
    }).lean(),

    Subject.find({
      _id: { $in: subjectIds },
    }).lean(),

    Faculty.find({
      _id: { $in: facultyIds },
    }).lean(),

    Room.find({
      _id: { $in: roomIds },
    }).lean(),

    Batch.find({
      _id: { $in: batchIds },
    }).lean(),
  ]);

  const slotMap = new Map(
    timeSlotDocs.map((slot) => [
      String(slot._id),
      slot,
    ])
  );

  const subjectMap = new Map(
    subjectDocs.map((subject) => [
      String(subject._id),
      subject,
    ])
  );

  const facultyMap = new Map(
    facultyDocs.map((faculty) => [
      String(faculty._id),
      faculty,
    ])
  );

  const roomMap = new Map(
    roomDocs.map((room) => [
      String(room._id),
      room,
    ])
  );

  const batchMap = new Map(
    batchDocs.map((batch) => [
      String(batch._id),
      batch,
    ])
  );

  /*
   * ------------------------------------------------
   * AVAILABILITY
   * ------------------------------------------------
   */

  const availabilityMap =
    await buildAvailabilityMap();

  /*
   * ------------------------------------------------
   * OCCUPANCY MAPS
   * ------------------------------------------------
   */

  const semesterBusy = new Set();

  /*
   * Any practical for any batch occupies the
   * semester-wide student stream.
   */
  const practicalUnionBusy = new Set();

  const facultyBusy = new Set();

  const roomBusy = new Set();

  const batchBusy = new Set();

  /*
   * Detect exact duplicate entries.
   */
  const duplicateEntryKeys = new Set();

  /*
   * ------------------------------------------------
   * WORKLOAD TRACKING
   * ------------------------------------------------
   */

  const generatedTheoryBySubject =
    new Map();

  const generatedPracticalBySubject =
    new Map();

  const generatedPracticalByBatch =
    new Map();

  /*
   * ------------------------------------------------
   * ENTRY VALIDATION
   * ------------------------------------------------
   */

  for (
    let index = 0;
    index < list.length;
    index++
  ) {
    const entry = list[index];

    const label =
      `Entry ${index + 1}`;

    const subject =
      subjectMap.get(
        normalizeId(entry.subject)
      );

    const faculty =
      facultyMap.get(
        normalizeId(entry.faculty)
      );

    const room =
      roomMap.get(
        normalizeId(entry.room)
      );

    const batch =
      batchMap.get(
        normalizeId(entry.batch)
      );

    const entryType =
      getEntryType(
        entry,
        subject
      );

    /*
     * ----------------------------------------------
     * ENTRY TYPE VALIDATION
     * ----------------------------------------------
     */

    const validEntryTypes = [
      "LECTURE",
      "THEORY",
      "PRACTICAL",
      "TUTORIAL",
      "MDM",
      "LIBRARY",
      "APTITUDE",
      "MENTOR",
      "PROJECT",
      "ACTIVITY",
    ];

    if (
      !validEntryTypes.includes(
        entryType
      )
    ) {
      conflicts.push({
        type: "INVALID_ENTRY_TYPE",
        message:
          `${label}: invalid entry type ${entryType}.`,
      });
    }

    /*
     * ----------------------------------------------
     * SUBJECT REFERENCE
     * ----------------------------------------------
     */

    if (
      !subject &&
      entry.subject
    ) {
      conflicts.push({
        type: "INVALID_SUBJECT",
        message:
          `${label}: referenced subject was not found.`,
      });
    }

    /*
     * ----------------------------------------------
     * SLOT VALIDATION
     * ----------------------------------------------
     */

    const entrySlotIds =
      getEntrySlotIds(entry);

    if (!entrySlotIds.length) {
      conflicts.push({
        type: "MISSING_SLOTS",
        message:
          `${label}: no time slots were assigned.`,
      });

      continue;
    }

    /*
     * Duplicate slot IDs inside one entry
     */
    if (
      entry.slotIds.length !==
      entrySlotIds.length
    ) {
      conflicts.push({
        type: "DUPLICATE_ENTRY_SLOTS",
        message:
          `${label}: the same time slot appears more than once.`,
      });
    }

    const occupiedSlots =
      entrySlotIds
        .map((slotId) =>
          slotMap.get(slotId)
        )
        .filter(Boolean);

    /*
     * Missing TimeSlot references
     */
    if (
      occupiedSlots.length !==
      entrySlotIds.length
    ) {
      conflicts.push({
        type: "INVALID_TIME_SLOT",
        message:
          `${label}: one or more time slots were not found.`,
      });

      continue;
    }

    const sortedSlots =
      getSortedSlots(
        occupiedSlots
      );

    /*
     * ----------------------------------------------
     * DAY VALIDATION
     * ----------------------------------------------
     */

    const days = [
      ...new Set(
        sortedSlots.map(
          (slot) => slot.day
        )
      ),
    ];

    if (days.length !== 1) {
      conflicts.push({
        type: "MULTIPLE_DAYS",
        message:
          `${label}: an entry cannot span multiple days.`,
      });

      continue;
    }

    const day = days[0];

    if (
      !workingDays.includes(day)
    ) {
      conflicts.push({
        type: "INVALID_WORKING_DAY",
        message:
          `${label}: ${day} is not a working day.`,
      });
    }

    /*
     * ----------------------------------------------
     * BREAK VALIDATION
     * ----------------------------------------------
     */

    if (
      sortedSlots.some(
        (slot) => slot.isBreak
      )
    ) {
      conflicts.push({
        type: "BREAK_SLOT",
        message:
          `${label}: entry overlaps a break.`,
      });
    }

    /*
     * ----------------------------------------------
     * DURATION VALIDATION
     * ----------------------------------------------
     */

    const duration =
      Number(entry.durationHours);

    if (
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      conflicts.push({
        type: "INVALID_DURATION",
        message:
          `${label}: duration must be greater than zero.`,
      });
    }

    /*
     * Actual occupied slot count.
     */
    const actualHours =
      sortedSlots.length;

    /*
     * If durationHours exists, it must match
     * the number of occupied one-hour slots.
     */
    if (
      Number.isFinite(duration) &&
      duration !== actualHours
    ) {
      conflicts.push({
        type: "DURATION_MISMATCH",
        message:
          `${label}: duration is ${duration} hour(s), but ${actualHours} slot(s) are assigned.`,
      });
    }

    /*
     * Practical = exactly two consecutive slots.
     */
    if (
      isPractical(entryType)
    ) {
      if (
        sortedSlots.length !== 2
      ) {
        conflicts.push({
          type: "PRACTICAL_DURATION",
          message:
            `${label}: practical must occupy exactly two slots.`,
        });
      }

      if (
        sortedSlots.length === 2 &&
        !isConsecutive(sortedSlots)
      ) {
        conflicts.push({
          type: "NON_CONSECUTIVE_PRACTICAL",
          message:
            `${label}: practical slots must be consecutive.`,
        });
      }
    }

    /*
     * Theory/fixed activities = one slot.
     */
    if (
      isSemesterWide(entryType) &&
      sortedSlots.length !== 1
    ) {
      conflicts.push({
        type: "THEORY_DURATION",
        message:
          `${label}: theory/fixed activity must occupy exactly one slot.`,
      });
    }

    /*
     * ----------------------------------------------
     * DUPLICATE ENTRY DETECTION
     * ----------------------------------------------
     */

    const duplicateKey = [
      entryType,
      normalizeId(entry.subject) || "NO_SUBJECT",
      normalizeId(entry.faculty) || "NO_FACULTY",
      normalizeId(entry.room) || "NO_ROOM",
      normalizeId(entry.batch) || "NO_BATCH",
      day,
      ...sortedSlots
        .map((slot) => String(slot._id))
        .sort(),
    ].join("|");

    if (
      duplicateEntryKeys.has(
        duplicateKey
      )
    ) {
      conflicts.push({
        type: "DUPLICATE_ENTRY",
        message:
          `${label}: duplicate timetable entry detected.`,
      });
    }

    duplicateEntryKeys.add(
      duplicateKey
    );

    /*
     * ----------------------------------------------
     * FACULTY VALIDATION
     * ----------------------------------------------
     */

    if (
      !faculty &&
      (
        isSemesterWide(entryType) ||
        isPractical(entryType)
      )
    ) {
      /*
       * Fixed activities may intentionally have
       * no faculty, so only report missing faculty
       * for subject teaching entries.
       */
      if (
        subject ||
        isPractical(entryType) ||
        entryType === "LECTURE" ||
        entryType === "THEORY" ||
        entryType === "TUTORIAL"
      ) {
        conflicts.push({
          type: "FACULTY_REQUIRED",
          message:
            `${label}: teaching entry requires a faculty member.`,
        });
      }
    }

    /*
     * ----------------------------------------------
     * PRACTICAL VALIDATION
     * ----------------------------------------------
     */

    if (
      isPractical(entryType)
    ) {
      if (!batch) {
        conflicts.push({
          type: "BATCH_REQUIRED",
          message:
            `${label}: practical requires a batch.`,
        });
      }

      if (!room) {
        conflicts.push({
          type: "PRACTICAL_ROOM_REQUIRED",
          message:
            `${label}: practical requires a laboratory.`,
        });
      } else if (
        room.type !== "LAB"
      ) {
        conflicts.push({
          type: "PRACTICAL_ROOM",
          message:
            `${label}: practical must use a laboratory.`,
        });
      }

      if (
        subject &&
        String(subject.type || "")
          .toUpperCase() !==
          "PRACTICAL"
      ) {
        conflicts.push({
          type: "SUBJECT_TYPE",
          message:
            `${label}: practical references a non-practical subject.`,
        });
      }

      if (
        room &&
        batch &&
        Number(room.capacity || 0) <
          Number(batch.studentCount || 0)
      ) {
        conflicts.push({
          type: "LAB_CAPACITY",
          message:
            `${label}: lab capacity ${room.capacity} is below batch ${batch.name || batch.code} strength ${batch.studentCount}.`,
        });
      }

      /*
       * Track practical workload per subject.
       */
      if (subject) {
        const subjectId =
          String(subject._id);

        generatedPracticalBySubject.set(
          subjectId,
          (
            generatedPracticalBySubject.get(
              subjectId
            ) || 0
          ) + sortedSlots.length
        );
      }

      /*
       * Track practical workload per batch.
       */
      if (batch) {
        const batchId =
          String(batch._id);

        generatedPracticalByBatch.set(
          batchId,
          (
            generatedPracticalByBatch.get(
              batchId
            ) || 0
          ) + sortedSlots.length
        );
      }
    }

    /*
     * ----------------------------------------------
     * THEORY / FIXED ACTIVITY VALIDATION
     * ----------------------------------------------
     */

    if (
      isSemesterWide(entryType)
    ) {
      if (!room) {
        conflicts.push({
          type: "THEORY_ROOM_REQUIRED",
          message:
            `${label}: theory/fixed activity requires a classroom.`,
        });
      } else if (
        room.type !== "CLASSROOM"
      ) {
        conflicts.push({
          type: "THEORY_ROOM",
          message:
            `${label}: theory/fixed activity must use a classroom.`,
        });
      }

      if (
        room &&
        studentCount != null &&
        Number(room.capacity || 0) <
          Number(studentCount)
      ) {
        conflicts.push({
          type: "ROOM_CAPACITY",
          message:
            `${label}: room capacity ${room.capacity} is below semester strength ${studentCount}.`,
        });
      }

      /*
       * Practical subjects cannot appear as
       * semester-wide theory.
       */
      if (
        subject &&
        String(subject.type || "")
          .toUpperCase() ===
          "PRACTICAL"
      ) {
        conflicts.push({
          type: "SUBJECT_TYPE",
          message:
            `${label}: practical subject cannot be scheduled as theory.`,
        });
      }

      /*
       * IMPORTANT:
       * Only actual teaching entries count toward
       * theory workload.
       *
       * Library/Aptitude/Mentor/etc. do NOT count
       * as curriculum theory.
       */
      if (
        subject &&
        [
          "LECTURE",
          "THEORY",
          "TUTORIAL",
        ].includes(entryType)
      ) {
        const subjectId =
          String(subject._id);

        generatedTheoryBySubject.set(
          subjectId,
          (
            generatedTheoryBySubject.get(
              subjectId
            ) || 0
          ) + sortedSlots.length
        );
      }
    }

    /*
     * ----------------------------------------------
     * SUBJECT/FACULTY CONSISTENCY
     * ----------------------------------------------
     */

    if (
      subject &&
      faculty &&
      [
        "LECTURE",
        "THEORY",
        "TUTORIAL",
        "PRACTICAL",
      ].includes(entryType)
    ) {
      const allowedFacultyIds =
        getSubjectFacultyIds(
          subject
        );

      if (
        allowedFacultyIds.length &&
        !allowedFacultyIds.includes(
          String(faculty._id)
        )
      ) {
        conflicts.push({
          type: "FACULTY_SUBJECT_MISMATCH",
          message:
            `${label}: assigned faculty ${faculty.name || faculty.facultyName || faculty.code || faculty._id} is not assigned to subject ${subject.name || subject.subjectName || subject.code}.`,
        });
      }
    }

    /*
     * ----------------------------------------------
     * RESOURCE CONFLICTS
     * ----------------------------------------------
     */

    for (
      const slot of sortedSlots
    ) {
      const slotId =
        String(slot._id);

      const semesterSlotKey =
        semesterKey(
          day,
          slotId
        );

      /*
       * --------------------------------------------
       * SEMESTER CONFLICTS
       * --------------------------------------------
       */

      if (
        isSemesterWide(entryType) &&
        semesterBusy.has(
          semesterSlotKey
        )
      ) {
        conflicts.push({
          type: "SEMESTER_CONFLICT",
          message:
            `${label}: semester-wide activity is double-booked.`,
        });
      }

      if (
        isSemesterWide(entryType) &&
        practicalUnionBusy.has(
          semesterSlotKey
        )
      ) {
        conflicts.push({
          type: "SEMESTER_CONFLICT",
          message:
            `${label}: semester-wide activity overlaps a practical.`,
        });
      }

      if (
        isPractical(entryType) &&
        semesterBusy.has(
          semesterSlotKey
        )
      ) {
        conflicts.push({
          type: "SEMESTER_CONFLICT",
          message:
            `${label}: practical overlaps a semester-wide activity.`,
        });
      }

      /*
       * Mark semester-wide occupancy.
       */
      if (
        isSemesterWide(entryType)
      ) {
        semesterBusy.add(
          semesterSlotKey
        );
      }

      /*
       * Mark practical union occupancy.
       */
      if (
        isPractical(entryType)
      ) {
        practicalUnionBusy.add(
          semesterSlotKey
        );
      }

      /*
       * --------------------------------------------
       * FACULTY CONFLICT
       * --------------------------------------------
       */

      if (faculty) {
        const key =
          resourceKey(
            faculty._id,
            day,
            slotId
          );

        if (
          facultyBusy.has(key)
        ) {
          conflicts.push({
            type: "FACULTY_CONFLICT",
            message:
              `${label}: faculty is double-booked.`,
          });
        }

        facultyBusy.add(key);

        /*
         * Faculty availability.
         */
        if (
          !isResourceAvailable(
            availabilityMap,
            "FACULTY",
            faculty._id,
            day,
            [slotId]
          )
        ) {
          conflicts.push({
            type: "FACULTY_UNAVAILABLE",
            message:
              `${label}: faculty is unavailable on ${day}, slot ${slot.slotNumber}.`,
          });
        }
      }

      /*
       * --------------------------------------------
       * ROOM CONFLICT
       * --------------------------------------------
       */

      if (room) {
        const key =
          resourceKey(
            room._id,
            day,
            slotId
          );

        if (
          roomBusy.has(key)
        ) {
          conflicts.push({
            type: "ROOM_CONFLICT",
            message:
              `${label}: room/lab is double-booked.`,
          });
        }

        roomBusy.add(key);

        /*
         * Room availability.
         */
        if (
          !isResourceAvailable(
            availabilityMap,
            "ROOM",
            room._id,
            day,
            [slotId]
          )
        ) {
          conflicts.push({
            type: "ROOM_UNAVAILABLE",
            message:
              `${label}: room is unavailable on ${day}, slot ${slot.slotNumber}.`,
          });
        }
      }

      /*
       * --------------------------------------------
       * BATCH CONFLICT
       * --------------------------------------------
       */

      if (
        batch &&
        isPractical(entryType)
      ) {
        const key =
          resourceKey(
            batch._id,
            day,
            slotId
          );

        if (
          batchBusy.has(key)
        ) {
          conflicts.push({
            type: "BATCH_CONFLICT",
            message:
              `${label}: batch ${batch.name || batch.code} is double-booked.`,
          });
        }

        batchBusy.add(key);
      }
    }
  }

  /*
   * --------------------------------------------------
   * SUBJECT LIST FOR WORKLOAD VALIDATION
   * --------------------------------------------------
   *
   * Prefer explicitly supplied subjects.
   * Otherwise use subjects referenced by entries.
   */

  const curriculumSubjects =
    Array.isArray(subjects) &&
    subjects.length
      ? subjects
      : subjectDocs;

  /*
   * --------------------------------------------------
   * EXACT SUBJECT-WISE WORKLOAD VALIDATION
   * --------------------------------------------------
   */

  let theoryRequired = 0;
  let practicalRequiredPerBatch = 0;

  for (
    const subject of curriculumSubjects
  ) {
    const subjectId =
      normalizeId(subject);

    if (!subjectId) {
      continue;
    }

    const subjectType =
      String(
        subject.type || ""
      ).toUpperCase();

    /*
     * ----------------------------------------------
     * THEORY SUBJECT
     * ----------------------------------------------
     */

    if (
      subjectType !== "PRACTICAL"
    ) {
      const requiredHours =
        Number(
          subject.weeklyHours || 0
        );

      theoryRequired +=
        requiredHours;

      const generated =
        generatedTheoryBySubject.get(
          subjectId
        ) || 0;

      if (
        generated < requiredHours
      ) {
        conflicts.push({
          type: "SUBJECT_WORKLOAD_INCOMPLETE",
          message:
            `Subject ${subject.code || subject.name || subjectId} requires ${requiredHours} theory hour(s) but only ${generated} were generated.`,
        });
      }

      if (
        generated > requiredHours
      ) {
        conflicts.push({
          type: "SUBJECT_WORKLOAD_EXCEEDED",
          message:
            `Subject ${subject.code || subject.name || subjectId} requires ${requiredHours} theory hour(s) but ${generated} were generated.`,
        });
      }
    }

    /*
     * ----------------------------------------------
     * PRACTICAL SUBJECT
     * ----------------------------------------------
     */

    if (
      subjectType === "PRACTICAL"
    ) {
      const requiredHours =
        Number(
          subject.practicalHours ??
            subject.weeklyHours ??
            0
        );

      practicalRequiredPerBatch +=
        requiredHours;

      const generated =
        generatedPracticalBySubject.get(
          subjectId
        ) || 0;

      /*
       * Do not compare total generated practical
       * hours directly with per-batch requirement
       * because the same practical occurs once
       * for every batch.
       *
       * Per-batch validation below handles this.
       */

      if (
        generated === 0 &&
        requiredHours > 0
      ) {
        conflicts.push({
          type: "PRACTICAL_SUBJECT_MISSING",
          message:
            `Practical subject ${subject.code || subject.name || subjectId} has no generated practical entries.`,
        });
      }
    }
  }

  /*
   * --------------------------------------------------
   * PER-BATCH PRACTICAL WORKLOAD
   * --------------------------------------------------
   */

  for (
    const batchValue of batches
  ) {
    const batch =
      batchMap.get(
        normalizeId(batchValue)
      ) || batchValue;

    const batchId =
      normalizeId(batch);

    if (!batchId) {
      continue;
    }

    const generatedForBatch =
      generatedPracticalByBatch.get(
        batchId
      ) || 0;

    if (
      generatedForBatch <
      practicalRequiredPerBatch
    ) {
      conflicts.push({
        type: "PRACTICAL_WORKLOAD_INCOMPLETE",
        message:
          `Batch ${batch.name || batch.code || batchId} requires ${practicalRequiredPerBatch} practical hour(s) but has ${generatedForBatch}.`,
      });
    }

    if (
      generatedForBatch >
      practicalRequiredPerBatch
    ) {
      conflicts.push({
        type: "PRACTICAL_WORKLOAD_EXCEEDED",
        message:
          `Batch ${batch.name || batch.code || batchId} requires ${practicalRequiredPerBatch} practical hour(s) but has ${generatedForBatch}.`,
      });
    }
  }

  /*
   * --------------------------------------------------
   * DESIGNATED CLASSROOM VALIDATION
   * --------------------------------------------------
   *
   * This is activated when semesterNumber is passed.
   *
   * Sem 3 -> CR18
   * Sem 5 -> CR56
   * Sem 7 -> CR57
   */

  const designatedClassroom =
    SEMESTER_CLASSROOM_MAP[
      Number(semesterNumber)
    ];

  if (
    designatedClassroom
  ) {
    for (
      let index = 0;
      index < list.length;
      index++
    ) {
      const entry = list[index];

      const entryType =
        getEntryType(
          entry,
          subjectMap.get(
            normalizeId(
              entry.subject
            )
          )
        );

      if (
        !isSemesterWide(entryType)
      ) {
        continue;
      }

      const room =
        roomMap.get(
          normalizeId(
            entry.room
          )
        );

      if (!room) {
        continue;
      }

      const roomNumber =
        String(
          room.roomNumber || ""
        ).toUpperCase();

      if (
        roomNumber !==
        designatedClassroom
      ) {
        conflicts.push({
          type: "WRONG_DESIGNATED_CLASSROOM",
          message:
            `Entry ${index + 1}: Semester ${semesterNumber} must use ${designatedClassroom} for theory/fixed activities, but ${roomNumber || "another room"} was assigned.`,
        });
      }
    }
  }

  /*
   * --------------------------------------------------
   * BATCH REFERENCE VALIDATION
   * --------------------------------------------------
   */

  for (
    const entry of list
  ) {
    const entryType =
      getEntryType(
        entry,
        subjectMap.get(
          normalizeId(
            entry.subject
          )
        )
      );

    if (
      isPractical(entryType) &&
      !normalizeId(entry.batch)
    ) {
      /*
       * Already reported above, but this prevents
       * silent practical entries without batches.
       */
      continue;
    }

    /*
     * Theory/fixed entries should normally NOT
     * have a batch because they are semester-wide.
     */
    if (
      isSemesterWide(entryType) &&
      normalizeId(entry.batch)
    ) {
      conflicts.push({
        type: "UNEXPECTED_BATCH",
        message:
          `Semester-wide entry ${entry.subjectCode || entry.subjectName || entry.entryType} should not be assigned to a specific batch.`,
      });
    }
  }

  /*
   * --------------------------------------------------
   * SUMMARY
   * --------------------------------------------------
   */

  const theoryEntries =
    list.filter((entry) => {
      const subject =
        subjectMap.get(
          normalizeId(
            entry.subject
          )
        );

      return [
        "LECTURE",
        "THEORY",
        "TUTORIAL",
      ].includes(
        getEntryType(
          entry,
          subject
        )
      );
    });

  const practicalEntries =
    list.filter((entry) => {
      const subject =
        subjectMap.get(
          normalizeId(
            entry.subject
          )
        );

      return (
        getEntryType(
          entry,
          subject
        ) === "PRACTICAL"
      );
    });

  const fixedEntries =
    list.filter((entry) => {
      const subject =
        subjectMap.get(
          normalizeId(
            entry.subject
          )
        );

      return isFixedActivity(
        getEntryType(
          entry,
          subject
        )
      );
    });

  const generatedTheoryHours =
    theoryEntries.reduce(
      (total, entry) =>
        total +
        getEntrySlotIds(entry).length,
      0
    );

  const generatedPracticalHours =
    practicalEntries.reduce(
      (total, entry) =>
        total +
        getEntrySlotIds(entry).length,
      0
    );

  const fixedActivityHours =
    fixedEntries.reduce(
      (total, entry) =>
        total +
        getEntrySlotIds(entry).length,
      0
    );

  return {
    isValid:
      conflicts.length === 0,

    conflicts,

    summary: {
      totalEntries:
        list.length,

      theoryEntries:
        theoryEntries.length,

      practicalEntries:
        practicalEntries.length,

      fixedEntries:
        fixedEntries.length,

      theoryRequired,

      generatedTheoryHours,

      practicalRequiredPerBatch,

      generatedPracticalHours,

      fixedActivityHours,

      totalConflicts:
        conflicts.length,
    },
  };
}

module.exports = {
  validateCseSemesterTimetable,
};