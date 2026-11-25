import { useEffect, useState } from "react";
import api from "../services/api";

const Divisions = () => {
  const [divisions, setDivisions] = useState([]);
  const [semesters, setSemesters] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    semester: "",
    studentCount: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchDivisions();
    fetchSemesters();
  }, []);

  const fetchDivisions = async () => {
    try {
      setLoading(true);

      const response = await api.get("/divisions");

      setDivisions(response.data.divisions || []);
      setError("");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load divisions"
      );
    } finally {
      setLoading(false);
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

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      semester: "",
      studentCount: "",
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
        semester: formData.semester,
        studentCount: Number(formData.studentCount),
      };

      if (editingId) {
        await api.put(`/divisions/${editingId}`, data);
        setSuccess("Division updated successfully.");
      } else {
        await api.post("/divisions", data);
        setSuccess("Division added successfully.");
      }

      resetForm();
      fetchDivisions();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to save division"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (division) => {
    setEditingId(division._id);

    setFormData({
      name: division.name || "",
      semester:
        division.semester?._id ||
        division.semester ||
        "",
      studentCount: division.studentCount || "",
    });

    setError("");
    setSuccess("");
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this division?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`/divisions/${id}`);

      setSuccess("Division deleted successfully.");
      fetchDivisions();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to delete division"
      );
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Divisions</h1>
          <p>
            Manage divisions and assign them to semesters.
          </p>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {success && (
        <div className="page-success">{success}</div>
      )}

      <div className="management-grid">
        {/* Add/Edit Division */}
        <div className="management-card">
          <div className="card-header">
            <div>
              <h2>
                {editingId ? "Edit Division" : "Add Division"}
              </h2>

              <p>
                {editingId
                  ? "Update division information."
                  : "Create a new division."}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Division Name</label>

              <input
                type="text"
                name="name"
                placeholder="e.g. A"
                value={formData.name}
                onChange={handleChange}
                required
              />
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
              <label>Student Count</label>

              <input
                type="number"
                name="studentCount"
                min="1"
                placeholder="e.g. 60"
                value={formData.studentCount}
                onChange={handleChange}
                required
              />
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
                  ? "Update Division"
                  : "Add Division"}
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

        {/* Division List */}
        <div className="management-card">
          <div className="card-header">
            <div>
              <h2>Division List</h2>

              <p>
                {divisions.length} division
                {divisions.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              Loading divisions...
            </div>
          ) : divisions.length === 0 ? (
            <div className="empty-state">
              No divisions found.
            </div>
          ) : (
            <div className="department-list">
              {divisions.map((division) => (
                <div
                  className="department-item"
                  key={division._id}
                >
                  <div className="department-info">
                    <h3>Division {division.name}</h3>

                    <span className="department-code">
                      {division.studentCount} students
                    </span>

                    <p>
                      Semester:{" "}
                      {division.semester?.name ||
                        "Unknown"}
                    </p>
                  </div>

                  <div className="item-actions">
                    <button
                      className="edit-button"
                      onClick={() =>
                        handleEdit(division)
                      }
                    >
                      Edit
                    </button>

                    <button
                      className="delete-button"
                      onClick={() =>
                        handleDelete(division._id)
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

export default Divisions;