const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = require("./config/db");

const Department = require("./models/Department");
const Semester = require("./models/Semester");
const Subject = require("./models/Subject");
const Faculty = require("./models/Faculty");

const REQUIRED_FACULTY = {
  DMS: "FAC007",       // Prof. D. R. Kamble
  CN: "FAC009",        // Prof. A. A. Karande
  DS1: "FAC004",       // Prof. S. B. Thorat
  DS2: "FAC003",       // Prof. S. P. Kakade
  DS3: "FAC002",       // Prof. S. S. Patil
  EES: "FAC012",       // Prof. P. D. Bansode
  BE1: "FAC013",       // Prof. S. S. Nangare
  BE2: "FAC015",       // Prof. M. L. Kamble
};

const SUBJECT_CONFIG = {
  DMS101: {
    type: "LECTURE",
    weeklyHours: 3,
    practicalHours: 0,
    faculty: ["FAC007"],
  },

  CN103: {
    type: "LECTURE",
    weeklyHours: 3,
    practicalHours: 0,
    faculty: ["FAC009"],
  },

  CNL103: {
    type: "PRACTICAL",
    weeklyHours: 2,
    practicalHours: 2,
    faculty: ["FAC009"],
  },

  DS102: {
    type: "LECTURE",
    weeklyHours: 3,
    practicalHours: 0,
    faculty: ["FAC004", "FAC003", "FAC002"],
  },

  DSL102: {
    type: "PRACTICAL",
    weeklyHours: 2,
    practicalHours: 2,
    faculty: ["FAC004", "FAC003", "FAC002"],
  },

  "DS(MDM)104": {
    type: "LECTURE",
    weeklyHours: 2,
    practicalHours: 0,
    faculty: ["FAC004"],
  },

  EES106: {
    type: "LECTURE",
    weeklyHours: 2,
    practicalHours: 0,
    faculty: ["FAC012"],
  },

  OE105: {
    type: "LECTURE",
    weeklyHours: 3,
    practicalHours: 0,
    faculty: ["FAC007"],
  },

  OEL105: {
    type: "PRACTICAL",
    weeklyHours: 2,
    practicalHours: 2,
    faculty: ["FAC007"],
  },

  BEL107: {
    type: "PRACTICAL",
    weeklyHours: 2,
    practicalHours: 2,
    faculty: ["FAC013", "FAC015"],
  },
};

