const Room = require("../models/Room");
const Department = require("../models/Department");

// Create room
const createRoom = async (req, res) => {
  try {
    const {
      name,
      roomNumber,
      type,
      capacity,
      department,
      facilities
    } = req.body;

    if (!name || !roomNumber || !type || !capacity || !department) {
      return res.status(400).json({
        message: "Name, room number, type, capacity and department are required"
      });
    }

    // Check department
    const existingDepartment = await Department.findById(department);

    if (!existingDepartment) {
      return res.status(404).json({
        message: "Department not found"
      });
    }

    // Check duplicate room number
    const existingRoom = await Room.findOne({ roomNumber });

    if (existingRoom) {
      return res.status(400).json({
        message: "Room with this room number already exists"
      });
    }

    const room = await Room.create({
      name,
      roomNumber,
      type,
      capacity,
      department,
      facilities: facilities || []
    });

    res.status(201).json({
      message: "Room created successfully",
      room
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create room",
      error: error.message
    });
  }
};

// Get all rooms
const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find()
      .populate("department", "name code")
      .sort({ roomNumber: 1 });

    res.status(200).json({
      message: "Rooms fetched successfully",
      rooms
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch rooms",
      error: error.message
    });
  }
};

// Get room by ID
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate("department", "name code");

    if (!room) {
      return res.status(404).json({
        message: "Room not found"
      });
    }

    res.status(200).json({
      message: "Room fetched successfully",
      room
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch room",
      error: error.message
    });
  }
};

// Update room
const updateRoom = async (req, res) => {
  try {
    const {
      name,
      roomNumber,
      type,
      capacity,
      department,
      facilities
    } = req.body;

    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        message: "Room not found"
      });
    }

    if (department) {
      const existingDepartment = await Department.findById(department);

      if (!existingDepartment) {
        return res.status(404).json({
          message: "Department not found"
        });
      }

      room.department = department;
    }

    if (name) room.name = name;
    if (roomNumber) room.roomNumber = roomNumber;
    if (type) room.type = type;
    if (capacity) room.capacity = capacity;
    if (facilities !== undefined) room.facilities = facilities;

    const updatedRoom = await room.save();

    res.status(200).json({
      message: "Room updated successfully",
      room: updatedRoom
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update room",
      error: error.message
    });
  }
};

// Delete room
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        message: "Room not found"
      });
    }

    await Room.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Room deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete room",
      error: error.message
    });
  }
};

module.exports = {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom
};