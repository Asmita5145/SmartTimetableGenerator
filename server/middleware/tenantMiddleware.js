const Institution = require("../models/Institution");

/**
 * Resolves the active institution for the request and attaches to req.institution & req.institutionId
 */
const resolveTenant = async (req, res, next) => {
  try {
    let institutionId = req.user?.institution?._id || req.user?.institution;

    if (!institutionId) {
      // Check for tenant header
      const headerTenant = req.headers["x-institution-id"];
      if (headerTenant) {
        institutionId = headerTenant;
      }
    }

    let institution = null;
    if (institutionId) {
      institution = await Institution.findById(institutionId);
    }

    if (!institution) {
      // Fallback: Find first institution or create the default registered test institution
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

    req.institution = institution;
    req.institutionId = institution._id;
    next();
  } catch (error) {
    console.error("Tenant resolution error:", error);
    next();
  }
};

/**
 * Helper to build a MongoDB query filter scoped to the current institution
 */
const getTenantFilter = (req, baseQuery = {}) => {
  if (req.institutionId) {
    return { ...baseQuery, institution: req.institutionId };
  }
  return baseQuery;
};

module.exports = {
  resolveTenant,
  getTenantFilter
};
