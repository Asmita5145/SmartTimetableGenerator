require("dotenv").config();

const mongoose = require("mongoose");

// Register ALL required models before populate()
require("./models/Department");
require("./models/Semester");
require("./models/Faculty");
require("./models/Subject");
require("./models/Room");
require("./models/TimeSlot");
require("./models/Availability");

const Subject = require("./models/Subject");
const Semester = require("./models/Semester");
const Faculty = require("./models/Faculty");
const Room = require("./models/Room");
const TimeSlot = require("./models/TimeSlot");
const Availability = require("./models/Availability");

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected\n");

    // ==================================================
    // 1. FIND DISCRETE MATHEMATICS SUBJECT
    // ==================================================

    const subject = await Subject.findOne({
      name: { $regex: /Discrete Mathematics/i }
    })
      .populate("faculty")
      .populate("semester")
      .populate("department");

    if (!subject) {
      console.log("❌ Discrete Mathematics subject not found");
      return;
    }

    console.log("========================================");
    console.log("SUBJECT");
    console.log("========================================");

    console.log({
      id: subject._id.toString(),
      name: subject.name,
      code: subject.code,
      weeklyHours: subject.weeklyHours,
      practicalHours: subject.practicalHours,
      semester: subject.semester
        ? subject.semester._id.toString()
        : null,
      department: subject.department
        ? subject.department._id.toString()
        : null
    });

    console.log("\nSUBJECT FACULTY:");

    if (!subject.faculty || subject.faculty.length === 0) {
      console.log("❌ Subject has NO assigned faculty");
    } else {
      subject.faculty.forEach((faculty) => {
        console.log({
          id: faculty._id.toString(),
          name: faculty.name,
          employeeId: faculty.employeeId
        });
      });
    }

    // ==================================================
    // 2. TIME SLOTS
    // ==================================================

    const slots = await TimeSlot.find({
      day: {
        $in: [
          "MONDAY",
          "TUESDAY",
          "WEDNESDAY",
          "THURSDAY",
          "FRIDAY"
        ]
      },
      isBreak: false
    }).sort({
      day: 1,
      slotNumber: 1
    });

    console.log("\n========================================");
    console.log("TIME SLOTS");
    console.log("========================================");

    slots.forEach((slot) => {
      console.log({
        id: slot._id.toString(),
        day: slot.day,
        slotNumber: slot.slotNumber,
        start: slot.startTime,
        end: slot.endTime
      });
    });

    // ==================================================
    // 3. FACULTY AVAILABILITY FOR DMS FACULTY
    // ==================================================

    console.log("\n========================================");
    console.log("DMS FACULTY AVAILABILITY");
    console.log("========================================");

    if (!subject.faculty || subject.faculty.length === 0) {
      console.log("Cannot check faculty availability.");
    } else {
      for (const faculty of subject.faculty) {
        console.log(`\nFaculty: ${faculty.name}`);
        console.log(`Faculty ID: ${faculty._id}`);

        const records = await Availability.find({
          resourceType: "FACULTY",
          resourceId: faculty._id
        });

        console.log(`Availability records: ${records.length}`);

        if (records.length === 0) {
          console.log(
            "⚠️ NO AVAILABILITY RECORD — faculty should be unrestricted."
          );
        }

        records.forEach((record) => {
          console.log({
            id: record._id.toString(),
            day: record.day,
            availableSlots: record.availableSlots
          });
        });
      }
    }

    // ==================================================
    // 4. ALL FACULTY AVAILABILITY
    // ==================================================

    console.log("\n========================================");
    console.log("ALL FACULTY AVAILABILITY");
    console.log("========================================");

    const allFacultyAvailability = await Availability.find({
      resourceType: "FACULTY"
    });

    console.log(
      `Total faculty availability records: ${allFacultyAvailability.length}`
    );

    for (const record of allFacultyAvailability) {
      console.log({
        resourceId: record.resourceId
          ? record.resourceId.toString()
          : null,
        day: record.day,
        availableSlots: record.availableSlots
      });
    }

    // ==================================================
    // 5. ALL FACULTY
    // ==================================================

    console.log("\n========================================");
    console.log("ALL FACULTY");
    console.log("========================================");

    const allFaculty = await Faculty.find({});

    allFaculty.forEach((faculty) => {
      console.log({
        id: faculty._id.toString(),
        name: faculty.name,
        employeeId: faculty.employeeId
      });
    });

    // ==================================================
    // 6. ROOMS
    // ==================================================

    console.log("\n========================================");
    console.log("ROOMS");
    console.log("========================================");

    const rooms = await Room.find({});

    rooms.forEach((room) => {
      console.log({
        id: room._id.toString(),
        name: room.name,
        roomNumber: room.roomNumber,
        type: room.type,
        capacity: room.capacity
      });
    });

    // ==================================================
    // 7. ROOM AVAILABILITY
    // ==================================================

    console.log("\n========================================");
    console.log("ROOM AVAILABILITY");
    console.log("========================================");

    const roomAvailability = await Availability.find({
      resourceType: "ROOM"
    });

    console.log(
      `Total room availability records: ${roomAvailability.length}`
    );

    for (const record of roomAvailability) {
      console.log({
        resourceId: record.resourceId
          ? record.resourceId.toString()
          : null,
        day: record.day,
        availableSlots: record.availableSlots
      });
    }

    // ==================================================
    // 8. TEST DMS CANDIDATE SLOTS
    // ==================================================

    console.log("\n========================================");
    console.log("DMS CANDIDATE SLOT TEST");
    console.log("========================================");

    const dmsFaculty = subject.faculty?.[0];

    if (!dmsFaculty) {
      console.log("❌ No DMS faculty assigned.");
      return;
    }

    const dmsFacultyAvailability = await Availability.find({
      resourceType: "FACULTY",
      resourceId: dmsFaculty._id
    });

    console.log(
      `\nChecking faculty: ${dmsFaculty.name}`
    );

    console.log(
      `Faculty availability records: ${dmsFacultyAvailability.length}`
    );

    function isFacultyAvailable(slot) {
      // No availability record = unrestricted
      if (dmsFacultyAvailability.length === 0) {
        return true;
      }

      const dayRecord = dmsFacultyAvailability.find(
        (record) => record.day === slot.day
      );

      if (!dayRecord) {
        return false;
      }

      return dayRecord.availableSlots.some((availableSlot) => {
        if (typeof availableSlot === "number") {
          return availableSlot === slot.slotNumber;
        }

        if (typeof availableSlot === "string") {
          return (
            availableSlot === String(slot.slotNumber) ||
            availableSlot === slot._id.toString()
          );
        }

        if (
          availableSlot &&
          typeof availableSlot === "object"
        ) {
          return (
            availableSlot.slotNumber === slot.slotNumber ||
            availableSlot.slotId === slot._id.toString()
          );
        }

        return false;
      });
    }

    for (const slot of slots) {
      let status = "AVAILABLE";

      // Semester 3 fixed activities
      if (
        slot.day === "MONDAY" &&
        (
          slot.startTime === "12:45" ||
          slot.startTime === "13:45" ||
          slot.startTime === "15:00" ||
          slot.startTime === "16:00"
        )
      ) {
        status = "FIXED_ACTIVITY";
      }

      if (
        status === "AVAILABLE" &&
        !isFacultyAvailable(slot)
      ) {
        status = "FACULTY_UNAVAILABLE";
      }

      console.log(
        `${slot.day.padEnd(10)} | ` +
        `slot ${String(slot.slotNumber).padEnd(2)} | ` +
        `${slot.startTime}-${slot.endTime} | ` +
        status
      );
    }

    console.log("\n========================================");
    console.log("DEBUG COMPLETE");
    console.log("========================================");

  } catch (error) {
    console.error("\n❌ DEBUG ERROR");
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

run();