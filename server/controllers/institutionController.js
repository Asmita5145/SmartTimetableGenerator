const Institution = require("../models/Institution");

// GET CURRENT INSTITUTION
const getCurrentInstitution = async (req, res) => {
  try {
    let institution = req.institution;
    if (!institution) {
      institution = await Institution.findOne();
      if (!institution) {
        institution = await Institution.create({
          name: "Dr. Ashok Gujar Technical Institute's Dr. Daulatrao Aher College of Engineering, Karad",
          code: "DACOE",
          tagline: "Department of Computer Science & Engineering • B.Tech Programme",
          address: "Vidyanagar Ext. Banawadi, Karad 415124, Dist. Satara, Maharashtra",
          programmes: ["B.Tech", "M.Tech", "Diploma"],
          defaultProgramme: "B.Tech",
          academicYear: "2026-27"
        });
      }
    }

    res.status(200).json({
      success: true,
      institution
    });
  } catch (error) {
    console.error("Get current institution error:", error);
    res.status(500).json({
      message: "Failed to fetch institution details",
      error: error.message
    });
  }
};

// UPDATE CURRENT INSTITUTION
const updateCurrentInstitution = async (req, res) => {
  try {
    const institutionId = req.institutionId || req.user?.institution;
    if (!institutionId) {
      return res.status(400).json({ message: "No active institution found." });
    }

    const { name, code, tagline, address, programmes, defaultProgramme, academicYear, settings } = req.body;

    const institution = await Institution.findByIdAndUpdate(
      institutionId,
      {
        ...(name && { name: name.trim() }),
        ...(code && { code: code.trim().toUpperCase() }),
        ...(tagline !== undefined && { tagline }),
        ...(address !== undefined && { address }),
        ...(programmes && { programmes }),
        ...(defaultProgramme && { defaultProgramme }),
        ...(academicYear && { academicYear }),
        ...(settings && { settings })
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Institution settings updated successfully",
      institution
    });
  } catch (error) {
    console.error("Update institution error:", error);
    res.status(500).json({
      message: "Failed to update institution settings",
      error: error.message
    });
  }
};

// LIST ALL INSTITUTIONS
const getAllInstitutions = async (req, res) => {
  try {
    const institutions = await Institution.find().sort({ name: 1 });
    res.status(200).json({
      success: true,
      institutions
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch institutions",
      error: error.message
    });
  }
};

// CREATE INSTITUTION
const createInstitution = async (req, res) => {
  try {
    const { name, code, address, programmes, defaultProgramme, academicYear } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: "Name and code are required" });
    }

    const existing = await Institution.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: "Institution with this code already exists" });
    }

    const institution = await Institution.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      address: address || "",
      programmes: programmes || ["B.Tech", "M.Tech", "Diploma"],
      defaultProgramme: defaultProgramme || "B.Tech",
      academicYear: academicYear || "2026-27"
    });

    res.status(201).json({
      message: "Institution created successfully",
      institution
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create institution",
      error: error.message
    });
  }
};

module.exports = {
  getCurrentInstitution,
  updateCurrentInstitution,
  getAllInstitutions,
  createInstitution
};
