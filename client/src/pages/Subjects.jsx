import { useEffect, useState } from "react";
import api from "../services/api";

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [faculty, setFaculty] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "LECTURE",
    department: "",
    semester: "",
    weeklyHours: "",
    practicalHours: "",
    faculty: [],
  });

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchSubjects();
    fetchDepartments();
    fetchSemesters();
    fetchFaculty();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);

      const response = await api.get("/subjects");

      setSubjects(response.data.subjects || []);
      setError("");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load subjects"
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

  const fetchSemesters = async () => {
    try {
      const response = await api.get("/semesters");

      setSemesters(response.data.semesters || []);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load semesters"
      );
    }
  };

  const fetchFaculty = async () => {
    try {
      const response = await api.get("/faculty");

      setFaculty(response.data.faculty || []);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load faculty"
      );
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFacultyChange = (e) => {
    const selectedOptions = Array.from(
      e.target.selectedOptions
    ).map((option) => option.value);

    setFormData((prev) => ({
      ...prev,
      faculty: selectedOptions,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      type: "LECTURE",
      department: "",
      semester: "",
      weeklyHours: "",
      practicalHours: "",
      faculty: [],
    });

    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const data = {
        name: formData.name,
        code: formData.code,
        type: formData.type,
        department: formData.department,
        semester: formData.semester,
        weeklyHours: Number(formData.weeklyHours),
        practicalHours:
          formData.type === "PRACTICAL"
            ? Number(formData.practicalHours || 0)
            : 0,
        faculty: formData.faculty,
      };

      if (editingId) {
        await api.put(`/subjects/${editingId}`, data);
        setSuccess("Subject updated successfully.");
      } else {
        await api.post("/subjects", data);
        setSuccess("Subject added successfully.");
      }

      resetForm();
      fetchSubjects();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to save subject"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (subject) => {
    setEditingId(subject._id);

    setFormData({
      name: subject.name || "",
      code: subject.code || "",
      type: subject.type || "LECTURE",
      department:
        subject.department?._id ||
        subject.department ||
        "",
      semester:
        subject.semester?._id ||
        subject.semester ||
        "",
      weeklyHours: subject.weeklyHours || "",
      practicalHours: subject.practicalHours || "",
      faculty: Array.isArray(subject.faculty)
        ? subject.faculty.map((member) =>
            member?._id ? member._id : member
          )
        : [],
    });

    setError("");
    setSuccess("");
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this subject?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`/subjects/${id}`);

      setSuccess("Subject deleted successfully.");
      fetchSubjects();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to delete subject"
      );
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Subjects</h1>
          <p>
            Manage subjects, academic requirements and assigned faculty.
          </p>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {success && (
        <div className="page-success">{success}</div>
      )}

      <div className="management-grid">
        {/* Form */}
        <div className="management-card">
          <div className="card-header">
            <div>
              <h2>
                {editingId ? "Edit Subject" : "Add Subject"}
              </h2>

              <p>
                {editingId
                  ? "Update subject information."
                  : "Create a new subject."}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Subject Name</label>

              <input
                type="text"
                name="name"
                placeholder="e.g. Database Management Systems"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Subject Code</label>

              <input
                type="text"
                name="code"
                placeholder="e.g. DBMS101"
                value={formData.code}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Subject Type</label>

              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
              >
                <option value="LECTURE">
                  Lecture
                </option>

                <option value="PRACTICAL">
                  Practical
                </option>

                <option value="TUTORIAL">
                  Tutorial
                </option>
              </select>
            </div>

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

                {departments.map((department) => (
                  <option
                    key={department._id}
                    value={department._id}
                  >
                    {department.name} ({department.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Semester</label>

              <select
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                required
              >
                <option value="">
                  Select Semester
                </option>

                {semesters.map((semester) => (
                  <option
                    key={semester._id}
                    value={semester._id}
                  >
                    {semester.name} —{" "}
                    {semester.department?.code ||
                      "Department"}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Weekly Hours</label>

              <input
                type="number"
                name="weeklyHours"
                min="1"
                placeholder="e.g. 5"
                value={formData.weeklyHours}
                onChange={handleChange}
                required
              />
            </div>

            {formData.type === "PRACTICAL" && (
              <div className="form-group">
                <label>Practical Hours</label>

                <input
                  type="number"
                  name="practicalHours"
                  min="0"
                  placeholder="e.g. 2"
                  value={formData.practicalHours}
                  onChange={handleChange}
                />
              </div>
            )}

            <div className="form-group">
              <label>
                Faculty
              </label>

              <select
                multiple
                value={formData.faculty}
                onChange={handleFacultyChange}
                size="4"
              >
                {faculty.map((member) => (
                  <option
                    key={member._id}
                    value={member._id}
                  >
                    {member.name} (
                    {member.employeeId})
                  </option>
                ))}
              </select>

              <small>
                Hold Ctrl and select multiple faculty members if required.
              </small>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Subject"
                  : "Add Subject"}
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

        {/* List */}
        <div className="management-card">
          <div className="card-header">
            <div>
              <h2>Subject List</h2>

              <p>
                {subjects.length} subject
                {subjects.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              Loading subjects...
            </div>
          ) : subjects.length === 0 ? (
            <div className="empty-state">
              No subjects found.
            </div>
          ) : (
            <div className="department-list">
              {subjects.map((subject) => (
                <div
                  className="department-item"
                  key={subject._id}
                >
                  <div className="department-info">
                    <h3>{subject.name}</h3>

                    <span className="department-code">
                      {subject.code} • {subject.type}
                    </span>

                    <p>
                      {subject.department?.name ||
                        "Unknown Department"}{" "}
                      •{" "}
                      {subject.semester?.name ||
                        "Unknown Semester"}
                    </p>

                    <p>
                      Weekly Hours:{" "}
                      {subject.weeklyHours}
                    </p>
                  </div>

                  <div className="item-actions">
                    <button
                      className="edit-button"
                      onClick={() =>
                        handleEdit(subject)
                      }
                    >
                      Edit
                    </button>

                    <button
                      className="delete-button"
                      onClick={() =>
                        handleDelete(subject._id)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Subjects;