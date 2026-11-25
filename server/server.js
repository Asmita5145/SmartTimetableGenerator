const express = require("express");
const cors = require("cors");

require("dotenv").config();

const connectDB = require("./config/db");

// Routes
const authRoutes =
  require("./routes/authRoutes");

const studentRoutes =
  require("./routes/studentRoutes");

const departmentRoutes =
  require("./routes/departmentRoutes");

const semesterRoutes =
  require("./routes/semesterRoutes");

const divisionRoutes =
  require("./routes/divisionRoutes");

const facultyRoutes =
  require("./routes/facultyRoutes");

const subjectRoutes =
  require("./routes/subjectRoutes");

const roomRoutes =
  require("./routes/roomRoutes");

const timeSlotRoutes =
  require("./routes/timeSlotRoutes");

const availabilityRoutes =
  require("./routes/availabilityRoutes");

const timetableRoutes =
  require("./routes/timetableRoutes");

const timetableGeneratorRoutes =
  require("./routes/timetableGeneratorRoutes");

const masterTimetableRoutes =
  require("./routes/masterTimetableRoutes");

const institutionRoutes =
  require("./routes/institutionRoutes");

// NEW: CSE Semester Timetable
const cseSemesterTimetableRoutes =
  require("./routes/cseSemesterTimetableRoutes");

const cseMasterTimetableRoutes =
  require("./routes/cseMasterTimetableRoutes");

const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// =====================================================
// API ROUTES
// =====================================================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/institutions",
  institutionRoutes
);

app.use(
  "/api/students",
  studentRoutes
);

app.use(
  "/api/departments",
  departmentRoutes
);

app.use(
  "/api/semesters",
  semesterRoutes
);

app.use(
  "/api/divisions",
  divisionRoutes
);

app.use(
  "/api/faculty",
  facultyRoutes
);

app.use(
  "/api/subjects",
  subjectRoutes
);

app.use(
  "/api/rooms",
  roomRoutes
);

app.use(
  "/api/timeslots",
  timeSlotRoutes
);

app.use(
  "/api/availability",
  availabilityRoutes
);

app.use(
  "/api/timetables",
  timetableRoutes
);

app.use(
  "/api/timetable-generator",
  timetableGeneratorRoutes
);

app.use(
  "/api/master-timetables",
  masterTimetableRoutes
);

// NEW: CSE Semester Timetable
app.use(
  "/api/cse-semester-timetables",
  cseSemesterTimetableRoutes
);

app.use(
  "/api/cse-master-timetables",
  cseMasterTimetableRoutes
);

// =====================================================
// ROOT
// =====================================================

app.get("/", (req, res) => {
  res.status(200).json({
    message:
      "Smart Timetable API is running",
  });
});

// =====================================================
// DATABASE
// =====================================================

connectDB();

// =====================================================
// SERVER
// =====================================================

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});