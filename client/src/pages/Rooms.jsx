import { useEffect, useState } from "react";
import api from "../services/api";

const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    roomNumber: "",
    type: "CLASSROOM",
    capacity: "",
    department: "",
    facilities: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchRooms();
    fetchDepartments();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);

      const response = await api.get("/rooms");

      setRooms(response.data.rooms || []);
      setError("");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load rooms"
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
      roomNumber: "",
      type: "CLASSROOM",
      capacity: "",
      department: "",
      facilities: "",
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
        roomNumber: formData.roomNumber,
        type: formData.type,
        capacity: Number(formData.capacity),
        department: formData.department || undefined,

        facilities: formData.facilities
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item !== ""),
      };

      if (editingId) {
        await api.put(`/rooms/${editingId}`, data);
        setSuccess("Room updated successfully.");
      } else {
        await api.post("/rooms", data);
        setSuccess("Room added successfully.");
      }

      resetForm();
      fetchRooms();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to save room"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (room) => {
    setEditingId(room._id);

    setFormData({
      name: room.name || "",
      roomNumber: room.roomNumber || "",
      type: room.type || "CLASSROOM",
      capacity: room.capacity || "",
      department:
        room.department?._id ||
        room.department ||
        "",
      facilities: Array.isArray(room.facilities)
        ? room.facilities.join(", ")
        : "",
    });

    setError("");
    setSuccess("");
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this room?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`/rooms/${id}`);

      setSuccess("Room deleted successfully.");
      fetchRooms();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to delete room"
      );
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Rooms & Labs</h1>
          <p>
            Manage classrooms, laboratories and available facilities.
          </p>
        </div>
      </div>

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

      <div className="management-grid">

        {/* Form */}
        <div className="management-card">
          <div className="card-header">
            <div>
              <h2>
                {editingId
                  ? "Edit Room"
                  : "Add Room"}
              </h2>

              <p>
                {editingId
                  ? "Update room information."
                  : "Create a new classroom or laboratory."}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>

            <div className="form-group">
              <label>Room / Lab Name</label>

              <input
                type="text"
                name="name"
                placeholder="e.g. Computer Laboratory"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Room Number</label>

              <input
                type="text"
                name="roomNumber"
                placeholder="e.g. CR101"
                value={formData.roomNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Type</label>

              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
              >
                <option value="CLASSROOM">
                  Classroom
                </option>

                <option value="LAB">
                  Laboratory
                </option>
              </select>
            </div>

            <div className="form-group">
              <label>Capacity</label>

              <input
                type="number"
                name="capacity"
                min="1"
                placeholder="e.g. 60"
                value={formData.capacity}
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
              >
                <option value="">
                  Select Department
                </option>

                {departments.map((department) => (
                  <option
                    key={department._id}
                    value={department._id}
                  >
                    {department.name} (
                    {department.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Facilities</label>

              <input
                type="text"
                name="facilities"
                placeholder="e.g. Projector, Smart Board, Internet"
                value={formData.facilities}
                onChange={handleChange}
              />

              <small>
                Separate multiple facilities with commas.
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
                  ? "Update Room"
                  : "Add Room"}
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
              <h2>Room & Lab List</h2>

              <p>
                {rooms.length}{" "}
                {rooms.length === 1
                  ? "resource"
                  : "resources"}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              Loading rooms...
            </div>
          ) : rooms.length === 0 ? (
            <div className="empty-state">
              No rooms or labs found.
            </div>
          ) : (
            <div className="department-list">

              {rooms.map((room) => (
                <div
                  className="department-item"
                  key={room._id}
                >
                  <div className="department-info">

                    <h3>
                      {room.name}
                    </h3>

                    <span className="department-code">
                      {room.roomNumber} •{" "}
                      {room.type}
                    </span>

                    <p>
                      Capacity:{" "}
                      {room.capacity}
                    </p>

                    <p>
                      {room.department?.name ||
                        "No Department"}
                    </p>

                    {room.facilities?.length > 0 && (
                      <p>
                        Facilities:{" "}
                        {room.facilities.join(", ")}
                      </p>
                    )}

                  </div>

                  <div className="item-actions">

                    <button
                      className="edit-button"
                      onClick={() =>
                        handleEdit(room)
                      }
                    >
                      Edit
                    </button>

                    <button
                      className="delete-button"
                      onClick={() =>
                        handleDelete(room._id)
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

export default Rooms;