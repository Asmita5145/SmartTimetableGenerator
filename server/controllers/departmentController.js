const Department = require("../models/Department");

// Create department
const createDepartment = async (req, res) => {
  try {
    const { name, code, description } = req.body;

    // Check required fields
    if (!name || !code) {
      return res.status(400).json({
        message: "Department name and code are required"
      });
    }

    // Check if department already exists
    const existingDepartment = await Department.findOne({
      $or: [{ name }, { code }]
    });

    if (existingDepartment) {
      return res.status(400).json({
        message: "Department with this name or code already exists"
      });
    }

    // Create department
    const department = await Department.create({
      name,
      code,
      description
    });

    res.status(201).json({
      message: "Department created successfully",
      department
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create department",
      error: error.message
    });
  }
};

// Get all departments
const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({
      name: 1
    });

    res.status(200).json({
      message: "Departments fetched successfully",
      departments
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch departments",
      error: error.message
    });
  }
};

// Get single department
const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        message: "Department not found"
      });
    }

    res.status(200).json({
      message: "Department fetched successfully",
      department
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch department",
      error: error.message
    });
  }
};

// Update department
const updateDepartment = async (req, res) => {
  try {
    const { name, code, description } = req.body;

    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        message: "Department not found"
      });
    }

    // Update only provided fields
    if (name) department.name = name;
    if (code) department.code = code;
    if (description !== undefined) {
      department.description = description;
    }

    const updatedDepartment = await department.save();

    res.status(200).json({
      message: "Department updated successfully",
      department: updatedDepartment
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update department",
      error: error.message
    });
  }
};

// Delete department
const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        message: "Department not found"
      });
    }

    await Department.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Department deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete department",
      error: error.message
    });
  }
};

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
};