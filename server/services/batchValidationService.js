const { Batch, User, Semester, Subject } = require("../models");

/**
 * Expected batch configuration for DACOE Karad CSE:
 * Sem 3 (S.Y. B.Tech): S1, S2, S3, S4
 * Sem 5 (T.Y. B.Tech): T1, T2, T3, T4
 * Sem 7 (Final Year B.Tech): B1, B2, B3, B4
 */
const EXPECTED_BATCHES_BY_SEM = {
  3: ["S1", "S2", "S3", "S4"],
  5: ["T1", "T2", "T3", "T4"],
  7: ["B1", "B2", "B3", "B4"]
};

/**
 * Validates practical batches for given department and semesters
 * Checks:
 * - Expected batch count
 * - Batch names/codes (no S5, T5, B5, no mixing)
 * - Active batch records
 * - Batch semester reference
 * - Student assignments and batch validity
 * - Batch student strength & roll number ranges
 * - Batch-to-subject practical requirements
 */
const validateDepartmentBatches = async ({ departmentId, semesterNumbers = [3, 5, 7] }) => {
  const errors = [];
  const warnings = [];
  const batchSummary = {};

  const semesters = await Semester.find({
    department: departmentId,
    number: { $in: semesterNumbers }
  }).lean();

  if (!semesters.length) {
    errors.push("No semesters found for the selected department.");
    return { isValid: false, errors, warnings, batchSummary };
  }

  for (const sem of semesters) {
    const semNum = sem.number;
    const expected = EXPECTED_BATCHES_BY_SEM[semNum] || (sem.practicalBatches?.length ? sem.practicalBatches : ["B1", "B2", "B3", "B4"]);

    // Fetch active batches from database
    const batches = await Batch.find({
      semester: sem._id,
      isActive: { $ne: false }
    }).sort({ code: 1 }).lean();

    const actualCodes = batches.map((b) => b.code);

    batchSummary[semNum] = {
      semesterName: sem.name,
      expectedCodes: expected,
      actualCodes,
      batchCount: batches.length,
      expectedCount: expected.length,
      batches
    };

    // 1. Validate batch count
    if (batches.length === 0) {
      errors.push(`Semester ${semNum} (${sem.name}) has 0 active practical batches configured.`);
    } else if (batches.length !== expected.length) {
      warnings.push(`Semester ${semNum} has ${batches.length} batches (expected ${expected.length}: ${expected.join(", ")}).`);
    }

    // 2. Validate batch names / codes
    const missingExpected = expected.filter((c) => !actualCodes.includes(c));
    if (missingExpected.length > 0) {
      errors.push(`Semester ${semNum} is missing expected practical batch(es): ${missingExpected.join(", ")}.`);
    }

    // Check for invalid or mixed codes (e.g. S5, T5, B5, or B4 in Sem 3)
    const invalidCodes = actualCodes.filter((c) => !expected.includes(c));
    if (invalidCodes.length > 0) {
      errors.push(`Semester ${semNum} contains unexpected batch code(s): ${invalidCodes.join(", ")}. Expected only ${expected.join(", ")}.`);
    }

    // 3. Validate student strength and roll number ranges
    for (const b of batches) {
      if (!b.studentCount || b.studentCount <= 0) {
        errors.push(`Batch ${b.code} (Sem ${semNum}) has invalid student strength: ${b.studentCount}.`);
      }
      if (b.startRoll == null || b.endRoll == null || b.startRoll > b.endRoll) {
        errors.push(`Batch ${b.code} (Sem ${semNum}) has invalid roll number range: ${b.startRoll} to ${b.endRoll}.`);
      }
    }

    // 4. Validate student assignments in User collection
    const studentsInSem = await User.find({
      semester: sem._id,
      role: "STUDENT"
    }).select("name email batch rollNumber").lean();

    if (studentsInSem.length > 0) {
      for (const st of studentsInSem) {
        if (!st.batch) {
          warnings.push(`Student ${st.name} (${st.email}) in Semester ${semNum} has no practical batch assigned.`);
        } else if (!expected.includes(st.batch)) {
          errors.push(`Student ${st.name} (${st.email}) in Semester ${semNum} is assigned to invalid batch "${st.batch}".`);
        }
      }
    }

    // 5. Validate batch-to-subject practical requirements
    const practicalSubjects = await Subject.find({
      semester: sem._id,
      type: "PRACTICAL"
    }).lean();

    if (practicalSubjects.length > 0) {
      for (const sub of practicalSubjects) {
        if (!sub.weeklyHours || sub.weeklyHours <= 0) {
          warnings.push(`Practical subject "${sub.name}" (${sub.code}) in Semester ${semNum} has 0 weekly practical hours.`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    batchSummary
  };
};

module.exports = {
  EXPECTED_BATCHES_BY_SEM,
  validateDepartmentBatches
};
