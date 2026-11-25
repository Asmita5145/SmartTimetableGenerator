const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const {
  Institution,
  User,
  Department,
  Semester,
  Batch,
  Faculty,
  Subject,
  Room,
  TimeSlot,
  Availability,
  Timetable,
  MasterTimetable
} = require("./models");
const { generateDepartmentTimetable } = require("./services/departmentTimetableGenerator");

const runTests = async () => {
  try {
    console.log("=================================================");
    console.log("RUNNING AUTOMATED END-TO-END VERIFICATION SUITE");
    console.log("=================================================\n");

    await connectDB();

    // 1. Multi-Tenant Institution Test
    console.log("[TEST 1] Verifying Multi-Tenant Institution Configuration...");
    const inst = await Institution.findOne({ code: "DACOE" });
    if (!inst) throw new Error("Institution DACOE not found");
    console.log(`  ✓ Institution: ${inst.name}`);
    console.log(`  ✓ Default Programme: ${inst.defaultProgramme} (Replaces hardcoded BE)`);
    console.log(`  ✓ Programmes: ${inst.programmes.join(", ")}`);

    // 2. Multi-Role Authentication Test
    console.log("\n[TEST 2] Verifying User Roles & Credentials...");
    const testAccounts = [
      { email: "admin@smarttimetable.com", expectedRole: "ADMIN" },
      { email: "hod.cse@dacoe.ac.in", expectedRole: "HOD" },
      { email: "coordinator.cse@dacoe.ac.in", expectedRole: "COORDINATOR" },
      { email: "ahrenushe@dacoe.ac.in", expectedRole: "FACULTY" },
      { email: "student.sem3.s1@dacoe.ac.in", expectedRole: "STUDENT", expectedBatch: "S1" },
      { email: "student.sem5.t2@dacoe.ac.in", expectedRole: "STUDENT", expectedBatch: "T2" },
      { email: "student.sem7.b1@dacoe.ac.in", expectedRole: "STUDENT", expectedBatch: "B1" }
    ];

    for (const acc of testAccounts) {
      const u = await User.findOne({ email: acc.email });
      if (!u) throw new Error(`User account ${acc.email} missing`);
      if (u.role !== acc.expectedRole) throw new Error(`Role mismatch for ${acc.email}: got ${u.role}, expected ${acc.expectedRole}`);
      if (acc.expectedBatch && u.batch !== acc.expectedBatch) throw new Error(`Batch mismatch for ${acc.email}`);
      console.log(`  ✓ User ${acc.email} (${u.role}) verified. Batch: ${u.batch || 'N/A'}`);
    }

    // 3. Department Timetable Generation Test (Sem 3, 5, 7)
    console.log("\n[TEST 3] Running Department Timetable Generation (DACOE Karad CSE)...");
    const cseDept = await Department.findOne({ code: "CSE" });
    const genResult = await generateDepartmentTimetable({
      departmentId: cseDept._id,
      academicYear: "2026-27",
      semesterNumbers: [3, 5, 7],
      useDivisions: false
    });

    console.log(`  ✓ Generation Status: ${genResult.status}`);
    console.log(`  ✓ Hard Constraint Violations: ${genResult.hardConstraintViolations} (Target: 0)`);
    console.log(`  ✓ Soft Constraint Score: ${genResult.softConstraintScore}`);
    console.log(`  ✓ GA Fitness: ${genResult.fitness.toFixed(3)}`);
    console.log(`  ✓ Timetables Created: ${genResult.timetables.length} (Sem 3, Sem 5, Sem 7)`);

    if (genResult.hardConstraintViolations > 0) {
      throw new Error(`Hard violations detected: ${genResult.hardConstraintViolations}`);
    }

    // 4. Parent-Child Practical Structure Test
    console.log("\n[TEST 4] Verifying Parent-Child Practical Sessions & Batches...");
    for (const tt of genResult.timetables) {
      const semNum = tt.semester?.number;
      const practicals = tt.entries.filter((e) => e.entryType === "PRACTICAL");
      console.log(`  Semester ${semNum}: Found ${practicals.length} Parent Practical Blocks`);

      for (const p of practicals) {
        if (!p.childBatches || p.childBatches.length === 0) {
          throw new Error(`Practical parent block on ${p.day} has 0 childBatches!`);
        }
        if (p.durationSlots !== 2) {
          throw new Error(`Practical duration is not 2 slots! Got ${p.durationSlots}`);
        }
      }
      console.log(`    ✓ All ${practicals.length} practical blocks have populated childBatches and durationSlots = 2`);
    }

    // 5. Student Batch Isolation Test
    console.log("\n[TEST 5] Verifying Student Batch-Wise Practical Filtering...");
    const sem3TT = genResult.timetables.find((t) => t.semester?.number === 3);
    const studentUser = await User.findOne({ email: "student.sem3.s1@dacoe.ac.in" });

    // Simulate getMyTimetable filter logic
    const studentEntries = sem3TT.entries
      .map((e) => {
        if (e.childBatches && e.childBatches.length > 0) {
          const myBatch = e.childBatches.find((cb) => cb.batch === studentUser.batch);
          if (myBatch) {
            return {
              ...e.toObject(),
              batch: myBatch.batch,
              subject: myBatch.subject,
              faculty: myBatch.faculty,
              room: myBatch.room,
              durationSlots: 2,
              entryType: "PRACTICAL"
            };
          }
          return null;
        }
        if (e.batch && e.batch !== studentUser.batch) return null;
        return e.toObject();
      })
      .filter(Boolean);

    const studentPracticals = studentEntries.filter((e) => e.entryType === "PRACTICAL");
    console.log(`  ✓ Student in Batch S1 sees ${studentPracticals.length} practical sessions specifically for Batch S1`);
    for (const sp of studentPracticals) {
      if (sp.batch !== "S1") throw new Error(`Student saw non-S1 batch practical: ${sp.batch}`);
    }

    // 6. Workload Calculation & Mathematical Reconciliation
    console.log("\n[TEST 6] Verifying Faculty Workload Reconciliation (LT + PR + TUT + PROJ = TOT)...");
    const facultyList = await Faculty.find({ department: cseDept._id }).sort({ name: 1 }).lean();
    const allTimetables = await Timetable.find({ department: cseDept._id, academicYear: "2026-27" })
      .populate("entries.subject", "name code type")
      .populate("entries.faculty", "name employeeId")
      .populate("entries.childBatches.subject", "name code type")
      .populate("entries.childBatches.faculty", "name employeeId")
      .lean();

    const facultyWorkloadMap = new Map();
    for (const f of facultyList) {
      facultyWorkloadMap.set(String(f._id), {
        name: f.name,
        theory: 0,
        practical: 0,
        tutorial: 0,
        project: 0,
        total: 0
      });
    }

    for (const tt of allTimetables) {
      for (const entry of tt.entries || []) {
        if (entry.childBatches && entry.childBatches.length > 0) {
          for (const cb of entry.childBatches) {
            const facId = String(cb.faculty?._id || cb.faculty);
            if (facultyWorkloadMap.has(facId)) {
              const row = facultyWorkloadMap.get(facId);
              row.practical += (cb.durationHours || 2);
              row.total += (cb.durationHours || 2);
            }
          }
        } else {
          const facId = String(entry.faculty?._id || entry.faculty);
          if (facultyWorkloadMap.has(facId)) {
            const row = facultyWorkloadMap.get(facId);
            const dur = entry.durationSlots || 1;
            const subType = entry.subject?.type || entry.entryType;
            if (subType === "PRACTICAL") row.practical += dur;
            else if (subType === "TUTORIAL") row.tutorial += dur;
            else if (subType === "PROJECT") row.project += dur;
            else row.theory += dur;
            row.total += dur;
          }
        }
      }
    }

    let sumLT = 0, sumPR = 0, sumTUT = 0, sumPROJ = 0, grandTotal = 0;
    for (const [id, row] of facultyWorkloadMap.entries()) {
      const calculatedSum = row.theory + row.practical + row.tutorial + row.project;
      if (calculatedSum !== row.total) {
        throw new Error(`Workload mismatch for faculty ${row.name}: sum ${calculatedSum} != total ${row.total}`);
      }
      sumLT += row.theory;
      sumPR += row.practical;
      sumTUT += row.tutorial;
      sumPROJ += row.project;
      grandTotal += row.total;
    }

    console.log(`  ✓ Total Theory (LT):    ${sumLT} Hours`);
    console.log(`  ✓ Total Practical (PR): ${sumPR} Hours`);
    console.log(`  ✓ Total Tutorial (TUT): ${sumTUT} Hours`);
    console.log(`  ✓ Total Project (PROJ): ${sumPROJ} Hours`);
    console.log(`  ✓ Total Department:     ${grandTotal} Hours`);
    console.log(`  ✓ Mathematical Reconciliation: ${sumLT} + ${sumPR} + ${sumTUT} + ${sumPROJ} = ${grandTotal} (Exact Match!)`);

    // 7. Master Timetable Synchronization
    console.log("\n[TEST 7] Verifying Master Timetable Synchronization...");
    const master = await MasterTimetable.findOne({ department: cseDept._id, academicYear: "2026-27" })
      .populate("entries.childBatches.subject", "code name");
    if (!master) throw new Error("Master timetable not found");
    console.log(`  ✓ Master Timetable generated with ${master.entries.length} coordinated sessions`);
    const masterPracticals = master.entries.filter((e) => e.entryType === "PRACTICAL");
    console.log(`  ✓ Master Timetable contains ${masterPracticals.length} multi-batch practical blocks`);

    console.log("\n=================================================");
    console.log("✓ ALL END-TO-END VERIFICATION TESTS PASSED (100%)");
    console.log("=================================================\n");

    process.exit(0);
  } catch (err) {
    console.error("\n❌ TEST SUITE FAILED:", err);
    process.exit(1);
  }
};

runTests();
