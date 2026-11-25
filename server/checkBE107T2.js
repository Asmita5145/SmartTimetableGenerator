require("dotenv").config();

const mongoose = require("mongoose");

const Subject = require("./models/Subject");
const TimeSlot = require("./models/TimeSlot");
const Faculty = require("./models/Faculty");
const Room = require("./models/Room");
const Batch = require("./models/Batch");
const Availability = require("./models/Availability");

const SEMESTER_ID = "6acb8833e2de18aa208ce16a";
const BATCH_ID = "6acd9b66ccf7dec1902d9223"; // T2
const BE107_CODE = "BE107";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
];

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected.\n");

    const subject = await Subject.findOne({
      code: BE107_CODE,
      semester: SEMESTER_ID,
    }).populate("faculty");

    const batch = await Batch.findById(BATCH_ID);

    const faculty = subject.faculty[0];

    console.log("===== BE107 =====");
    console.log(subject.name);
    console.log("Faculty:", faculty.name);
    console.log("Faculty ID:", faculty._id.toString());

    console.log("\n===== T2 =====");
    console.log(batch);

    const slots = await TimeSlot.find({
      day: { $in: DAYS },
      isBreak: false,
    }).sort({
      day: 1,
      slotNumber: 1,
    });

    const labs = await Room.find({
      type: { $regex: "LAB", $options: "i" },
    });

    const facultyAvailability = await Availability.find({
      resourceType: "FACULTY",
      resourceId: faculty._id,
    });

    const labAvailability = await Availability.find({
      resourceType: "ROOM",
      resourceId: { $in: labs.map((lab) => lab._id) },
    });

    console.log("\n===== LABS =====");
    console.log(
      labs.map((lab) => ({
        name: lab.name,
        capacity: lab.capacity,
      }))
    );

    console.log("\n===== FACULTY AVAILABILITY =====");
    console.log(JSON.stringify(facultyAvailability, null, 2));

    console.log("\n===== POSSIBLE 2-HOUR BLOCKS =====");

    for (const day of DAYS) {
      const daySlots = slots
        .filter((slot) => slot.day === day)
        .sort((a, b) => a.slotNumber - b.slotNumber);

      for (let i = 0; i < daySlots.length - 1; i++) {
        const first = daySlots[i];
        const second = daySlots[i + 1];

        const consecutive =
          second.slotNumber === first.slotNumber + 1;

        if (!consecutive) continue;

        console.log(
          `\n${day} ${first.startTime}-${second.endTime}`
        );

        // Faculty availability
        const facultyRecord = facultyAvailability.find(
          (a) => a.day === day
        );

        let facultyFree = true;

        if (facultyRecord) {
          const availableIds = facultyRecord.availableSlots.map(
            (id) => id.toString()
          );

          facultyFree =
            availableIds.includes(first._id.toString()) &&
            availableIds.includes(second._id.toString());
        }

        console.log(
          "Faculty available:",
          facultyFree
        );

        // Lab availability
        let suitableLab = null;

        for (const lab of labs) {
          if (
            !lab.capacity ||
            !batch ||
            lab.capacity < batch.studentCount
          ) {
            continue;
          }

          const record = labAvailability.find(
            (a) =>
              a.resourceId.toString() ===
                lab._id.toString() &&
              a.day === day
          );

          let available = true;

          if (record) {
            const availableIds =
              record.availableSlots.map((id) =>
                id.toString()
              );

            available =
              availableIds.includes(first._id.toString()) &&
              availableIds.includes(second._id.toString());
          }

          if (available) {
            suitableLab = lab;
            break;
          }
        }

        console.log(
          "Suitable lab:",
          suitableLab
            ? suitableLab.name
            : "NONE"
        );

        console.log(
          "BLOCK RESULT:",
          facultyFree && suitableLab
            ? "VALID"
            : "INVALID"
        );
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();