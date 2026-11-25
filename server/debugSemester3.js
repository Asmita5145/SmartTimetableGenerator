const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = require("./config/db");

const Department = require("./models/Department");
const Semester = require("./models/Semester");
const Division = require("./models/Division");
const Batch = require("./models/Batch");
const Subject = require("./models/Subject");
const Faculty = require("./models/Faculty");
const Room = require("./models/Room");
const TimeSlot = require("./models/TimeSlot");
const Availability = require("./models/Availability");

const run = async () => {
  try {
    await connectDB();

    console.log("\n==========================================");
    console.log("       SEMESTER 3 DATA AUDIT");
    console.log("==========================================\n");

    // ==================================================
    // 1. FIND CSE DEPARTMENT
    // ==================================================

    const department = await Department.findOne({
      $or: [
        { code: "CSE" },
        { name: /computer science/i },
      ],
    });

    if (!department) {
      throw new Error("CSE department not found.");
    }

    console.log("DEPARTMENT");
    console.log("------------------------------------------");
    console.log("Name :", department.name);
    console.log("Code :", department.code);
    console.log("ID   :", department._id.toString());

    // ==================================================
    // 2. FIND SEMESTER 3
    // ==================================================

    const semester = await Semester.findOne({
      department: department._id,
      number: 3,
    });

    if (!semester) {
      throw new Error(
        "Semester 3 not found for CSE department."
      );
    }

    console.log("\nSEMESTER");
    console.log("------------------------------------------");
    console.log("Name :", semester.name);
    console.log("Number :", semester.number);
    console.log("ID :", semester._id.toString());

    // ==================================================
    // 3. DIVISIONS
    // ==================================================

    const divisions = await Division.find({
      semester: semester._id,
    }).sort({ name: 1 });

    console.log("\nDIVISIONS");
    console.log("------------------------------------------");

    if (!divisions.length) {
      console.log("No divisions found.");
    } else {
      divisions.forEach((division) => {
        console.log(
          `${division.name} → ${division.studentCount} students`
        );
      });
    }

    const totalStudents = divisions.reduce(
      (total, division) =>
        total + division.studentCount,
      0
    );

    console.log(
      "\nTotal division students:",
      totalStudents
    );

    // ==================================================
    // 4. BATCHES
    // ==================================================

    const batches = await Batch.find({
      semester: semester._id,
      isActive: true,
    }).sort({ code: 1 });

    console.log("\nBATCHES");
    console.log("------------------------------------------");

    if (!batches.length) {
      console.log("No active batches found.");
    } else {
      batches.forEach((batch) => {
        console.log(
          `${batch.code} (${batch.name}) → ` +
          `${batch.studentCount} students ` +
          `[${batch.startRoll}-${batch.endRoll}]`
        );
      });
    }

    console.log(
      "\nActive batch count:",
      batches.length
    );

    // ==================================================
    // 5. SUBJECTS
    // ==================================================

    const subjects = await Subject.find({
      department: department._id,
      semester: semester._id,
    })
      .populate(
        "faculty",
        "name employeeId"
      )
      .sort({ code: 1 });

    console.log("\nSUBJECTS");
    console.log("------------------------------------------");

    if (!subjects.length) {
      console.log("No Semester 3 subjects found.");
    } else {
      subjects.forEach((subject) => {
        const facultyNames =
          subject.faculty?.length
            ? subject.faculty
                .map(
                  (faculty) =>
                    `${faculty.name} (${faculty.employeeId})`
                )
                .join(", ")
            : "NO FACULTY";

        console.log(
          `\n${subject.code} - ${subject.name}`
        );

        console.log(
          `Type: ${subject.type}`
        );

        console.log(
          `Weekly hours: ${subject.weeklyHours}`
        );

        console.log(
          `Practical hours: ${subject.practicalHours}`
        );

        console.log(
          `Faculty: ${facultyNames}`
        );
      });
    }

    // ==================================================
    // 6. FACULTY
    // ==================================================

    const faculty = await Faculty.find({
      department: department._id,
    }).sort({ employeeId: 1 });

    console.log("\nFACULTY");
    console.log("------------------------------------------");

    faculty.forEach((member) => {
      console.log(
        `${member.employeeId} → ${member.name}`
      );
    });

    console.log(
      "\nFaculty count:",
      faculty.length
    );

    // ==================================================
    // 7. ROOMS
    // ==================================================

    const rooms = await Room.find({
      department: department._id,
    }).sort({ type: 1, roomNumber: 1 });

    console.log("\nROOMS / LABS");
    console.log("------------------------------------------");

    const classrooms = rooms.filter(
      (room) => room.type === "CLASSROOM"
    );

    const labs = rooms.filter(
      (room) => room.type === "LAB"
    );

    console.log("\nCLASSROOMS:");

    classrooms.forEach((room) => {
      console.log(
        `${room.roomNumber} → capacity ${room.capacity}`
      );
    });

    console.log("\nLABS:");

    labs.forEach((room) => {
      console.log(
        `${room.roomNumber} → capacity ${room.capacity}`
      );
    });

    console.log(
      "\nClassroom count:",
      classrooms.length
    );

    console.log(
      "Lab count:",
      labs.length
    );

    // ==================================================
    // 8. TIME SLOTS
    // ==================================================

    const timeSlots = await TimeSlot.find({
      isBreak: false,
    }).sort({
      day: 1,
      slotNumber: 1,
    });

    console.log("\nTIME SLOTS");
    console.log("------------------------------------------");

    const academicDays = [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
    ];

    academicDays.forEach((day) => {
      const slots = timeSlots.filter(
        (slot) => slot.day === day
      );

      console.log(`\n${day}`);

      slots.forEach((slot) => {
        console.log(
          `Slot ${slot.slotNumber}: ` +
          `${slot.startTime} - ${slot.endTime}`
        );
      });
    });

    // ==================================================
    // 9. AVAILABILITY
    // ==================================================

    const availability = await Availability.find({
      $or: [
        {
          resourceType: "FACULTY",
          resourceId: {
            $in: faculty.map(
              (member) => member._id
            ),
          },
        },
        {
          resourceType: "ROOM",
          resourceId: {
            $in: rooms.map(
              (room) => room._id
            ),
          },
        },
      ],
    });

    console.log("\nAVAILABILITY");
    console.log("------------------------------------------");

    console.log(
      "Availability records:",
      availability.length
    );

    const facultyAvailability =
      availability.filter(
        (item) =>
          item.resourceType === "FACULTY"
      );

    const roomAvailability =
      availability.filter(
        (item) =>
          item.resourceType === "ROOM"
      );

    console.log(
      "Faculty availability records:",
      facultyAvailability.length
    );

    console.log(
      "Room availability records:",
      roomAvailability.length
    );

    // ==================================================
    // 10. BASIC VALIDATION
    // ==================================================

    console.log("\n==========================================");
    console.log("       BASIC DATA VALIDATION");
    console.log("==========================================");

    if (batches.length !== 4) {
      console.log(
        `⚠️ Expected 4 batches, found ${batches.length}`
      );
    } else {
      console.log(
        "✅ Exactly 4 active batches found."
      );
    }

    if (classrooms.length === 0) {
      console.log(
        "❌ No classrooms found."
      );
    } else {
      const largestCapacity = Math.max(
        ...classrooms.map(
          (room) => room.capacity
        )
      );

      console.log(
        `Largest classroom capacity: ${largestCapacity}`
      );

      if (largestCapacity < totalStudents) {
        console.log(
          `⚠️ Classroom capacity issue: ` +
          `${totalStudents} students but largest classroom ` +
          `capacity is ${largestCapacity}.`
        );
      } else {
        console.log(
          "✅ Classroom capacity is sufficient."
        );
      }
    }

    if (labs.length === 0) {
      console.log(
        "❌ No labs found."
      );
    } else {
      const smallestLabCapacity = Math.min(
        ...labs.map(
          (lab) => lab.capacity
        )
      );

      const largestBatchSize =
        batches.length
          ? Math.max(
              ...batches.map(
                (batch) =>
                  batch.studentCount
              )
            )
          : 0;

      console.log(
        `Smallest lab capacity: ${smallestLabCapacity}`
      );

      console.log(
        `Largest batch size: ${largestBatchSize}`
      );

      if (
        smallestLabCapacity >=
        largestBatchSize
      ) {
        console.log(
          "✅ Lab capacity is sufficient for all batches."
        );
      } else {
        console.log(
          "⚠️ At least one batch is larger than the smallest lab."
        );
      }
    }

    console.log("\n==========================================");
    console.log("             AUDIT COMPLETE");
    console.log("==========================================\n");

    process.exit(0);
  } catch (error) {
    console.error(
      "\n❌ AUDIT ERROR:",
      error.message
    );

    console.error(error);

    process.exit(1);
  }
};

run();