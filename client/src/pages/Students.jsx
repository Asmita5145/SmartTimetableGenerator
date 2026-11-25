import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const Students = () => {
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [divisions, setDivisions] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    semester: "",
    division: "",
    batch: "",
    rollNumber: "",
  });

  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // LOAD DATA
  // =====================================================

  useEffect(() => {
    fetchStudents();
    fetchDepartments();
    fetchDivisions();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);

      const response = await api.get("/students");

      setStudents(response.data.students || []);
      setError("");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load students"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get("/departments");

      setDepartments(response.data.departments || []);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load departments"
      );
    }
  };

  const fetchSemesters = async (departmentId) => {
    if (!departmentId) {
      setSemesters([]);
      return;
    }

    try {
      const response = await api.get(
        `/semesters?department=${departmentId}`
      );

      setSemesters(response.data.semesters || []);
    } catch (error) {
      console.error("Failed to load semesters:", error);

      // Fallback in case the semesters endpoint
      // returns all semesters.
      try {
        const response = await api.get("/semesters");

        const allSemesters =
          response.data.semesters || [];

        const filtered = allSemesters.filter(
          (semester) =>
            String(
              semester.department?._id ||
                semester.department
            ) === String(departmentId)
        );

        setSemesters(filtered);
      } catch (fallbackError) {
        setError(
          fallbackError.response?.data?.message ||
            "Failed to load semesters"
        );
      }
    }
  };

  const fetchDivisions = async () => {
    try {
      const response = await api.get("/divisions");

      setDivisions(response.data.divisions || []);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load divisions"
      );
    }
  };

  // =====================================================
  // FORM
  // =====================================================

  const handleChange = async (e) => {
    const { name, value } = e.target;

    if (name === "department") {
      setFormData((prev) => ({
        ...prev,
        department: value,
        semester: "",
        division: "",
        batch: "",
      }));

      setSemesters([]);

      await fetchSemesters(value);

      return;
    }

    if (name === "semester") {
      setFormData((prev) => ({
        ...prev,
        semester: value,
        division: "",
        batch: "",
      }));

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      department: "",
      semester: "",
      division: "",
      batch: "",
      rollNumber: "",
    });

    setSemesters([]);
    setEditingId(null);
  };

  // =====================================================
  // CREATE / UPDATE
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (
        !formData.department ||
        !formData.semester
      ) {
        setError(
          "Please select a department and semester."
        );

        setSaving(false);
        return;
      }

      const data = {
        name: formData.name,
        email: formData.email,
        department: formData.department,
        semester: formData.semester,
        division: formData.division || null,
      };

      if (!editingId) {
        data.password = formData.password;
      } else if (formData.password) {
        data.password = formData.password;
      }

      if (editingId) {
        await api.put(
          `/students/${editingId}`,
          data
        );

        setSuccess(
          "Student updated successfully."
        );
      } else {
        await api.post("/students", {
          ...data,
          password: formData.password,
        });

        setSuccess(
          "Student added successfully."
        );
      }

      resetForm();
      fetchStudents();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to save student"
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // EDIT
  // =====================================================

  const handleEdit = async (student) => {
    const departmentId =
      student.department?._id ||
      student.department ||
      "";

    const semesterId =
      student.semester?._id ||
      student.semester ||
      "";

    const divisionId =
      student.division?._id ||
      student.division ||
      "";

    setEditingId(student._id);

    setFormData({
      name: student.name || "",
      email: student.email || "",
      password: "",
      department: departmentId,
      semester: semesterId,
      division: divisionId,
      batch: student.batch || "",
      rollNumber: student.rollNumber || "",
    });

    setError("");
    setSuccess("");

    if (departmentId) {
      await fetchSemesters(departmentId);
    }
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this student?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`/students/${id}`);

      setSuccess(
        "Student deleted successfully."
      );

      fetchStudents();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to delete student"
      );
    }
  };

  // =====================================================
  // FILTER STUDENTS
  // =====================================================

  const filteredStudents = useMemo(() => {
    const searchText =
      search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        !searchText ||
        student.name
          ?.toLowerCase()
          .includes(searchText) ||
        student.email
          ?.toLowerCase()
          .includes(searchText);

      const studentDivisionId =
        student.division?._id ||
        student.division ||
        "";

      const matchesDivision =
        !divisionFilter ||
        (divisionFilter === "UNASSIGNED"
          ? !student.division
          : studentDivisionId === divisionFilter);

      return (
        matchesSearch &&
        matchesDivision
      );
    });
  }, [
    students,
    search,
    divisionFilter,
  ]);

  // =====================================================
  // COUNTS
  // =====================================================

  const totalStudents =
    students.length;

  const assignedStudents =
    students.filter(
      (student) => student.semester
    ).length;

  const unassignedStudents =
    totalStudents -
    assignedStudents;

  // Divisions available for selected semester
  const availableDivisions =
    formData.semester
      ? divisions.filter(
          (division) =>
            String(
              division.semester?._id ||
                division.semester
            ) === String(formData.semester)
        )
      : [];

  const selectedSemesterObj = semesters.find(
    (s) => String(s._id) === String(formData.semester)
  );

  const availableBatches = useMemo(() => {
    if (!selectedSemesterObj) return [];
    if (selectedSemesterObj.practicalBatches?.length) {
      return selectedSemesterObj.practicalBatches;
    }
    const semNum = selectedSemesterObj.number;
    if (semNum === 3) return ["S1", "S2", "S3", "S4"];
    if (semNum === 5) return ["T1", "T2", "T3", "T4"];
    if (semNum === 7) return ["B1", "B2", "B3", "B4"];
    return [];
  }, [selectedSemesterObj]);

  // =====================================================
  // UI
  // =====================================================

  return (
    <div>
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <h1>Students</h1>

          <p>
            Manage students and assign their
            academic department, semester and
            optional division.
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="page-error">
          {error}
        </div>
      )}

      {success && (
        <div className="page-success">
          {success}
        </div>
      )}

      {/* Statistics */}
      <div className="dashboard-cards student-stat-cards">

        <div className="stat-card">
          <div className="stat-icon">
            S
          </div>

          <div>
            <span>Total Students</span>
            <h2>{totalStudents}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            ✓
          </div>

          <div>
            <span>Assigned</span>
            <h2>{assignedStudents}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            !
          </div>

          <div>
            <span>Unassigned</span>
            <h2>{unassignedStudents}</h2>
          </div>
        </div>

      </div>

      {/* Add / Edit + Student List */}
      <div className="management-grid">

        {/* FORM */}
        <div className="management-card">

          <div className="card-header">
            <div>
              <h2>
                {editingId
                  ? "Edit Student"
                  : "Add Student"}
              </h2>

              <p>
                {editingId
                  ? "Update student information and academic assignment."
                  : "Create a student account and assign an academic semester."}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>

            {/* Name */}
            <div className="form-group">
              <label>Student Name</label>

              <input
                type="text"
                name="name"
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label>Email</label>

              <input
                type="email"
                name="email"
                placeholder="student@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label>
                Password{" "}
                {editingId && (
                  <span className="optional-label">
                    (leave blank to keep current)
                  </span>
                )}
              </label>

              <input
                type="password"
                name="password"
                placeholder={
                  editingId
                    ? "New password"
                    : "Minimum 6 characters"
                }
                value={formData.password}
                onChange={handleChange}
                required={!editingId}
                minLength={6}
              />
            </div>

            {/* Department */}
            <div className="form-group">
              <label>Department</label>

              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
              >
                <option value="">
                  Select Department
                </option>

                {departments.map(
                  (department) => (
                    <option
                      key={department._id}
                      value={department._id}
                    >
                      {department.name}
                      {department.code
                        ? ` (${department.code})`
                        : ""}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Semester */}
            <div className="form-group">
              <label>Semester</label>

              <select
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                required
                disabled={!formData.department}
              >
                <option value="">
                  {!formData.department
                    ? "Select department first"
                    : "Select Semester"}
                </option>

                {semesters.map(
                  (semester) => (
                    <option
                      key={semester._id}
                      value={semester._id}
                    >
                      {semester.name}
                      {semester.number
                        ? ` — Semester ${semester.number}`
                        : ""}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Division */}
            <div className="form-group">
              <label>
                Division{" "}
                <span className="optional-label">
                  (optional)
                </span>
              </label>

              <select
                name="division"
                value={formData.division}
                onChange={handleChange}
                disabled={!formData.semester}
              >
                <option value="">
                  No Division / Not Assigned
                </option>

                {availableDivisions.map(
                  (division) => (
                    <option
                      key={division._id}
                      value={division._id}
                    >
                      Division {division.name}
                    </option>
                  )
                )}
              </select>

              {formData.semester &&
                availableDivisions.length === 0 && (
                  <small className="form-help">
                    This semester currently has
                    no divisions. The student will
                    be assigned directly to the
                    semester.
                  </small>
                )}
            </div>

            {/* Practical Batch */}
            <div className="form-group">
              <label>
                Practical Batch{" "}
                <span className="optional-label">
                  (for Lab Sessions)
                </span>
              </label>

              <select
                name="batch"
                value={formData.batch}
                onChange={handleChange}
                disabled={!formData.semester}
              >
                <option value="">
                  Select Practical Batch
                </option>

                {availableBatches.map((b) => (
                  <option key={b} value={b}>
                    Batch {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Roll Number */}
            <div className="form-group">
              <label>
                Roll Number{" "}
                <span className="optional-label">
                  (optional)
                </span>
              </label>

              <input
                type="text"
                name="rollNumber"
                placeholder="e.g. 15"
                value={formData.rollNumber}
                onChange={handleChange}
              />
            </div>

            {/* Buttons */}
            <div className="form-actions">

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Student"
                  : "Add Student"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}

            </div>

          </form>
        </div>

        {/* STUDENT LIST */}
        <div className="management-card">

          <div className="card-header">
            <div>
              <h2>Student List</h2>

              <p>
                {filteredStudents.length} student
                {filteredStudents.length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="student-filters">

            <div className="form-group">
              <label>Search</label>

              <input
                type="text"
                placeholder="Search name or email..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label>Division</label>

              <select
                value={divisionFilter}
                onChange={(e) =>
                  setDivisionFilter(
                    e.target.value
                  )
                }
              >
                <option value="">
                  All Divisions
                </option>

                <option value="UNASSIGNED">
                  No Division
                </option>

                {divisions.map((division) => (
                  <option
                    key={division._id}
                    value={division._id}
                  >
                    Division {division.name}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* List */}
          {loading ? (
            <div className="empty-state">
              Loading students...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="empty-state">
              <h3>No students found</h3>

              <p>
                Try changing your search or
                division filter.
              </p>
            </div>
          ) : (
            <div className="student-list">

              {filteredStudents.map(
                (student) => {

                  const division =
                    student.division;

                  return (
                    <div
                      className="student-item"
                      key={student._id}
                    >

                      <div className="student-info">

                        <div className="student-avatar">
                          {student.name
                            ?.charAt(0)
                            ?.toUpperCase()}
                        </div>

                        <div>
                          <h3>
                            {student.name}
                          </h3>

                          <span className="student-email">
                            {student.email}
                          </span>

                          {student.department ||
                          student.semester ? (
                            <p>
                              {student.department?.code ||
                                student.department?.name ||
                                "Department"}

                              {student.semester
                                ? ` • ${student.semester.name}`
                                : ""}

                              {division
                                ? ` • Division ${division.name}`
                                : " • No Division"}
                              {student.batch
                                ? ` • Batch ${student.batch}`
                                : ""}
                              {student.rollNumber
                                ? ` • Roll #${student.rollNumber}`
                                : ""}
                            </p>
                          ) : (
                            <p className="student-unassigned">
                              Academic assignment pending
                            </p>
                          )}
                        </div>

                      </div>

                      <div className="item-actions">

                        <button
                          className="edit-button"
                          onClick={() =>
                            handleEdit(student)
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="delete-button"
                          onClick={() =>
                            handleDelete(
                              student._id
                            )
                          }
                        >
                          Delete
                        </button>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default Students;