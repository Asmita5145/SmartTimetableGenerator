import { useEffect, useState } from "react";
import api from "../services/api";

const Semesters = () => {
  const [semesters, setSemesters] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    number: "",
    department: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchSemesters();
    fetchDepartments();
  }, []);

  const fetchSemesters = async () => {
    try {
      setLoading(true);

      const response = await api.get("/semesters");

      setSemesters(response.data.semesters || []);
      setError("");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load semesters"
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
      number: "",
      department: "",
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
        number: Number(formData.number),
        department: formData.department,
      };

      if (editingId) {
        await api.put(`/semesters/${editingId}`, data);
        setSuccess("Semester updated successfully.");
      } else {
        await api.post("/semesters", data);
        setSuccess("Semester added successfully.");
      }

      resetForm();
      fetchSemesters();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to save semester"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (semester) => {
    setEditingId(semester._id);

    setFormData({
      name: semester.name || "",
      number: semester.number || "",
      department: semester.department?._id || semester.department || "",
    });

    setError("");
    setSuccess("");
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this semester?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`/semesters/${id}`);

      setSuccess("Semester deleted successfully.");
      fetchSemesters();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to delete semester"
      );
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Semesters</h1>
          <p>
            Manage semesters and connect them with academic departments.
          </p>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {success && <div className="page-success">{success}</div>}

      <div className="management-grid">
        {/* Form */}
        <div className="management-card">
          <div className="card-header">
            <div>
              <h2>
                {editingId ? "Edit Semester" : "Add Semester"}
              </h2>

              <p>
                {editingId
                  ? "Update semester information."
                  : "Create a new semester."}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Semester Name</label>

              <input
                type="text"
                name="name"
                placeholder="e.g. Semester 1"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Semester Number</label>

              <input
                type="number"
                name="number"
                min="1"
                max="8"
                placeholder="e.g. 1"
                value={formData.number}
                onChange={handleChange}
                required
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

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Semester"
                  : "Add Semester"}
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
              <h2>Semester List</h2>
              <p>
                {semesters.length} semester
                {semesters.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              Loading semesters...
            </div>
          ) : semesters.length === 0 ? (
            <div className="empty-state">
              No semesters found.
            </div>
          ) : (
            <div className="department-list">
              {semesters.map((semester) => (
                <div
                  className="department-item"
                  key={semester._id}
                >
                  <div className="department-info">
                    <h3>{semester.name}</h3>

                    <span className="department-code">
                      Semester {semester.number}
                    </span>

                    <p>
                      Department:{" "}
                      {semester.department?.name ||
                        "Unknown"}
                    </p>
                  </div>

                  <div className="item-actions">
                    <button
                      className="edit-button"
                      onClick={() => handleEdit(semester)}
                    >
                      Edit
                    </button>

                    <button
                      className="delete-button"
                      onClick={() =>
                        handleDelete(semester._id)
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

export default Semesters;