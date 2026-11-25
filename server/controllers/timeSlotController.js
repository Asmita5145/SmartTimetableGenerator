const TimeSlot = require("../models/TimeSlot");

// Create a time slot
const createTimeSlot = async (req, res) => {
  try {
    const {
      day,
      startTime,
      endTime,
      slotNumber,
      isBreak
    } = req.body;

    if (!day || !startTime || !endTime || !slotNumber) {
      return res.status(400).json({
        message: "Day, start time, end time and slot number are required"
      });
    }

    // Check duplicate slot
    const existingSlot = await TimeSlot.findOne({
      day,
      slotNumber
    });

    if (existingSlot) {
      return res.status(400).json({
        message: "This time slot already exists for this day"
      });
    }

    const timeSlot = await TimeSlot.create({
      day,
      startTime,
      endTime,
      slotNumber,
      isBreak: isBreak || false
    });

    res.status(201).json({
      message: "Time slot created successfully",
      timeSlot
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create time slot",
      error: error.message
    });
  }
};

// Generate standard time slots for Monday to Friday
const generateStandardTimeSlots = async (req, res) => {
  try {
    const days = [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY"
    ];

    const standardSlots = [
      {
        slotNumber: 1,
        startTime: "10:00",
        endTime: "11:00",
        isBreak: false
      },
      {
        slotNumber: 2,
        startTime: "11:00",
        endTime: "12:00",
        isBreak: false
      },
      {
        slotNumber: 3,
        startTime: "12:00",
        endTime: "12:45",
        isBreak: true
      },
      {
        slotNumber: 4,
        startTime: "12:45",
        endTime: "13:45",
        isBreak: false
      },
      {
        slotNumber: 5,
        startTime: "13:45",
        endTime: "14:45",
        isBreak: false
      },
      {
        slotNumber: 6,
        startTime: "14:45",
        endTime: "15:00",
        isBreak: true
      },
      {
        slotNumber: 7,
        startTime: "15:00",
        endTime: "16:00",
        isBreak: false
      },
      {
        slotNumber: 8,
        startTime: "16:00",
        endTime: "17:00",
        isBreak: false
      }
    ];

    const createdSlots = [];
    const existingSlots = [];

    for (const day of days) {
      for (const slot of standardSlots) {
        const existingSlot = await TimeSlot.findOne({
          day,
          slotNumber: slot.slotNumber
        });

        if (existingSlot) {
          existingSlots.push(existingSlot);
        } else {
          const newSlot = await TimeSlot.create({
            day,
            ...slot
          });

          createdSlots.push(newSlot);
        }
      }
    }

    res.status(201).json({
      message: "Standard time slots generated successfully",
      createdCount: createdSlots.length,
      existingCount: existingSlots.length,
      createdSlots
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate standard time slots",
      error: error.message
    });
  }
};

// Get all time slots
const getTimeSlots = async (req, res) => {
  try {
    const timeSlots = await TimeSlot.find()
      .sort({ day: 1, slotNumber: 1 });

    res.status(200).json({
      message: "Time slots fetched successfully",
      timeSlots
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch time slots",
      error: error.message
    });
  }
};

module.exports = {
  createTimeSlot,
  generateStandardTimeSlots,
  getTimeSlots
};