const run = async () => {
  try {
    await connectDB();

    console.log("\n==============================================");
    console.log("       SEMESTER 3 CURRICULUM SETUP");
    console.log("==============================================\n");

    // ==================================================
    // 1. FIND CSE
    // ==================================================

    const department = await Department.findOne({
      code: "CSE",
    });

    if (!department) {
      throw new Error("CSE department not found.");
    }

    console.log("CSE Department found:");
    console.log(`${department.name} (${department.code})`);

    // ==================================================
    // 2. FIND SEMESTER 3
    // ==================================================

    const semester = await Semester.findOne({
      department: department._id,
      number: 3,
    });

    if (!semester) {
      throw new Error(
        "Semester 3 for CSE was not found."
      );
    }

    console.log(
      `Semester found: ${semester.name}`
    );

    // ==================================================
    // 3. FIND REQUIRED FACULTY
    // ==================================================

    console.log(
      "\nChecking required faculty..."
    );

    const facultyMap = {};

    const employeeIds = [
      ...new Set(
        Object.values(SUBJECT_CONFIG)
          .flatMap((config) => config.faculty)
      ),
    ];

    for (const employeeId of employeeIds) {
      const faculty = await Faculty.findOne({
        employeeId,
      });

      if (!faculty) {
        throw new Error(
          `Required faculty ${employeeId} was not found.`
        );
      }

      facultyMap[employeeId] = faculty;

      console.log(
        `✅ ${employeeId} → ${faculty.name}`
      );
    }

    // ==================================================
    // 4. FIND SEMESTER 3 SUBJECTS
    // ==================================================

    const subjects = await Subject.find({
      department: department._id,
      semester: semester._id,
    });

    console.log(
      `\nSemester 3 subjects found: ${subjects.length}`
    );

    const subjectMap = {};

    subjects.forEach((subject) => {
      subjectMap[subject.code] = subject;
    });

    // ==================================================
    // 5. UPDATE SUBJECTS
    // ==================================================

    console.log(
      "\nUpdating Semester 3 subject configuration..."
    );

    for (const [code, config] of Object.entries(
      SUBJECT_CONFIG
    )) {
      const subject = subjectMap[code];

      if (!subject) {
        throw new Error(
          `Required subject ${code} was not found in Semester 3.`
        );
      }

      const facultyIds =
        config.faculty.map(
          (employeeId) =>
            facultyMap[employeeId]._id
        );

      subject.type = config.type;
      subject.weeklyHours =
        config.weeklyHours;
      subject.practicalHours =
        config.practicalHours;
      subject.faculty = facultyIds;

      await subject.save();

      console.log(
        `✅ ${code} → ${config.type}, ` +
        `${config.weeklyHours} weekly hour(s), ` +
        `faculty: ${config.faculty.join(", ")}`
      );
    }

    // ==================================================
    // 6. REMOVE THE INCORRECT MDM PRACTICAL SUBJECT
    // ==================================================

    const unwantedMDMPractical =
      await Subject.findOne({
        code: "DS(MDM)L104",
        semester: semester._id,
      });

    if (unwantedMDMPractical) {
      await Subject.deleteOne({
        _id: unwantedMDMPractical._id,
      });

      console.log(
        "\n🗑️ Removed DS(MDM)L104."
      );

      console.log(
        "Reason: Semester 3 uses DS(MDM) as a " +
        "semester-wide MDM/theory activity, not a batch practical."
      );
    } else {
      console.log(
        "\nℹ️ DS(MDM)L104 was already absent."
      );
    }

    // ==================================================
    // 7. CLEAN OLD SEMESTER 3 SUBJECT REFERENCES
    // ==================================================

    const semester3SubjectIds =
      subjects.map(
        (subject) => subject._id
      );

    console.log(
      "\nCleaning Semester 3 subject references from faculty..."
    );

    for (const faculty of Object.values(
      facultyMap
    )) {
      faculty.subjects =
        (faculty.subjects || []).filter(
          (subjectId) =>
            !semester3SubjectIds.some(
              (id) =>
                id.toString() ===
                subjectId.toString()
            )
        );

      await faculty.save();
    }

    // ==================================================
    // 8. REBUILD CORRECT FACULTY REFERENCES
    // ==================================================

    console.log(
      "Adding correct faculty → subject references..."
    );

    for (const [code, config] of Object.entries(
      SUBJECT_CONFIG
    )) {
      const subject = await Subject.findOne({
        code,
        semester: semester._id,
      });

      if (!subject) {
        continue;
      }

      for (const employeeId of config.faculty) {
        const faculty =
          facultyMap[employeeId];

        const alreadyExists =
          faculty.subjects.some(
            (subjectId) =>
              subjectId.toString() ===
              subject._id.toString()
          );

        if (!alreadyExists) {
          faculty.subjects.push(
            subject._id
          );
        }

        await faculty.save();
      }
    }

    // ==================================================
    // 9. FINAL VERIFICATION
    // ==================================================

    console.log(
      "\n=============================================="
    );
    console.log(
      "       FINAL SEMESTER 3 CONFIGURATION"
    );
    console.log(
      "==============================================\n"
    );

    const finalSubjects =
      await Subject.find({
        department: department._id,
        semester: semester._id,
      })
        .populate(
          "faculty",
          "name employeeId"
        )
        .sort({ code: 1 });

    for (const subject of finalSubjects) {
      console.log(
        `${subject.code} - ${subject.name}`
      );

      console.log(
        `Type: ${subject.type}`
      );

      console.log(
        `Weekly Hours: ${subject.weeklyHours}`
      );

      console.log(
        `Practical Hours: ${subject.practicalHours}`
      );

      console.log(
        "Faculty:",
        subject.faculty
          .map(
            (faculty) =>
              `${faculty.employeeId} - ${faculty.name}`
          )
          .join(", ")
      );

      console.log("----------------------------------------------");
    }

    // ==================================================
    // 10. WORKLOAD SUMMARY
    // ==================================================

    let lectureHours = 0;
    let practicalHours = 0;

    finalSubjects.forEach((subject) => {
      if (subject.type === "LECTURE") {
        lectureHours += subject.weeklyHours;
      }

      if (subject.type === "PRACTICAL") {
        practicalHours += subject.weeklyHours;
      }
    });

    console.log(
      "\n=============================================="
    );
    console.log("             WORKLOAD SUMMARY");
    console.log(
      "=============================================="
    );

    console.log(
      `Theory weekly hours: ${lectureHours}`
    );

    console.log(
      `Practical weekly hours per batch: ${practicalHours}`
    );

    console.log(
      `Number of batches: 4`
    );

    console.log(
      `Total batch practical hours: ${
        practicalHours * 4
      }`
    );

    console.log(
      "\n✅ Semester 3 curriculum setup completed successfully."
    );

    console.log(
      "\nNo timetable was generated yet."
    );

    console.log(
      "The existing timetable generators were not modified."
    );

    console.log(
      "\n==============================================\n"
    );

    process.exit(0);
  } catch (error) {
    console.error(
      "\n❌ SETUP FAILED"
    );

    console.error(
      error.message
    );

    console.error(error);

    process.exit(1);
  }
};

run();