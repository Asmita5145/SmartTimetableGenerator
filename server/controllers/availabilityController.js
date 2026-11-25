const { get } = require("mongoose");
const Availability = require("../models/Availability");
const TimeSlot = require("../models/TimeSlot");

// Create availability
const createAvailability = async (req, res) => {
  try {
    const {
      resourceType,
      resourceId,
      day,
      availableSlots
    } = req.body;

    if (!resourceType || !resourceId || !day || !availableSlots) {
      return res.status(400).json({
        message: "Resource type, resource ID, day and available slots are required"
      });
    }

    // Check that all time slots exist
    const slots = await TimeSlot.find({
      _id: { $in: availableSlots },
      day,
      isBreak: false
    });

    if (slots.length !== availableSlots.length) {
      return res.status(400).json({
        message: "One or more time slots are invalid or are break slots"
      });
    }

    // Check if availability already exists
    const existingAvailability = await Availability.findOne({
      resourceType,
      resourceId,
      day
    });

    if (existingAvailability) {
      return res.status(400).json({
        message: "Availability already exists for this resource on this day"
      });
    }

    const availability = await Availability.create({
      resourceType,
      resourceId,
      day,
      availableSlots
    });

    res.status(201).json({
      message: "Availability created successfully",
      availability
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create availability",
      error: error.message
    });
  }
};

// Get all availability records
const getAvailabilities = async (req, res) => {
  try {
    const availabilities = await Availability.find()
      .populate("availableSlots", "day startTime endTime slotNumber isBreak")
      .sort({ day: 1 });

    res.status(200).json({
      message: "Availability records fetched successfully",
      availabilities
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch availability records",
      error: error.message
    });
  }
};

// Get availability by resource
const getAvailabilityByResource = async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;

    const availabilities = await Availability.find({
      resourceType,
      resourceId
    }).populate(
      "availableSlots",
      "day startTime endTime slotNumber isBreak"
    );

    res.status(200).json({
      message: "Resource availability fetched successfully",
      availabilities
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch resource availability",
      error: error.message
    });
  }
};

// Update availability
const updateAvailability = async (req, res) => {
  try {
    const { availableSlots } = req.body;

    if (!availableSlots) {
      return res.status(400).json({
        message: "Available slots are required"
      });
    }

    const availability = await Availability.findById(req.params.id);

    if (!availability) {
      return res.status(404).json({
        message: "Availability record not found"
      });
    }

    // Check that all slots exist and are not breaks
    const slots = await TimeSlot.find({
      _id: { $in: availableSlots },
      day: availability.day,
      isBreak: false
    });

    if (slots.length !== availableSlots.length) {
      return res.status(400).json({
        message: "One or more time slots are invalid or are break slots"
      });
    }

    availability.availableSlots = availableSlots;

    const updatedAvailability = await availability.save();

    res.status(200).json({
      message: "Availability updated successfully",
      availability: updatedAvailability
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update availability",
      error: error.message
    });
  }
};

// Delete availability
const deleteAvailability = async (req, res) => {
  try {
    const availability = await Availability.findById(req.params.id);

    if (!availability) {
      return res.status(404).json({
        message: "Availability record not found"
      });
    }

    await Availability.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Availability deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete availability",
      error: error.message
    });
  }
};

const generateStandardAvailability = async (req, res) => {
  try {
    const {
      resourceType,
      resourceId
    } = req.body;

    // Validate resource type
    if (!["FACULTY", "ROOM"].includes(resourceType)) {
      return res.status(400).json({
        message: "resourceType must be FACULTY or ROOM"
      });
    }

    // Validate resource ID
    if (!resourceId) {
      return res.status(400).json({
        message: "resourceId is required"
      });
    }

    // Get all non-break time slots
    const timeSlots = await TimeSlot.find({
      isBreak: false
    }).sort({
      slotNumber: 1
    });

    if (timeSlots.length === 0) {
      return res.status(404).json({
        message: "No working time slots found"
      });
    }

    const workingDays = [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY"
    ];

    const created = [];
    const skipped = [];

    for (const day of workingDays) {

      // Check if availability already exists
      const existing = await Availability.findOne({
        resourceType,
        resourceId,
        day
      });

      if (existing) {
        skipped.push(day);
        continue;
      }

      // Get slots for this day
      const daySlots = timeSlots.filter(
        (slot) => slot.day === day
      );

      if (daySlots.length === 0) {
        continue;
      }

      const availability =
        await Availability.create({
          resourceType,
          resourceId,
          day,
          availableSlots: daySlots.map(
            (slot) => slot._id
          )
        });

      created.push(availability);
    }

    res.status(201).json({
      message:
        "Standard availability generated successfully",
      resourceType,
      resourceId,
      createdDays: created.length,
      skippedDays: skipped,
      availabilities: created
    });

  } catch (error) {
    res.status(500).json({
      message:
        "Failed to generate standard availability",
      error: error.message
    });
  }
};

module.exports = {
  createAvailability,
  getAvailabilities,
  getAvailabilityByResource,
  updateAvailability,
  deleteAvailability,
  generateStandardAvailability
};