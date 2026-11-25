import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const StudentProfile = () => {
  const { user } = useAuth();

  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/auth/profile");

      setProfile(response.data.user);
    } catch (err) {
      console.error("Profile error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load profile information."
      );
    } finally {
      setLoading(false);
    }
  };

  const department = profile?.department?.name
    ? profile.department
    : profile?.division?.semester?.department;

  const semester = profile?.semester?.name
    ? profile.semester
    : profile?.division?.semester;

  const division = profile?.division;
  const batch = profile?.batch;
  const rollNumber = profile?.rollNumber;
  const programme = profile?.programme || "B.Tech";
  const institution = profile?.institution?.name || "Dr. Ashok Gujar Technical Institute's Dr. Daulatrao Aher College of Engineering, Karad";

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>My Profile</h1>
          <p>
            View your account and academic information.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="section-card">
          <p>Loading profile...</p>
        </div>
      ) : error ? (
        <div className="section-card">
          <p>{error}</p>
        </div>
      ) : (
        <>
          <div className="management-grid">

            {/* ACCOUNT INFORMATION */}
            <div className="management-card">

              <div className="card-header">
                <div>
                  <h2>Account Information</h2>
                  <p>
                    Your registered account details.
                  </p>
                </div>
              </div>

              <div className="form-group">
                <label>Name</label>

                <input
                  type="text"
                  value={profile?.name || ""}
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Email</label>

                <input
                  type="email"
                  value={profile?.email || ""}
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Role</label>

                <input
                  type="text"
                  value={profile?.role || ""}
                  disabled
                />
              </div>

            </div>


            {/* ACADEMIC INFORMATION */}
            <div className="management-card">

              <div className="card-header">
                <div>
                  <h2>Academic Information</h2>
                  <p>
                    Your current academic details.
                  </p>
                </div>
              </div>

              <div className="form-group">
                <label>Institution</label>

                <input
                  type="text"
                  value={institution}
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Department</label>

                <input
                  type="text"
                  value={department?.name || "Computer Science & Engineering"}
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Programme</label>

                <input
                  type="text"
                  value={programme}
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Semester</label>

                <input
                  type="text"
                  value={
                    semester
                      ? `${semester.name || (semester.number ? `Semester ${semester.number}` : "Semester")}`
                      : "Not assigned"
                  }
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Practical Batch</label>

                <input
                  type="text"
                  value={batch ? `Batch ${batch}` : "Not assigned"}
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Roll Number</label>

                <input
                  type="text"
                  value={rollNumber || "Not assigned"}
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Division</label>

                <input
                  type="text"
                  value={division?.name || "General (No Division)"}
                  disabled
                />
              </div>

            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default StudentProfile;