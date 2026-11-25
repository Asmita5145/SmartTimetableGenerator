import { useEffect, useState } from "react";
import api from "../services/api";

const Faculty = () => {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    employeeId: "",
    email: "",
    department: "",
    designation: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchFaculty();
    fetchDepartments();
  }, []);

  const fetchFaculty = async () => {
    try {
      setLoading(true);

      const response = await api.get("/faculty");

      setFaculty(response.data.faculty || []);
      setError("");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load faculty"
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
      employeeId: "",
      email: "",
      department: "",
      designation: "",
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
        employeeId: formData.employeeId,
        email: formData.email,
        department: formData.department,
        designation: formData.designation,
      };

      if (editingId) {
        await api.put(`/faculty/${editingId}`, data);
        setSuccess("Faculty updated successfully.");
      } else {
        await api.post("/faculty", data);
        setSuccess("Faculty added successfully.");
      }

      resetForm();
      fetchFaculty();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to save faculty"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (member) => {
    setEditingId(member._id);

    setFormData({
      name: member.name || "",
      employeeId: member.employeeId || "",
      email: member.email || "",
      department:
        member.department?._id ||
        member.department ||
        "",
      designation: member.designation || "",
    });

    setError("");
    setSuccess("");
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this faculty member?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`/faculty/${id}`);

      setSuccess("Faculty deleted successfully.");
      fetchFaculty();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to delete faculty"
      );
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Faculty</h1>
          <p>
            Manage faculty members and their academic departments.
          </p>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {success && (
        <div className="page-success">{success}</div>
      )}

      <div className="management-grid">
        {/* Add/Edit Faculty */}
        <div className="management-card">
          <div className="card-header">
            <div>
              <h2>
                {editingId ? "Edit Faculty" : "Add Faculty"}
              </h2>

              <p>
                {editingId
                  ? "Update faculty information."
                  : "Add a new faculty member."}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Faculty Name</label>

              <input
                type="text"
                name="name"
                placeholder="e.g. Dr. Amit Sharma"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Employee ID</label>

              <input
                type="text"
                name="employeeId"
                placeholder="e.g. FAC001"
                value={formData.employeeId}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>

              <input
                type="email"
                name="email"
                placeholder="e.g. amit@college.edu"
                value={formData.email}
                onChange={handleChange}
              />
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
              <label>Designation</label>

              <input
                type="text"
                name="designation"
                placeholder="e.g. Assistant Professor"
                value={formData.designation}
                onChange={handleChange}
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
                  ? "Update Faculty"
                  : "Add Faculty"}
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

        {/* Faculty List */}
        <div className="management-card">
          <div className="card-header">
            <div>
              <h2>Faculty List</h2>

              <p>
                {faculty.length} faculty member
                {faculty.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              Loading faculty...
            </div>
          ) : faculty.length === 0 ? (
            <div className="empty-state">
              No faculty found.
            </div>
          ) : (
            <div className="department-list">
              {faculty.map((member) => (
                <div
                  className="department-item"
                  key={member._id}
                >
                  <div className="department-info">
                    <h3>{member.name}</h3>

                    <span className="department-code">
                      {member.employeeId}
                    </span>

                    <p>
                      {member.designation ||
                        "Faculty"}{" "}
                      •{" "}
                      {member.department?.name ||
                        "Unknown Department"}
                    </p>

                    {member.email && (
                      <p>{member.email}</p>
                    )}
                  </div>

                  <div className="item-actions">
                    <button
                      className="edit-button"
                      onClick={() =>
                        handleEdit(member)
                      }
                    >
                      Edit
                    </button>

                    <button
                      className="delete-button"
                      onClick={() =>
                        handleDelete(member._id)
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

export default Faculty;