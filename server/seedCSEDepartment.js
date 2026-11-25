const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: "server/.env" });
const connectDB = require("./config/db");

// Load all models from central registry
const {
  Institution,
  User,
  Department,
  Semester,
  Division,
  Batch,
  Faculty,
  Subject,
  Room,
  TimeSlot,
  Availability
} = require("./models");

const seedCSE = async () => {
  try {
    await connectDB();
    console.log("Connected to database for seeding CSE data...");

    // 0. Seed or Update Institution (Multi-tenant foundation)
    let inst = await Institution.findOne({ code: "DACOE" });
    const instData = {
      name: "Dr. Ashok Gujar Technical Institute's Dr. Daulatrao Aher College of Engineering, Karad",
      shortName: "DACOE Karad",
      code: "DACOE",
      tagline: "AI-Powered Academic Timetable Management System with NEP 2020",
      address: "Vidyanagar Ext. Banawadi, Karad 415124, Dist. Satara, Maharashtra",
      programmes: ["B.Tech", "M.Tech", "Diploma"],
      defaultProgramme: "B.Tech",
      academicYear: "2026-27",
      contactEmail: "principal@dacoe.ac.in",
      website: "https://www.dacoe.ac.in",
      settings: {
        workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        workingHours: { start: "10:00", end: "17:00" },
        breaks: [
          { name: "Lunch", startTime: "12:00", endTime: "12:45" },
          { name: "Recess", startTime: "14:45", endTime: "15:00" }
        ],
        allowSimultaneousLabs: true,
        enforceDesignatedClassroom: true
      }
    };

    if (!inst) {
      inst = await Institution.create(instData);
    } else {
      Object.assign(inst, instData);
      await inst.save();
    }
    console.log("✓ Institution configured:", inst.name, `(${inst.code})`);

    // 1. TimeSlots (Mon-Fri, 8 slots/day)
    const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
    const SLOT_TEMPLATES = [
      { slotNumber: 1, startTime: "10:00", endTime: "11:00", isBreak: false },
      { slotNumber: 2, startTime: "11:00", endTime: "12:00", isBreak: false },
      { slotNumber: 3, startTime: "12:00", endTime: "12:45", isBreak: true }, // Lunch break 45 min
      { slotNumber: 4, startTime: "12:45", endTime: "13:45", isBreak: false },
      { slotNumber: 5, startTime: "13:45", endTime: "14:45", isBreak: false },
      { slotNumber: 6, startTime: "14:45", endTime: "15:00", isBreak: true }, // Recess 15 min
      { slotNumber: 7, startTime: "15:00", endTime: "16:00", isBreak: false },
      { slotNumber: 8, startTime: "16:00", endTime: "17:00", isBreak: false },
    ];

    const allSlots = [];
    for (const day of DAYS) {
      for (const slot of SLOT_TEMPLATES) {
        const doc = await TimeSlot.findOneAndUpdate(
          { day, slotNumber: slot.slotNumber },
          { ...slot, day, institution: inst._id },
          { upsert: true, new: true }
        );
        allSlots.push(doc);
      }
    }
    const workingSlots = allSlots.filter((s) => !s.isBreak);
    console.log("✓ TimeSlots verified (Monday-Friday, 10:00 AM - 5:00 PM with Lunch Break & Recess)");

    // 2. Department
    let cseDept = await Department.findOne({ code: "CSE" });
    if (!cseDept) {
      cseDept = await Department.create({
        name: "Computer Science & Engineering",
        code: "CSE",
        description: "Department of Computer Science & Engineering, DACOE Karad",
        institution: inst._id
      });
    } else {
      cseDept.institution = inst._id;
      cseDept.name = "Computer Science & Engineering";
      await cseDept.save();
    }
    console.log("✓ CSE Department ready:", cseDept._id);

    // 3. Classrooms & Labs
    const roomConfigs = [
      { name: "Classroom 18 (S.Y. Designated)", roomNumber: "CR18", type: "CLASSROOM", capacity: 75, department: cseDept._id, institution: inst._id },
      { name: "Classroom 56 (T.Y. Designated)", roomNumber: "CR56", type: "CLASSROOM", capacity: 75, department: cseDept._id, institution: inst._id },
      { name: "Classroom 57 (B.Tech Designated)", roomNumber: "CR57", type: "CLASSROOM", capacity: 75, department: cseDept._id, institution: inst._id },
      { name: "Classroom 19 (Tutorial/Extra)", roomNumber: "CR19", type: "CLASSROOM", capacity: 75, department: cseDept._id, institution: inst._id },
      { name: "Lab 1 (General Computing)", roomNumber: "L41", type: "LAB", capacity: 35, department: cseDept._id, institution: inst._id },
      { name: "Lab 2 (Programming Lab)", roomNumber: "L42", type: "LAB", capacity: 35, department: cseDept._id, institution: inst._id },
      { name: "Lab 3 (Database Lab)", roomNumber: "L43", type: "LAB", capacity: 35, department: cseDept._id, institution: inst._id },
      { name: "Lab 4 (Network Lab)", roomNumber: "L44", type: "LAB", capacity: 35, department: cseDept._id, institution: inst._id },
      { name: "Lab 5 (Software Lab)", roomNumber: "L46", type: "LAB", capacity: 35, department: cseDept._id, institution: inst._id },
      { name: "Lab 6 (Project Lab)", roomNumber: "L47", type: "LAB", capacity: 35, department: cseDept._id, institution: inst._id },
      { name: "Lab 7 (Computer Graphics Lab)", roomNumber: "L48", type: "LAB", capacity: 35, department: cseDept._id, institution: inst._id },
      { name: "Lab 8 (Web Development Lab)", roomNumber: "L49", type: "LAB", capacity: 35, department: cseDept._id, institution: inst._id }
    ];

    const roomMap = {};
    for (const rc of roomConfigs) {
      const roomDoc = await Room.findOneAndUpdate(
        { roomNumber: rc.roomNumber },
        { ...rc },
        { upsert: true, new: true }
      );
      roomMap[rc.roomNumber] = roomDoc;
    }
    console.log("✓ Rooms & Labs ready (CR18, CR56, CR57, CR19, L41-L49)");

    // 4. Semesters (Sem 3, 5, 7) with Designated Classrooms & Preferred Practical Slots
    // Sem 3: S1-S4 (S.Y. B.Tech), Sem 5: T1-T4 (T.Y. B.Tech), Sem 7: B1-B4 (Final Year B.Tech)
    const semesterConfigs = [
      {
        name: "Third Semester (S.Y. B.Tech)",
        number: 3,
        programme: "B.Tech",
        designatedRoom: roomMap["CR18"]._id,
        preferredPracticalSlot: "15:00-17:00", // Soft preference: 3:00 PM - 5:00 PM (Slots 7 & 8)
        practicalBatches: ["S1", "S2", "S3", "S4"],
        studentCount: 65,
        institution: inst._id
      },
      {
        name: "Fifth Semester (T.Y. B.Tech)",
        number: 5,
        programme: "B.Tech",
        designatedRoom: roomMap["CR56"]._id,
        preferredPracticalSlot: "12:45-14:45", // Soft preference: 12:45 PM - 2:45 PM (Slots 4 & 5)
        practicalBatches: ["T1", "T2", "T3", "T4"],
        studentCount: 65,
        institution: inst._id
      },
      {
        name: "Seventh Semester (Final Year B.Tech)",
        number: 7,
        programme: "B.Tech",
        designatedRoom: roomMap["CR57"]._id,
        preferredPracticalSlot: "10:00-12:00", // Soft preference: 10:00 AM - 12:00 PM (Slots 1 & 2)
        practicalBatches: ["B1", "B2", "B3", "B4"],
        studentCount: 65,
        institution: inst._id
      }
    ];

    const semesterMap = {};
    for (const sc of semesterConfigs) {
      const semDoc = await Semester.findOneAndUpdate(
        { department: cseDept._id, number: sc.number },
        { ...sc, department: cseDept._id },
        { upsert: true, new: true }
      );
      semesterMap[sc.number] = semDoc;
    }
    console.log("✓ Semesters ready with Designated Classrooms and Practical Preferences (Sem 3 -> CR18, Sem 5 -> CR56, Sem 7 -> CR57)");

    // 5. Practical Batches (S1-S4 for Sem 3, T1-T4 for Sem 5, B1-B4 for Sem 7)
    await Batch.deleteMany({ department: cseDept._id });
    await Division.deleteMany({ name: { $in: ["BE CSE A", "BE CSE B"] } });

    const batchConfigs = [
      // Sem 3 (S1-S4)
      { name: "Batch S1", code: "S1", semester: semesterMap[3]._id, department: cseDept._id, institution: inst._id, studentCount: 17, startRoll: 1, endRoll: 17 },
      { name: "Batch S2", code: "S2", semester: semesterMap[3]._id, department: cseDept._id, institution: inst._id, studentCount: 16, startRoll: 18, endRoll: 33 },
      { name: "Batch S3", code: "S3", semester: semesterMap[3]._id, department: cseDept._id, institution: inst._id, studentCount: 16, startRoll: 34, endRoll: 49 },
      { name: "Batch S4", code: "S4", semester: semesterMap[3]._id, department: cseDept._id, institution: inst._id, studentCount: 16, startRoll: 50, endRoll: 65 },
      // Sem 5 (T1-T4)
      { name: "Batch T1", code: "T1", semester: semesterMap[5]._id, department: cseDept._id, institution: inst._id, studentCount: 17, startRoll: 1, endRoll: 17 },
      { name: "Batch T2", code: "T2", semester: semesterMap[5]._id, department: cseDept._id, institution: inst._id, studentCount: 16, startRoll: 18, endRoll: 33 },
      { name: "Batch T3", code: "T3", semester: semesterMap[5]._id, department: cseDept._id, institution: inst._id, studentCount: 16, startRoll: 34, endRoll: 49 },
      { name: "Batch T4", code: "T4", semester: semesterMap[5]._id, department: cseDept._id, institution: inst._id, studentCount: 16, startRoll: 50, endRoll: 65 },
      // Sem 7 (B1-B4)
      { name: "Batch B1", code: "B1", semester: semesterMap[7]._id, department: cseDept._id, institution: inst._id, studentCount: 17, startRoll: 1, endRoll: 17 },
      { name: "Batch B2", code: "B2", semester: semesterMap[7]._id, department: cseDept._id, institution: inst._id, studentCount: 16, startRoll: 18, endRoll: 33 },
      { name: "Batch B3", code: "B3", semester: semesterMap[7]._id, department: cseDept._id, institution: inst._id, studentCount: 16, startRoll: 34, endRoll: 49 },
      { name: "Batch B4", code: "B4", semester: semesterMap[7]._id, department: cseDept._id, institution: inst._id, studentCount: 16, startRoll: 50, endRoll: 65 }
    ];

    for (const bc of batchConfigs) {
      await Batch.create(bc);
    }
    console.log("✓ Practical Batches created (S1-S4 for Sem 3, T1-T4 for Sem 5, B1-B4 for Sem 7)");

    // 6. Optional Divisions
    const divisionConfigs = [
      { name: "SY CSE A", semester: semesterMap[3]._id, studentCount: 65, institution: inst._id },
      { name: "SY CSE B", semester: semesterMap[3]._id, studentCount: 65, institution: inst._id },
      { name: "TY CSE A", semester: semesterMap[5]._id, studentCount: 65, institution: inst._id },
      { name: "TY CSE B", semester: semesterMap[5]._id, studentCount: 65, institution: inst._id },
      { name: "B.Tech CSE A", semester: semesterMap[7]._id, studentCount: 65, institution: inst._id },
      { name: "B.Tech CSE B", semester: semesterMap[7]._id, studentCount: 65, institution: inst._id }
    ];

    for (const dc of divisionConfigs) {
      await Division.findOneAndUpdate(
        { name: dc.name, semester: dc.semester },
        { ...dc },
        { upsert: true, new: true }
      );
    }
    console.log("✓ Divisions ready (SY CSE A/B, TY CSE A/B, B.Tech CSE A/B)");

    // 7. Faculty Members (16 CSE Faculty with Profiles & Responsibilities)
    const facultyConfigs = [
      {
        name: "Prof. A. H. Renushe",
        employeeId: "FAC001",
        designation: "Associate Professor & HOD",
        email: "ahrenushe@dacoe.ac.in",
        department: cseDept._id,
        institution: inst._id,
        additionalResponsibilities: ["Head of Department", "Academic Council Member", "Research Committee Chairman"]
      },
      {
        name: "Prof. S. S. Patil",
        employeeId: "FAC002",
        designation: "Assistant Professor",
        email: "sspatil@dacoe.ac.in",
        department: cseDept._id,
        institution: inst._id,
        additionalResponsibilities: ["Lab In-charge (L42)", "Alumni Coordinator"]
      },
      {
        name: "Prof. S. P. Kakade",
        employeeId: "FAC003",
        designation: "Assistant Professor & Academic Coordinator",
        email: "spkakade@dacoe.ac.in",
        department: cseDept._id,
        institution: inst._id,
        additionalResponsibilities: ["Academic Coordinator", "Final Year Project Coordinator"]
      },
      {
        name: "Prof. S. B. Thorat",
        employeeId: "FAC004",
        designation: "Assistant Professor & Timetable In-charge",
        email: "sbthorat@dacoe.ac.in",
        department: cseDept._id,
        institution: inst._id,
        additionalResponsibilities: ["Time-Table In-charge", "Lab In-charge (L41)", "NBA Criteria 4 Coordinator"]
      },
      {
        name: "Prof. T. R. Shinde",
        employeeId: "FAC005",
        designation: "Assistant Professor",
        email: "trshinde@dacoe.ac.in",
        department: cseDept._id,
        institution: inst._id,
        additionalResponsibilities: ["Class Coordinator (TY)", "Mini Project Coordinator"]
      },
      {
        name: "Prof. J. P. Sarawade",
        employeeId: "FAC006",
        designation: "Assistant Professor",
        email: "jpsarawade@dacoe.ac.in",
        department: cseDept._id,
        institution: inst._id,
        additionalResponsibilities: ["TPO Coordinator", "Internship Coordinator"]
      },
      {
        name: "Prof. D. R. Kamble",
        employeeId: "FAC007",
        designation: "Assistant Professor & Academic In-charge",
        email: "drkamble@dacoe.ac.in",
        department: cseDept._id,
        institution: inst._id,
        additionalResponsibilities: ["Academic In-charge", "Exam In-charge (Internal)", "Class Coordinator (SY)"]
      },
      {
        name: "Prof. S. A. Shikalgar",
        employeeId: "FAC008",
        designation: "Assistant Professor",
        email: "sashikalgar@dacoe.ac.in",
        department: cseDept._id,
        institution: inst._id,
        additionalResponsibilities: ["Lab In-charge (L46)", "Website In-charge"]
      },
      {
        name: "Prof. A. A. Karande",
        employeeId: "FAC009",
        designation: "Assistant Professor",
        email: "aakarande@dacoe.ac.in",
        department: cseDept._id,
        institution: inst._id,
        additionalResponsibilities: ["Lab In-charge (L44)", "Network Administrator"]
      },
      {
        name: "Prof. J. S. Salunkhe",
        employeeId: "FAC010",
        designation: "Assistant Professor",
        email: "jssalunkhe@dacoe.ac.in",
        department: cseDept._id,
        institution: inst._id,
        additionalResponsibilities: ["Sports In-charge", "Cultural Committee"]
      },
      {
        name: "Prof. A. R. Kadave",
        employeeId: "FAC011",
        designation: "Assistant Professor",
        email: "arkadave@dacoe.ac.in",
        department: cseDept._id,
        institution: inst._id,
        additionalResponsibilities: ["Library Coordinator", "Student Association Mentor"]
      },
      {
        name: "Prof. P. D. Bansode",
        employeeId: "FAC012",
        designation: "Assistant Professor",
        email: "pdbansode@dacoe.ac.in",
        department: cseDept._id,
        institution: inst._id,
        additionalResponsibilities: ["Soft Skills Coordinator", "Language Lab In-charge"]
      },
      {
        name: "Prof. S. S. Nangare",
        employeeId: "FAC013",
        designation: "Assistant Professor",
        email: "ssnangare@dacoe.ac.in",
        department: cseDept._id,
        institution: inst._id,
        additionalResponsibilities: ["Attendance In-charge", "Mentorship Coordinator"]
      },
      {
        name: "Prof. S. Y. Inamdar",
        employeeId: "FAC014",
        designation: "Assistant Professor",
        email: "syinamdar@dacoe.ac.in",
        department: cseDept._id,
        institution: inst._id,
        additionalResponsibilities: ["Parent-Teacher Meet Coordinator"]
      },
      {
        name: "Prof. M. L. Kamble",
        employeeId: "FAC015",
        designation: "Assistant Professor",
        email: "mlkamble@dacoe.ac.in",
        department: cseDept._id,
        institution: inst._id,
        additionalResponsibilities: ["E-Cell Coordinator"]
      },
      {
        name: "Dr. Pranali M. Sheth",
        employeeId: "FAC016",
        designation: "Associate Professor",
        email: "pmsheth@dacoe.ac.in",
        department: cseDept._id,
        institution: inst._id,
        additionalResponsibilities: ["R&D Coordinator", "AI Research Lab Head", "NBA Criteria 5 Lead"]
      }
    ];

    const facultyMap = {};
    for (const fc of facultyConfigs) {
      let fac = await Faculty.findOne({ employeeId: fc.employeeId });
      if (!fac) {
        fac = await Faculty.create(fc);
      } else {
        Object.assign(fac, fc);
        await fac.save();
      }
      facultyMap[fc.employeeId] = fac;
    }
    console.log("✓ Faculty ready with profiles and additional responsibilities (16 CSE faculty members)");

    // 8. Availability configuration for all Faculty and Rooms
    // Every faculty member and room has default full availability across all working slots
    const workingSlotIds = workingSlots.map((s) => s._id);

    for (const fc of Object.values(facultyMap)) {
      for (const day of DAYS) {
        const daySlots = workingSlots.filter((s) => s.day === day).map((s) => s._id);
        await Availability.findOneAndUpdate(
          { resourceType: "FACULTY", resourceId: fc._id, day },
          {
            resourceType: "FACULTY",
            resourceId: fc._id,
            day,
            availableSlots: daySlots,
            unavailableSlots: [],
            preferredSlots: daySlots,
            maxDailyHours: 4,
            maxWeeklyHours: 18,
            institution: inst._id
          },
          { upsert: true, new: true }
        );
      }
    }

    for (const room of Object.values(roomMap)) {
      for (const day of DAYS) {
        const daySlots = workingSlots.filter((s) => s.day === day).map((s) => s._id);
        await Availability.findOneAndUpdate(
          { resourceType: "ROOM", resourceId: room._id, day },
          {
            resourceType: "ROOM",
            resourceId: room._id,
            day,
            availableSlots: daySlots,
            unavailableSlots: [],
            preferredSlots: daySlots,
            maxDailyHours: 7,
            maxWeeklyHours: 35,
            institution: inst._id
          },
          { upsert: true, new: true }
        );
      }
    }
    console.log("✓ Availability seeded for all 16 faculty and all 12 rooms/labs (Monday-Friday)");

    // 9. Subjects configuration with NEP 2020 courseCategory, credits & elective baskets
    const subjectList = [
      // Semester 3 (S.Y. B.Tech)
      { name: "Discrete Mathematical Structure", code: "DMS101", type: "LECTURE", semester: semesterMap[3]._id, weeklyHours: 3, practicalHours: 0, tutorialHours: 0, projectHours: 0, courseCategory: "CORE", credits: 3, faculty: [facultyMap["FAC007"]._id], institution: inst._id },
      { name: "Data Structure using C", code: "DS102", type: "LECTURE", semester: semesterMap[3]._id, weeklyHours: 3, practicalHours: 0, tutorialHours: 0, projectHours: 0, courseCategory: "CORE", credits: 3, faculty: [facultyMap["FAC004"]._id, facultyMap["FAC003"]._id], institution: inst._id },
      { name: "Data Structure Lab", code: "DSL102", type: "PRACTICAL", semester: semesterMap[3]._id, weeklyHours: 2, practicalHours: 2, tutorialHours: 0, projectHours: 0, courseCategory: "CORE", credits: 1, faculty: [facultyMap["FAC004"]._id, facultyMap["FAC002"]._id], institution: inst._id },
      { name: "Computer Networks", code: "CN103", type: "LECTURE", semester: semesterMap[3]._id, weeklyHours: 3, practicalHours: 0, tutorialHours: 0, projectHours: 0, courseCategory: "CORE", credits: 3, faculty: [facultyMap["FAC009"]._id], institution: inst._id },
      { name: "Computer Networks Lab", code: "CNL103", type: "PRACTICAL", semester: semesterMap[3]._id, weeklyHours: 2, practicalHours: 2, tutorialHours: 0, projectHours: 0, courseCategory: "CORE", credits: 1, faculty: [facultyMap["FAC009"]._id], institution: inst._id },
      { name: "Data Structure (MDM)", code: "DSMDM104", type: "LECTURE", semester: semesterMap[3]._id, weeklyHours: 2, practicalHours: 0, tutorialHours: 0, projectHours: 0, courseCategory: "MDM", credits: 2, faculty: [facultyMap["FAC004"]._id], institution: inst._id },
      { name: "Open Elective - I", code: "OE105", type: "LECTURE", semester: semesterMap[3]._id, weeklyHours: 3, practicalHours: 0, tutorialHours: 0, projectHours: 0, courseCategory: "ELECTIVE", electiveGroup: "OE-1", credits: 3, faculty: [facultyMap["FAC007"]._id], institution: inst._id },
      { name: "Employability Enhancement Skill-I", code: "EES106", type: "LECTURE", semester: semesterMap[3]._id, weeklyHours: 2, practicalHours: 0, tutorialHours: 0, projectHours: 0, courseCategory: "SKILL", credits: 2, faculty: [facultyMap["FAC012"]._id], institution: inst._id },
      { name: "Business English", code: "BEL107", type: "TUTORIAL", semester: semesterMap[3]._id, weeklyHours: 2, practicalHours: 0, tutorialHours: 2, projectHours: 0, courseCategory: "ABILITY", credits: 1, faculty: [facultyMap["FAC013"]._id, facultyMap["FAC015"]._id], institution: inst._id },

      // Semester 5 (T.Y. B.Tech)
      { name: "Information Security", code: "IS101", type: "LECTURE", semester: semesterMap[5]._id, weeklyHours: 3, practicalHours: 0, tutorialHours: 0, projectHours: 0, courseCategory: "CORE", credits: 3, faculty: [facultyMap["FAC002"]._id], institution: inst._id },
      { name: "Information Security Lab", code: "ISL101", type: "PRACTICAL", semester: semesterMap[5]._id, weeklyHours: 2, practicalHours: 2, tutorialHours: 0, projectHours: 0, courseCategory: "CORE", credits: 1, faculty: [facultyMap["FAC002"]._id], institution: inst._id },
      { name: "Artificial Intelligence", code: "AI102", type: "LECTURE", semester: semesterMap[5]._id, weeklyHours: 3, practicalHours: 0, tutorialHours: 0, projectHours: 0, courseCategory: "CORE", credits: 3, faculty: [facultyMap["FAC016"]._id], institution: inst._id },
      { name: "Computer Algorithms", code: "CA103", type: "LECTURE", semester: semesterMap[5]._id, weeklyHours: 3, practicalHours: 0, tutorialHours: 0, projectHours: 0, courseCategory: "CORE", credits: 3, faculty: [facultyMap["FAC006"]._id], institution: inst._id },
      { name: "Computer Algorithms Tutorial", code: "CAT103", type: "TUTORIAL", semester: semesterMap[5]._id, weeklyHours: 1, practicalHours: 0, tutorialHours: 1, projectHours: 0, courseCategory: "CORE", credits: 1, faculty: [facultyMap["FAC006"]._id], institution: inst._id },
      { name: "Java Programming", code: "JAVA104", type: "LECTURE", semester: semesterMap[5]._id, weeklyHours: 3, practicalHours: 0, tutorialHours: 0, projectHours: 0, courseCategory: "CORE", credits: 3, faculty: [facultyMap["FAC008"]._id, facultyMap["FAC016"]._id], institution: inst._id },
      { name: "Java Programming Lab", code: "JAVAL104", type: "PRACTICAL", semester: semesterMap[5]._id, weeklyHours: 2, practicalHours: 2, tutorialHours: 0, projectHours: 0, courseCategory: "CORE", credits: 1, faculty: [facultyMap["FAC008"]._id, facultyMap["FAC007"]._id], institution: inst._id },
      { name: "Open Elective - III", code: "OE305", type: "LECTURE", semester: semesterMap[5]._id, weeklyHours: 2, practicalHours: 0, tutorialHours: 0, projectHours: 0, courseCategory: "ELECTIVE", electiveGroup: "OE-3", credits: 2, faculty: [facultyMap["FAC005"]._id], institution: inst._id },
      { name: "Mini Project - II", code: "MP106", type: "PRACTICAL", semester: semesterMap[5]._id, weeklyHours: 2, practicalHours: 2, tutorialHours: 0, projectHours: 0, courseCategory: "PROJECT", credits: 2, faculty: [facultyMap["FAC005"]._id, facultyMap["FAC002"]._id, facultyMap["FAC003"]._id], institution: inst._id },

      // Semester 7 (Final Year B.Tech)
      { name: "Cloud Computing", code: "CC101", type: "LECTURE", semester: semesterMap[7]._id, weeklyHours: 3, practicalHours: 0, tutorialHours: 0, projectHours: 0, courseCategory: "CORE", credits: 3, faculty: [facultyMap["FAC001"]._id], institution: inst._id },
      { name: "Cloud Computing Lab", code: "CCL101", type: "PRACTICAL", semester: semesterMap[7]._id, weeklyHours: 2, practicalHours: 2, tutorialHours: 0, projectHours: 0, courseCategory: "CORE", credits: 1, faculty: [facultyMap["FAC001"]._id], institution: inst._id },
      { name: "Advanced Computer Architecture", code: "ACA102", type: "LECTURE", semester: semesterMap[7]._id, weeklyHours: 3, practicalHours: 0, tutorialHours: 0, projectHours: 0, courseCategory: "CORE", credits: 3, faculty: [facultyMap["FAC003"]._id], institution: inst._id },
      { name: "ACA Tutorial", code: "ACAT102", type: "TUTORIAL", semester: semesterMap[7]._id, weeklyHours: 1, practicalHours: 0, tutorialHours: 1, projectHours: 0, courseCategory: "CORE", credits: 1, faculty: [facultyMap["FAC003"]._id], institution: inst._id },
      { name: "Advanced Database System", code: "ADS103", type: "LECTURE", semester: semesterMap[7]._id, weeklyHours: 3, practicalHours: 0, tutorialHours: 0, projectHours: 0, courseCategory: "CORE", credits: 3, faculty: [facultyMap["FAC005"]._id], institution: inst._id },
      { name: "ADS Lab", code: "ADSL103", type: "PRACTICAL", semester: semesterMap[7]._id, weeklyHours: 2, practicalHours: 2, tutorialHours: 0, projectHours: 0, courseCategory: "CORE", credits: 1, faculty: [facultyMap["FAC005"]._id], institution: inst._id },
      { name: "Artificial Intelligence (Elective)", code: "AI104", type: "LECTURE", semester: semesterMap[7]._id, weeklyHours: 3, practicalHours: 0, tutorialHours: 0, projectHours: 0, courseCategory: "ELECTIVE", electiveGroup: "PE-1", credits: 3, faculty: [facultyMap["FAC009"]._id], institution: inst._id },
      { name: "AI Tutorial", code: "AIT104", type: "TUTORIAL", semester: semesterMap[7]._id, weeklyHours: 1, practicalHours: 0, tutorialHours: 1, projectHours: 0, courseCategory: "ELECTIVE", electiveGroup: "PE-1", credits: 1, faculty: [facultyMap["FAC009"]._id], institution: inst._id },
      { name: "Web Technologies - I", code: "WT105", type: "LECTURE", semester: semesterMap[7]._id, weeklyHours: 2, practicalHours: 0, tutorialHours: 0, projectHours: 0, courseCategory: "CORE", credits: 2, faculty: [facultyMap["FAC006"]._id, facultyMap["FAC008"]._id], institution: inst._id },
      { name: "Web Technologies - I Lab", code: "WTL105", type: "PRACTICAL", semester: semesterMap[7]._id, weeklyHours: 2, practicalHours: 2, tutorialHours: 0, projectHours: 0, courseCategory: "CORE", credits: 1, faculty: [facultyMap["FAC006"]._id, facultyMap["FAC008"]._id], institution: inst._id },
      { name: "Project - I", code: "PROJ106", type: "PROJECT", semester: semesterMap[7]._id, weeklyHours: 4, practicalHours: 0, tutorialHours: 0, projectHours: 4, courseCategory: "PROJECT", credits: 4, faculty: [facultyMap["FAC004"]._id, facultyMap["FAC001"]._id, facultyMap["FAC003"]._id], institution: inst._id }
    ];

    for (const sub of subjectList) {
      await Subject.findOneAndUpdate(
        { code: sub.code },
        { ...sub, department: cseDept._id },
        { upsert: true, new: true }
      );
    }
    console.log("✓ Subjects ready with NEP 2020 course categories, credits and elective groups (Sem 3, 5, 7)");

    // 10. Role Accounts (ADMIN, HOD, COORDINATOR, 16 FACULTY, 12+ STUDENTS)
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash("Admin@123", salt);
    const hodPassword = await bcrypt.hash("hod123", salt);
    const coordPassword = await bcrypt.hash("coordinator123", salt);
    const facultyPassword = await bcrypt.hash("faculty123", salt);
    const studentPassword = await bcrypt.hash("student123", salt);

    // 10a. ADMIN
    await User.findOneAndUpdate(
      { email: "admin@smarttimetable.com" },
      {
        name: "College Administrator",
        email: "admin@smarttimetable.com",
        password: adminPassword,
        role: "ADMIN",
        institution: inst._id,
        programme: "B.Tech"
      },
      { upsert: true, new: true }
    );
    console.log("✓ Admin User: admin@smarttimetable.com / Admin@123");

    // 10b. HOD (Head of Department)
    const hodUser = await User.findOneAndUpdate(
      { email: "hod.cse@dacoe.ac.in" },
      {
        name: "Prof. A. H. Renushe (HOD CSE)",
        email: "hod.cse@dacoe.ac.in",
        password: hodPassword,
        role: "HOD",
        department: cseDept._id,
        institution: inst._id,
        programme: "B.Tech",
        facultyProfile: facultyMap["FAC001"]._id
      },
      { upsert: true, new: true }
    );
    console.log("✓ HOD User: hod.cse@dacoe.ac.in / hod123");

    // 10c. COORDINATOR (Academic / Timetable Coordinator)
    const coordUser = await User.findOneAndUpdate(
      { email: "coordinator.cse@dacoe.ac.in" },
      {
        name: "Prof. S. P. Kakade (Academic Coordinator)",
        email: "coordinator.cse@dacoe.ac.in",
        password: coordPassword,
        role: "COORDINATOR",
        department: cseDept._id,
        institution: inst._id,
        programme: "B.Tech",
        facultyProfile: facultyMap["FAC003"]._id
      },
      { upsert: true, new: true }
    );
    console.log("✓ Coordinator User: coordinator.cse@dacoe.ac.in / coordinator123");

    // 10d. ALL 16 FACULTY ACCOUNTS
    for (const fc of facultyConfigs) {
      const facDoc = facultyMap[fc.employeeId];
      const u = await User.findOneAndUpdate(
        { email: fc.email },
        {
          name: fc.name,
          email: fc.email,
          password: facultyPassword,
          role: "FACULTY",
          department: cseDept._id,
          institution: inst._id,
          programme: "B.Tech",
          facultyProfile: facDoc._id
        },
        { upsert: true, new: true }
      );
      facDoc.user = u._id;
      await facDoc.save();
    }
    console.log("✓ All 16 Faculty Users Registered (Password: faculty123)");

    // 10e. STUDENT ACCOUNTS ACROSS ALL BATCHES (S1-S4 for Sem 3, T1-T4 for Sem 5, B1-B4 for Sem 7)
    await User.deleteMany({ email: { $in: [
      "student.sem3.t1@dacoe.ac.in",
      "student.sem3.t2@dacoe.ac.in",
      "student.sem3.t3@dacoe.ac.in",
      "student.sem3.t4@dacoe.ac.in"
    ] } });

    const studentConfigs = [
      // Semester 3 (S1 - S4)
      { name: "Rahul Jadhav (Sem 3 - Batch S1)", email: "student.sem3.s1@dacoe.ac.in", semNum: 3, batch: "S1", roll: "301" },
      { name: "Pooja Patil (Sem 3 - Batch S2)", email: "student.sem3.s2@dacoe.ac.in", semNum: 3, batch: "S2", roll: "318" },
      { name: "Kunal Deshmukh (Sem 3 - Batch S3)", email: "student.sem3.s3@dacoe.ac.in", semNum: 3, batch: "S3", roll: "334" },
      { name: "Anjali Kadam (Sem 3 - Batch S4)", email: "student.sem3.s4@dacoe.ac.in", semNum: 3, batch: "S4", roll: "350" },
      // Semester 5 (T1 - T4)
      { name: "Sneha Patil (Sem 5 - Batch T1)", email: "student.sem5.t1@dacoe.ac.in", semNum: 5, batch: "T1", roll: "501" },
      { name: "Vikram Mane (Sem 5 - Batch T2)", email: "student.sem5.t2@dacoe.ac.in", semNum: 5, batch: "T2", roll: "518" },
      { name: "Rutuja Chavan (Sem 5 - Batch T3)", email: "student.sem5.t3@dacoe.ac.in", semNum: 5, batch: "T3", roll: "534" },
      { name: "Siddharth Shinde (Sem 5 - Batch T4)", email: "student.sem5.t4@dacoe.ac.in", semNum: 5, batch: "T4", roll: "550" },
      // Semester 7 (B1 - B4)
      { name: "Amit Shinde (Sem 7 - Batch B1)", email: "student.sem7.b1@dacoe.ac.in", semNum: 7, batch: "B1", roll: "701" },
      { name: "Divya Salunkhe (Sem 7 - Batch B2)", email: "student.sem7.b2@dacoe.ac.in", semNum: 7, batch: "B2", roll: "718" },
      { name: "Omkar Ghadge (Sem 7 - Batch B3)", email: "student.sem7.b3@dacoe.ac.in", semNum: 7, batch: "B3", roll: "734" },
      { name: "Priya Pawar (Sem 7 - Batch B4)", email: "student.sem7.b4@dacoe.ac.in", semNum: 7, batch: "B4", roll: "750" },
      // Aliases for quick backward compatibility
      { name: "Rahul Jadhav (Sem 3)", email: "student.sem3@dacoe.ac.in", semNum: 3, batch: "S1", roll: "301" },
      { name: "Sneha Patil (Sem 5)", email: "student.sem5@dacoe.ac.in", semNum: 5, batch: "T1", roll: "501" },
      { name: "Amit Shinde (Sem 7)", email: "student.sem7@dacoe.ac.in", semNum: 7, batch: "B1", roll: "701" }
    ];

    for (const sc of studentConfigs) {
      await User.findOneAndUpdate(
        { email: sc.email },
        {
          name: sc.name,
          email: sc.email,
          password: studentPassword,
          role: "STUDENT",
          department: cseDept._id,
          institution: inst._id,
          programme: "B.Tech",
          semester: semesterMap[sc.semNum]._id,
          batch: sc.batch,
          rollNumber: sc.roll
        },
        { upsert: true, new: true }
      );
    }
    console.log("✓ 12+ Student Accounts Created Across All Batches (Password: student123)");

    console.log("\n=======================================================");
    console.log("✓ Complete CSE Institutional & Multi-Role Dataset Seeded!");
    console.log("=======================================================\n");

    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
};

seedCSE();
