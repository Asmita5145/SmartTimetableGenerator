import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import "./App.css";

import Login from "./pages/Login";
import Register from "./pages/Register";

import AdminDashboard from "./pages/AdminDashboard";
import AdminLayout from "./components/AdminLayout";

import StudentLayout from "./components/StudentLayout";
import FacultyLayout from "./components/FacultyLayout";

import StudentDashboard from "./pages/StudentDashboard";
import StudentTimetable from "./pages/StudentTimetable";
import StudentSchedule from "./pages/StudentSchedule";
import StudentProfile from "./pages/StudentProfile";
import FacultyDashboard from "./pages/FacultyDashboard";

import Departments from "./pages/Departments";
import Semesters from "./pages/Semesters";
import Divisions from "./pages/Divisions";
import Faculty from "./pages/Faculty";
import Subjects from "./pages/Subjects";
import Rooms from "./pages/Rooms";
import TimeSlots from "./pages/TimeSlots";
import Availability from "./pages/Availability";
import TimetableGenerator from "./pages/TimetableGenerator";
import Timetables from "./pages/Timetables";
import TimetableDetails from "./pages/TimetableDetails";
import Students from "./pages/Students";
import MasterTimetable from "./pages/MasterTimetable";
import CseSemesterTimetable from "./pages/CseSemesterTimetable";
import FacultySchedule from "./pages/FacultySchedule";
import RoomSchedule from "./pages/RoomSchedule";
import WorkloadReport from "./pages/WorkloadReport";

import { useAuth } from "./context/AuthContext";

const App = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <BrowserRouter>
      <Routes>

        {/* ==================== */}
        {/* LOGIN */}
        {/* ==================== */}

        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate
                to={
                  ["ADMIN", "HOD", "COORDINATOR"].includes(user?.role)
                    ? "/dashboard"
                    : user?.role === "FACULTY"
                    ? "/faculty-dashboard"
                    : "/student-dashboard"
                }
                replace
              />
            ) : (
              <Login />
            )
          }
        />

        {/* ==================== */}
        {/* REGISTER */}
        {/* ==================== */}

        <Route
          path="/register"
          element={
            isAuthenticated ? (
              <Navigate
                to={
                  ["ADMIN", "HOD", "COORDINATOR"].includes(user?.role)
                    ? "/dashboard"
                    : user?.role === "FACULTY"
                    ? "/faculty-dashboard"
                    : "/student-dashboard"
                }
                replace
              />
            ) : (
              <Register />
            )
          }
        />

        {/* ==================== */}
        {/* ADMIN & MANAGEMENT PANEL */}
        {/* ==================== */}

        <Route
          element={
            isAuthenticated &&
            ["ADMIN", "HOD", "COORDINATOR"].includes(user?.role) ? (
              <AdminLayout />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
          }
        >
          <Route
            path="/dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="/faculty-schedule"
            element={<FacultySchedule />}
          />

          <Route
            path="/room-schedule"
            element={<RoomSchedule />}
          />

          <Route
            path="/workload-report"
            element={<WorkloadReport />}
          />

          <Route
            path="/workload"
            element={<WorkloadReport />}
          />

          <Route
            path="/reports"
            element={<WorkloadReport />}
          />

          <Route
            path="/departments"
            element={<Departments />}
          />

          <Route
            path="/semesters"
            element={<Semesters />}
          />

          <Route
            path="/divisions"
            element={<Divisions />}
          />

          <Route
            path="/students"
            element={<Students />}
          />

          <Route
            path="/faculty"
            element={<Faculty />}
          />

          <Route
            path="/subjects"
            element={<Subjects />}
          />

          <Route
            path="/rooms"
            element={<Rooms />}
          />

          <Route
            path="/timeslots"
            element={<TimeSlots />}
          />

          <Route
            path="/availability"
            element={<Availability />}
          />

          <Route
            path="/timetable-generator"
            element={<TimetableGenerator />}
          />

          <Route
            path="/semester-timetables"
            element={<Timetables />}
          />

          <Route
            path="/cse-semester-timetable"
            element={<Navigate to="/timetables" replace />}
          />
          
          <Route
            path="/timetables"
            element={<Timetables />}
          />

          <Route
            path="/master-timetable"
            element={<MasterTimetable />}
          />
          
          <Route
            path="/timetables/:id"
            element={<TimetableDetails />}
          />

        </Route>

        {/* ==================== */}
        {/* STUDENT PORTAL */}
        {/* ==================== */}

        <Route
          element={
            isAuthenticated &&
            user?.role === "STUDENT" ? (
              <StudentLayout />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
          }
        >
          <Route
            path="/student-dashboard"
            element={<StudentDashboard />}
          />

          <Route
            path="/student-timetable"
            element={<StudentTimetable />}
          />

          <Route
            path="/student-schedule"
            element={<StudentSchedule />}
          />

          <Route
            path="/student-profile"
            element={<StudentProfile />}
          />
        </Route>

        {/* ==================== */}
        {/* FACULTY PORTAL */}
        {/* ==================== */}

        <Route
          element={
            isAuthenticated && user?.role === "FACULTY" ? (
              <FacultyLayout />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route
            path="/faculty-dashboard"
            element={<FacultyDashboard />}
          />

          <Route
            path="/faculty-timetable"
            element={<FacultySchedule />}
          />

          <Route
            path="/faculty-schedule-today"
            element={<FacultyDashboard />}
          />

          <Route
            path="/faculty-workload"
            element={<WorkloadReport />}
          />

          <Route
            path="/faculty-profile"
            element={<FacultyDashboard />}
          />
        </Route>

        {/* ==================== */}
        {/* DEFAULT ROUTE */}
        {/* ==================== */}

        <Route
          path="*"
          element={
            <Navigate
              to={
                !isAuthenticated
                  ? "/login"
                  : user?.role === "ADMIN"
                  ? "/dashboard"
                  : user?.role === "FACULTY"
                  ? "/faculty-dashboard"
                  : "/student-dashboard"
              }
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
};

export default App;
