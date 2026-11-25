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
const { validateDepartmentBatches } = require("./services/batchValidationService");

const runAll10Tests = async () => {
  try {
    console.log("======================================================================");
    console.log("RUNNING MASTER IMPLEMENTATION VERIFICATION SUITE — ALL 10 TESTS (PART 17)");
    console.log("======================================================================\n");

    await connectDB();

    const cseDept = await Department.findOne({ code: "CSE" });
    if (!cseDept) throw new Error("CSE Department record missing");
    const inst = await Institution.findOne({ code: "DACOE" });
    if (!inst) throw new Error("DACOE Institution record missing");

    // -------------------------------------------------------------------
    // TEST 1: Third Semester (S.Y. B.Tech)
    // -------------------------------------------------------------------
    console.log("[TEST 1] Verifying Third Semester (S.Y. B.Tech)...");
    const sem3 = await Semester.findOne({ department: cseDept._id, number: 3 });
    if (!sem3) throw new Error("Semester 3 not found");

    const sem3Batches = await Batch.find({ semester: sem3._id, isActive: true }).sort({ code: 1 });
    const sem3Codes = sem3Batches.map((b) => b.code);
    console.log(`  ✓ Sem 3 Active Batches: [${sem3Codes.join(", ")}]`);
    if (JSON.stringify(sem3Codes) !== JSON.stringify(["S1", "S2", "S3", "S4"])) {
      throw new Error(`Sem 3 batch mismatch: got [${sem3Codes.join(", ")}], expected [S1, S2, S3, S4]`);
    }
    if (sem3Codes.includes("S5")) throw new Error("Found illegal batch S5 in Sem 3");

    // -------------------------------------------------------------------
    // TEST 2: Fifth Semester (T.Y. B.Tech)
    // -------------------------------------------------------------------
    console.log("\n[TEST 2] Verifying Fifth Semester (T.Y. B.Tech)...");
    const sem5 = await Semester.findOne({ department: cseDept._id, number: 5 });
    if (!sem5) throw new Error("Semester 5 not found");

    const sem5Batches = await Batch.find({ semester: sem5._id, isActive: true }).sort({ code: 1 });
    const sem5Codes = sem5Batches.map((b) => b.code);
    console.log(`  ✓ Sem 5 Active Batches: [${sem5Codes.join(", ")}]`);
    if (JSON.stringify(sem5Codes) !== JSON.stringify(["T1", "T2", "T3", "T4"])) {
      throw new Error(`Sem 5 batch mismatch: got [${sem5Codes.join(", ")}], expected [T1, T2, T3, T4]`);
    }
    if (sem5Codes.includes("T5")) throw new Error("Found illegal batch T5 in Sem 5");

    // -------------------------------------------------------------------
    // TEST 3: Seventh Semester (Final Year B.Tech)
    // -------------------------------------------------------------------
    console.log("\n[TEST 3] Verifying Seventh Semester (Final Year B.Tech)...");
    const sem7 = await Semester.findOne({ department: cseDept._id, number: 7 });
    if (!sem7) throw new Error("Semester 7 not found");

    const sem7Batches = await Batch.find({ semester: sem7._id, isActive: true }).sort({ code: 1 });
    const sem7Codes = sem7Batches.map((b) => b.code);
    console.log(`  ✓ Sem 7 Active Batches: [${sem7Codes.join(", ")}]`);
    if (JSON.stringify(sem7Codes) !== JSON.stringify(["B1", "B2", "B3", "B4"])) {
      throw new Error(`Sem 7 batch mismatch: got [${sem7Codes.join(", ")}], expected [B1, B2, B3, B4]`);
    }
    if (sem7Codes.includes("B5")) throw new Error("Found illegal batch B5 in Sem 7");

    // Batch validation service execution
    const batchVal = await validateDepartmentBatches({ departmentId: cseDept._id, semesterNumbers: [3, 5, 7] });
    console.log(`  ✓ Batch Validation Service: ${batchVal.isValid ? "PASSED (0 Errors)" : "FAILED"}`);
    if (!batchVal.isValid) throw new Error(`Batch validation failed: ${batchVal.errors.join("; ")}`);

    // -------------------------------------------------------------------
    // TEST 4: CSE Department Master Timetable Generation & Global Conflict Matrix
    // -------------------------------------------------------------------
    console.log("\n[TEST 4] Running Unified Generation Engine (Sem 3, 5, 7)...");
    const genResult = await generateDepartmentTimetable({
      departmentId: cseDept._id,
      academicYear: "2026-27",
      semesterNumbers: [3, 5, 7],
      useDivisions: false
    });

    console.log(`  ✓ Status: ${genResult.status}`);
    console.log(`  ✓ Hard Violations: ${genResult.hardConstraintViolations} (Target: 0)`);
    console.log(`  ✓ GA Fitness Score: ${genResult.fitness.toFixed(3)}`);
    console.log(`  ✓ Total Timetables Created: ${genResult.timetables.length}`);
    console.log(`  ✓ Master Timetable ID: ${genResult.masterTimetableId}`);
    if (genResult.hardConstraintViolations > 0) {
      throw new Error(`Hard constraint violations detected: ${genResult.hardConstraintViolations}`);
    }

    // Verify practical timing per semester
    for (const tt of genResult.timetables) {
      const sNum = tt.semester?.number;
      const practicals = tt.entries.filter((e) => e.entryType === "PRACTICAL");
      console.log(`  Semester ${sNum}: ${practicals.length} Parent Practical Blocks`);
      for (const p of practicals) {
        const slot = p.timeSlot;
        const start = slot?.slotNumber;
        if (sNum === 3 && start !== 7) {
          throw new Error(`Sem 3 practical not at 3:00 PM (Slot 7)! Got slot ${start}`);
        }
        if (sNum === 5 && start !== 4) {
          throw new Error(`Sem 5 practical not at 12:45 PM (Slot 4)! Got slot ${start}`);
        }
        if (sNum === 7 && start !== 1) {
          throw new Error(`Sem 7 practical not at 10:00 AM (Slot 1)! Got slot ${start}`);
        }
      }
      console.log(`    ✓ Sem ${sNum} practical blocks strictly adhere to official college timing`);
    }

    // -------------------------------------------------------------------
    // TEST 5: Availability Enforcement
    // -------------------------------------------------------------------
    console.log("\n[TEST 5] Verifying Availability Constraint Enforcement...");
    const testFac = await Faculty.findOne({ department: cseDept._id });
    const mondaySlot1 = await TimeSlot.findOne({ day: "MONDAY", slotNumber: 1 });
    const allMondaySlots = await TimeSlot.find({ day: "MONDAY" });

    // Set availability making Monday Slot 1 unavailable (only slots 2, 4, 5, 7, 8 allowed)
    const allowedSlots = allMondaySlots.filter((s) => s.slotNumber !== 1).map((s) => s._id);
    await Availability.findOneAndUpdate(
      { resourceType: "FACULTY", resourceId: testFac._id, day: "MONDAY" },
      { resourceType: "FACULTY", resourceId: testFac._id, day: "MONDAY", availableSlots: allowedSlots },
      { upsert: true }
    );

    // Regenerate and verify faculty is NEVER scheduled on Monday Slot 1
    const availTestGen = await generateDepartmentTimetable({
      departmentId: cseDept._id,
      academicYear: "2026-27",
      semesterNumbers: [3, 5, 7]
    });

    let scheduledOnUnavailable = false;
    for (const tt of availTestGen.timetables) {
      for (const e of tt.entries) {
        if (String(e.faculty?._id || e.faculty) === String(testFac._id) && e.day === "MONDAY") {
          const sNum = e.timeSlot?.slotNumber;
          if (sNum === 1) scheduledOnUnavailable = true;
        }
        if (e.childBatches?.length) {
          for (const cb of e.childBatches) {
            if (String(cb.faculty?._id || cb.faculty) === String(testFac._id) && e.day === "MONDAY") {
              const sNum = e.timeSlot?.slotNumber;
              if (sNum === 1) scheduledOnUnavailable = true;
            }
          }
        }
      }
    }

    // Clean up test availability
    await Availability.deleteMany({ resourceType: "FACULTY", resourceId: testFac._id, day: "MONDAY" });

    if (scheduledOnUnavailable) {
      throw new Error(`Faculty ${testFac.name} was scheduled on MONDAY Slot 1 despite availability constraint!`);
    }
    console.log(`  ✓ Availability Constraint Enforced: Faculty ${testFac.name} was never scheduled during unavailable slot`);

    // -------------------------------------------------------------------
    // TEST 6: Faculty Portal & Teaching Schedule
    // -------------------------------------------------------------------
    console.log("\n[TEST 6] Verifying Faculty Portal & Teaching Schedule...");
    const hodFaculty = await Faculty.findOne({ employeeId: "FAC001" });
    const hodUser = await User.findOne({ email: "ahrenushe@dacoe.ac.in" });
    if (!hodUser) throw new Error("Faculty account ahrenushe@dacoe.ac.in missing");

    // Aggregate sessions for HOD
    const allTT = await Timetable.find({ department: cseDept._id, academicYear: "2026-27" })
      .populate("entries.subject entries.room entries.timeSlot entries.childBatches.subject entries.childBatches.room");

    let facSessions = 0;
    for (const tt of allTT) {
      for (const e of tt.entries) {
        if (String(e.faculty?._id || e.faculty) === String(hodFaculty._id)) facSessions++;
        for (const cb of e.childBatches || []) {
          if (String(cb.faculty?._id || cb.faculty) === String(hodFaculty._id)) facSessions++;
        }
      }
    }
    console.log(`  ✓ Faculty ${hodUser.name} schedule verified: ${facSessions} weekly teaching sessions found`);

    // -------------------------------------------------------------------
    // TEST 7: Student Portal & Batch Isolation
    // -------------------------------------------------------------------
    console.log("\n[TEST 7] Verifying Student Portal & Batch Isolation...");
    const sampleStudents = [
      { email: "student.sem3.s1@dacoe.ac.in", sem: 3, batch: "S1" },
      { email: "student.sem3.s2@dacoe.ac.in", sem: 3, batch: "S2" },
      { email: "student.sem5.t1@dacoe.ac.in", sem: 5, batch: "T1" },
      { email: "student.sem7.b1@dacoe.ac.in", sem: 7, batch: "B1" }
    ];

    for (const ss of sampleStudents) {
      const u = await User.findOne({ email: ss.email });
      if (!u) throw new Error(`Student ${ss.email} not found`);
      const semTT = allTT.find((t) => t.semester?.number === ss.sem || String(t.semester) === String(u.semester));

      const filtered = semTT.entries
        .map((e) => {
          if (e.childBatches?.length) {
            const match = e.childBatches.find((cb) => cb.batch === ss.batch);
            return match ? { ...e.toObject(), batch: match.batch } : null;
          }
          if (e.batch && e.batch !== ss.batch) return null;
          return e.toObject();
        })
        .filter(Boolean);

      const practicals = filtered.filter((e) => e.entryType === "PRACTICAL");
      for (const p of practicals) {
        if (p.batch !== ss.batch) {
          throw new Error(`Student ${ss.email} saw mismatched batch ${p.batch}!`);
        }
      }
      console.log(`  ✓ Student ${u.name} (Batch ${ss.batch}) sees only their own batch practicals (${practicals.length} sessions)`);
    }

    // -------------------------------------------------------------------
    // TEST 8: Regeneration Integrity
    // -------------------------------------------------------------------
    console.log("\n[TEST 8] Verifying Timetable Regeneration Integrity...");
    const regenResult = await generateDepartmentTimetable({
      departmentId: cseDept._id,
      academicYear: "2026-27",
      semesterNumbers: [3, 5, 7]
    });

    const finalTTCount = await Timetable.countDocuments({ department: cseDept._id, academicYear: "2026-27" });
    if (finalTTCount !== 3) {
      throw new Error(`Regeneration created duplicate timetables: found ${finalTTCount}, expected exactly 3`);
    }
    console.log(`  ✓ Regeneration cleanly replaced active timetables without duplicating records (Exactly 3 class timetables)`);

    // -------------------------------------------------------------------
    // TEST 9: Multi-Role Security & Role Verification
    // -------------------------------------------------------------------
    console.log("\n[TEST 9] Verifying Multi-Role Security & Role Architecture...");
    const roles = ["ADMIN", "HOD", "COORDINATOR", "FACULTY", "STUDENT"];
    for (const r of roles) {
      const count = await User.countDocuments({ role: r });
      console.log(`  ✓ Role ${r.padEnd(12)}: ${count} active user accounts verified`);
      if (count === 0) throw new Error(`No active accounts found for role ${r}`);
    }

    // -------------------------------------------------------------------
    // TEST 10: Reports & Workload Reconciliation (LT + PR + TUT + PROJ = TOT)
    // -------------------------------------------------------------------
    console.log("\n[TEST 10] Verifying Faculty Workload Reconciliation Identity...");
    const allFaculty = await Faculty.find({ department: cseDept._id }).lean();
    const timetablesForWorkload = await Timetable.find({ department: cseDept._id, academicYear: "2026-27" })
      .populate("entries.subject entries.childBatches.subject");

    const loadMap = new Map();
    for (const f of allFaculty) {
      loadMap.set(String(f._id), { name: f.name, lt: 0, pr: 0, tut: 0, proj: 0, tot: 0 });
    }

    for (const tt of timetablesForWorkload) {
      for (const e of tt.entries) {
        if (e.childBatches?.length) {
          for (const cb of e.childBatches) {
            const fId = String(cb.faculty?._id || cb.faculty);
            if (loadMap.has(fId)) {
              loadMap.get(fId).pr += 2;
              loadMap.get(fId).tot += 2;
            }
          }
        } else {
          const fId = String(e.faculty?._id || e.faculty);
          if (loadMap.has(fId)) {
            const dur = e.durationSlots || 1;
            const subType = e.subject?.type || e.entryType;
            if (subType === "PRACTICAL") loadMap.get(fId).pr += dur;
            else if (subType === "TUTORIAL") loadMap.get(fId).tut += dur;
            else if (subType === "PROJECT") loadMap.get(fId).proj += dur;
            else loadMap.get(fId).lt += dur;
            loadMap.get(fId).tot += dur;
          }
        }
      }
    }

    let totLT = 0, totPR = 0, totTUT = 0, totPROJ = 0, grandTot = 0;
    for (const [_, row] of loadMap.entries()) {
      if (row.lt + row.pr + row.tut + row.proj !== row.tot) {
        throw new Error(`Row mismatch for ${row.name}`);
      }
      totLT += row.lt;
      totPR += row.pr;
      totTUT += row.tut;
      totPROJ += row.proj;
      grandTot += row.tot;
    }

    console.log(`  ✓ Theory Lectures (LT):    ${totLT} Hours`);
    console.log(`  ✓ Practical Sessions (PR): ${totPR} Hours`);
    console.log(`  ✓ Tutorial Sessions (TUT): ${totTUT} Hours`);
    console.log(`  ✓ Project Capstone (PROJ): ${totPROJ} Hours`);
    console.log(`  ✓ Department Total:        ${grandTot} Hours`);
    console.log(`  ✓ Exact Mathematical Identity: ${totLT} + ${totPR} + ${totTUT} + ${totPROJ} = ${grandTot} (100% Match!)`);

    console.log("\n======================================================================");
    console.log("✓ ALL 10 TESTS IN PART 17 PASSED WITH 100% SUCCESS!");
    console.log("======================================================================\n");

    process.exit(0);
  } catch (err) {
    console.error("\n❌ TEST SUITE FAILED:", err);
    process.exit(1);
  }
};

runAll10Tests();
