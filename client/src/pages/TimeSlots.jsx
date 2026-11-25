import { useEffect, useState } from "react";
import api from "../services/api";

const TimeSlots = () => {
  const [timeSlots, setTimeSlots] = useState([]);

  const [formData, setFormData] = useState({
    day: "MONDAY",
    startTime: "",
    endTime: "",
    slotNumber: "",
    isBreak: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchTimeSlots();
  }, []);

  const fetchTimeSlots = async () => {
    try {
      setLoading(true);

      const response = await api.get("/timeslots");

      setTimeSlots(response.data.timeSlots || []);
      setError("");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to load time slots"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      day: "MONDAY",
      startTime: "",
      endTime: "",
      slotNumber: "",
      isBreak: false,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const data = {
        day: formData.day,
        startTime: formData.startTime,
        endTime: formData.endTime,
        slotNumber: Number(formData.slotNumber),
        isBreak: formData.isBreak,
      };

      await api.post("/timeslots", data);

      setSuccess("Time slot added successfully.");

      resetForm();
      fetchTimeSlots();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to add time slot"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateStandard = async () => {
    const confirmed = window.confirm(
      "Generate the standard Monday-Friday college timetable slots?"
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await api.post(
        "/timeslots/generate-standard"
      );

      setSuccess(
        "Standard time slots generated successfully."
      );

      fetchTimeSlots();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to generate standard time slots"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this time slot?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`/timeslots/${id}`);

      setSuccess("Time slot deleted successfully.");

      fetchTimeSlots();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to delete time slot"
      );
    }
  };

  const sortedTimeSlots = [...timeSlots].sort(
    (a, b) => {
      const dayOrder = {
        MONDAY: 1,
        TUESDAY: 2,
        WEDNESDAY: 3,
        THURSDAY: 4,
        FRIDAY: 5,
        SATURDAY: 6,
      };

      if (dayOrder[a.day] !== dayOrder[b.day]) {
        return (
          dayOrder[a.day] -
          dayOrder[b.day]
        );
      }

      return a.slotNumber - b.slotNumber;
    }
  );

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Time Slots</h1>

          <p>
            Configure working periods, breaks and academic time slots.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={handleGenerateStandard}
          disabled={saving}
        >
          Generate Standard Slots
        </button>
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

        {/* Add Time Slot */}
        <div className="management-card">
          <div className="card-header">
            <div>
              <h2>Add Time Slot</h2>

              <p>
                Create a custom academic time slot.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>

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
              <label>Start Time</label>

              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>End Time</label>

              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Slot Number</label>

              <input
                type="number"
                name="slotNumber"
                min="1"
                placeholder="e.g. 1"
                value={formData.slotNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="isBreak"
                  checked={formData.isBreak}
                  onChange={handleChange}
                />

                {" "}This is a break
              </label>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Add Time Slot"}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
              >
                Clear
              </button>
            </div>

          </form>
        </div>

        {/* Time Slot List */}
        <div className="management-card">
          <div className="card-header">
            <div>
              <h2>Time Slot Schedule</h2>

              <p>
                {timeSlots.length} time slots configured
              </p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              Loading time slots...
            </div>
          ) : sortedTimeSlots.length === 0 ? (
            <div className="empty-state">
              No time slots found.
            </div>
          ) : (
            <div className="department-list">

              {sortedTimeSlots.map((slot) => (
                <div
                  className="department-item"
                  key={slot._id}
                >
                  <div className="department-info">

                    <h3>
                      {slot.day}
                    </h3>

                    <span className="department-code">
                      Slot {slot.slotNumber} •{" "}
                      {slot.startTime} -{" "}
                      {slot.endTime}
                    </span>

                    <p>
                      {slot.isBreak
                        ? "Break"
                        : "Academic Period"}
                    </p>

                  </div>

                  <div className="item-actions">

                    <button
                      className="delete-button"
                      onClick={() =>
                        handleDelete(slot._id)
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

export default TimeSlots;