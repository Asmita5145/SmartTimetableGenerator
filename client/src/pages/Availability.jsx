import { useEffect, useState } from "react";
import api from "../services/api";

const Availability = () => {
  const [availabilities, setAvailabilities] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);

  const [formData, setFormData] = useState({
    resourceType: "FACULTY",
    resourceId: "",
    day: "MONDAY",
    availableSlots: [],
  });

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchAvailabilities();
    fetchFaculty();
    fetchRooms();
    fetchTimeSlots();
  }, []);

  const fetchAvailabilities = async () => {
    try {
      setLoading(true);

      const response = await api.get("/availability");

      setAvailabilities(
        response.data.availabilities || []
      );

      setError("");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load availability"
      );
    } finally {
      setLoading(false);
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

  const fetchRooms = async () => {
    try {
      const response = await api.get("/rooms");

      setRooms(response.data.rooms || []);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load rooms"
      );
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const response = await api.get("/timeslots");

      setTimeSlots(response.data.timeSlots || []);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load time slots"
      );
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "resourceType"
        ? {
            resourceId: "",
            availableSlots: [],
          }
        : {}),
      ...(name === "day"
        ? {
            availableSlots: [],
          }
        : {}),
    }));
  };

  const handleSlotChange = (e) => {
    const selectedOptions = Array.from(
      e.target.selectedOptions
    ).map((option) => option.value);

    setFormData((prev) => ({
      ...prev,
      availableSlots: selectedOptions,
    }));
  };

  const resetForm = () => {
    setFormData({
      resourceType: "FACULTY",
      resourceId: "",
      day: "MONDAY",
      availableSlots: [],
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
        resourceType: formData.resourceType,
        resourceId: formData.resourceId,
        day: formData.day,
        availableSlots: formData.availableSlots,
      };

      if (editingId) {
        await api.put(
          `/availability/${editingId}`,
          data
        );

        setSuccess(
          "Availability updated successfully."
        );
      } else {
        await api.post("/availability", data);

        setSuccess(
          "Availability added successfully."
        );
      }

      resetForm();
      fetchAvailabilities();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to save availability"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (availability) => {
    setEditingId(availability._id);

    setFormData({
      resourceType: availability.resourceType,
      resourceId: availability.resourceId,
      day: availability.day,
      availableSlots:
        availability.availableSlots?.map((slot) =>
          slot._id ? slot._id : slot
        ) || [],
    });

    setError("");
    setSuccess("");
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this availability?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`/availability/${id}`);

      setSuccess(
        "Availability deleted successfully."
      );

      fetchAvailabilities();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to delete availability"
      );
    }
  };

  const handleGenerateStandard = async () => {
    if (!formData.resourceId) {
      setError(
        "Please select a faculty member or room first."
      );
      return;
    }

    const confirmed = window.confirm(
      "Generate standard Monday-Friday availability for this resource?"
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await api.post(
        "/availability/generate-standard",
        {
          resourceType: formData.resourceType,
          resourceId: formData.resourceId,
        }
      );

      setSuccess(
        "Standard availability generated successfully."
      );

      fetchAvailabilities();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to generate standard availability"
      );
    } finally {
      setSaving(false);
    }
  };

  const resourceName = (availability) => {
    const resourceId =
      availability.resourceId?._id ||
      availability.resourceId;

    if (availability.resourceType === "FACULTY") {
      const member = faculty.find(
        (item) => item._id === resourceId
      );

      return member
        ? `${member.name} (${member.employeeId})`
        : "Faculty";
    }

    const room = rooms.find(
      (item) => item._id === resourceId
    );

    return room
      ? `${room.name} (${room.roomNumber})`
      : "Room";
  };

  const daySlots = timeSlots.filter(
    (slot) =>
      slot.day === formData.day &&
      !slot.isBreak
  );

  const resourceList =
    formData.resourceType === "FACULTY"
      ? faculty
      : rooms;

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Availability</h1>

          <p>
            Manage faculty and room availability for timetable generation.
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
                  ? "Edit Availability"
                  : "Add Availability"}
              </h2>

              <p>
                Select a resource and its available periods.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>

            <div className="form-group">
              <label>Resource Type</label>

              <select
                name="resourceType"
                value={formData.resourceType}
                onChange={handleChange}
                required
              >
                <option value="FACULTY">
                  Faculty
                </option>

                <option value="ROOM">
                  Room / Lab
                </option>
              </select>
            </div>

            <div className="form-group">
              <label>
                {formData.resourceType === "FACULTY"
                  ? "Faculty"
                  : "Room / Lab"}
              </label>

              <select
                name="resourceId"
                value={formData.resourceId}
                onChange={handleChange}
                required
              >
                <option value="">
                  Select Resource
                </option>

                {resourceList.map((resource) => (
                  <option
                    key={resource._id}
                    value={resource._id}
                  >
                    {formData.resourceType ===
                    "FACULTY"
                      ? `${resource.name} (${resource.employeeId})`
                      : `${resource.name} (${resource.roomNumber})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Day</label>

              <select
                name="day"
                value={formData.day}
                onChange={handleChange}
                required
              >
                <option value="MONDAY">
                  Monday
                </option>

                <option value="TUESDAY">
                  Tuesday
                </option>

                <option value="WEDNESDAY">
                  Wednesday
                </option>

                <option value="THURSDAY">
                  Thursday
                </option>

                <option value="FRIDAY">
                  Friday
                </option>

                <option value="SATURDAY">
                  Saturday
                </option>
              </select>
            </div>

            <div className="form-group">
              <label>
                Available Time Slots
              </label>

              <select
                multiple
                value={formData.availableSlots}
                onChange={handleSlotChange}
                size="6"
                required
              >
                {daySlots.map((slot) => (
                  <option
                    key={slot._id}
                    value={slot._id}
                  >
                    Slot {slot.slotNumber}:{" "}
                    {slot.startTime} -{" "}
                    {slot.endTime}
                  </option>
                ))}
              </select>

              <small>
                Hold Ctrl and select multiple slots.
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
                  ? "Update Availability"
                  : "Add Availability"}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={handleGenerateStandard}
                disabled={saving}
              >
                Generate Standard
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
              <h2>Availability List</h2>

              <p>
                {availabilities.length} availability
                {availabilities.length !== 1
                  ? " records"
                  : " record"}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              Loading availability...
            </div>
          ) : availabilities.length === 0 ? (
            <div className="empty-state">
              No availability records found.
            </div>
          ) : (
            <div className="department-list">

              {availabilities.map(
                (availability) => (
                  <div
                    className="department-item"
                    key={availability._id}
                  >
                    <div className="department-info">

                      <h3>
                        {resourceName(
                          availability
                        )}
                      </h3>

                      <span className="department-code">
                        {availability.resourceType}
                        {" • "}
                        {availability.day}
                      </span>

                      <p>
                        Available Slots:{" "}
                        {availability.availableSlots
                          ?.length || 0}
                      </p>

                    </div>

                    <div className="item-actions">

                      <button
                        className="edit-button"
                        onClick={() =>
                          handleEdit(
                            availability
                          )
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="delete-button"
                        onClick={() =>
                          handleDelete(
                            availability._id
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

export default Availability;