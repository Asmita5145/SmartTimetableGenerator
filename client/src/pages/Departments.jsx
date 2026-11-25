import { useEffect, useState } from "react";
import api from "../services/api";

const Departments = () => {
  const [departments, setDepartments] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
  });

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/departments");

      setDepartments(response.data.departments || []);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load departments"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Handle input
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
    });

    setEditingId(null);
  };

  // Create / Update
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingId) {
        await api.put(
          `/departments/${editingId}`,
          formData
        );

        setSuccess(
          "Department updated successfully."
        );
      } else {
        await api.post(
          "/departments",
          formData
        );

        setSuccess(
          "Department created successfully."
        );
      }

      resetForm();

      await fetchDepartments();

    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to save department"
      );
    } finally {
      setSaving(false);
    }
  };

  // Edit
  const handleEdit = (department) => {
    setFormData({
      name: department.name,
      code: department.code,
      description:
        department.description || "",
    });

    setEditingId(department._id);

    setError("");
    setSuccess("");
  };

  // Delete
  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this department?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.delete(
        `/departments/${id}`
      );

      setSuccess(
        "Department deleted successfully."
      );

      await fetchDepartments();

    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to delete department"
      );
    }
  };

  return (
    <div>

      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <h1>Departments</h1>

          <p>
            Manage academic departments in the
            timetable system.
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

      {/* Main Grid */}
      <div className="management-grid">

        {/* Form */}
        <div className="management-card">

          <div className="card-header">

            <div>
              <h2>
                {editingId
                  ? "Edit Department"
                  : "Add Department"}
              </h2>

              <p>
                {editingId
                  ? "Update department information."
                  : "Create a new academic department."}
              </p>
            </div>

          </div>

          <form onSubmit={handleSubmit}>

            <div className="form-group">

              <label>
                Department Name
              </label>

              <input
                type="text"
                name="name"
                placeholder="e.g. Computer Science and Engineering"
                value={formData.name}
                onChange={handleChange}
                required
              />

            </div>

            <div className="form-group">

              <label>
                Department Code
              </label>

              <input
                type="text"
                name="code"
                placeholder="e.g. CSE"
                value={formData.code}
                onChange={handleChange}
                required
              />

            </div>

            <div className="form-group">

              <label>
                Description
              </label>

              <textarea
                name="description"
                placeholder="Optional department description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
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
                  ? "Update Department"
                  : "Add Department"}
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

        {/* Department List */}
        <div className="management-card">

          <div className="card-header">

            <div>
              <h2>
                Department List
              </h2>

              <p>
                {departments.length} department
                {departments.length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>

          </div>

          {loading ? (
            <div className="empty-state">
              Loading departments...
            </div>
          ) : departments.length === 0 ? (
            <div className="empty-state">
              No departments found.
            </div>
          ) : (
            <div className="department-list">

              {departments.map(
                (department) => (
                  <div
                    className="department-item"
                    key={department._id}
                  >

                    <div className="department-info">

                      <div className="department-code">
                        {department.code}
                      </div>

                      <div>
                        <h3>
                          {department.name}
                        </h3>

                        {department.description && (
                          <p>
                            {department.description}
                          </p>
                        )}
                      </div>

                    </div>

                    <div className="item-actions">

                      <button
                        className="edit-button"
                        onClick={() =>
                          handleEdit(
                            department
                          )
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="delete-button"
                        onClick={() =>
                          handleDelete(
                            department._id
                          )
                        }
                      >
                        Delete
                      </button>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default Departments;