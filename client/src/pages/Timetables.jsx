import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const Timetables = () => {
  const navigate = useNavigate();

  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // ============================================
  // LOAD TIMETABLES
  // ============================================

  const fetchTimetables = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/timetables");

      setTimetables(
        response.data.timetables || []
      );
    } catch (err) {
      console.error(
        "Error loading timetables:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to load timetables"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetables();
  }, []);

  // ============================================
  // DELETE TIMETABLE
  // ============================================

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this timetable?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/timetables/${id}`);

      setTimetables((current) =>
        current.filter(
          (timetable) =>
            timetable._id !== id
        )
      );
    } catch (err) {
      console.error(
        "Error deleting timetable:",
        err
      );

      alert(
        err.response?.data?.message ||
          "Failed to delete timetable"
      );
    }
  };

  // ============================================
  // STATUS CLASS
  // ============================================

  const getStatusClass = (status) => {
    if (status === "PUBLISHED") {
      return "status-published";
    }

    if (status === "GENERATED" || status === "VALID") {
      return "status-generated";
    }

    return "status-draft";
  };

  // ============================================
  // FILTER TIMETABLES
  // ============================================

  const filteredTimetables = useMemo(() => {
    return timetables.filter((timetable) => {
      const search = searchTerm
        .trim()
        .toLowerCase();

      const departmentName =
        timetable.department?.name
          ?.toLowerCase() || "";

      const departmentCode =
        timetable.department?.code
          ?.toLowerCase() || "";

      const semesterName =
        timetable.semester?.name
          ?.toLowerCase() || "";

      const divisionName =
        timetable.division?.name
          ?.toLowerCase() || "";

      const matchesSearch =
        !search ||
        departmentName.includes(search) ||
        departmentCode.includes(search) ||
        semesterName.includes(search) ||
        divisionName.includes(search);

      const matchesStatus =
        statusFilter === "ALL" ||
        timetable.status === statusFilter ||
        (statusFilter === "GENERATED" && (timetable.status === "VALID" || timetable.status === "PARTIAL"));

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    timetables,
    searchTerm,
    statusFilter
  ]);

  // ============================================
  // STATISTICS
  // ============================================

  const totalCount = timetables.length;

  const draftCount = timetables.filter(
    (timetable) =>
      timetable.status === "DRAFT"
  ).length;

  const generatedCount = timetables.filter(
    (timetable) =>
      timetable.status === "GENERATED" || timetable.status === "VALID"
  ).length;

  const publishedCount = timetables.filter(
    (timetable) =>
      timetable.status === "PUBLISHED"
  ).length;

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <div>
        <div className="page-heading">
          <div>
            <h1>Timetables</h1>

            <p>
              View and manage generated academic
              timetables.
            </p>
          </div>
        </div>

        <div className="section-card">
          <div className="empty-state">
            Loading timetables...
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // PAGE
  // ============================================

  return (
    <div>
      {/* ========================================= */}
      {/* PAGE HEADER */}
      {/* ========================================= */}

      <div className="page-heading">
        <div>
          <h1>Timetable Management</h1>

          <p>
            View, edit, validate and manage
            academic timetables.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={fetchTimetables}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {/* ========================================= */}
      {/* ERROR */}
      {/* ========================================= */}

      {error && (
        <div className="page-error">
          {error}
        </div>
      )}

      {/* ========================================= */}
      {/* STATISTICS */}
      {/* ========================================= */}

      {!error && (
        <div className="dashboard-cards">
          <div className="stat-card">
            <div className="stat-icon">
              T
            </div>

            <div>
              <span>Total Timetables</span>
              <h2>{totalCount}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              D
            </div>

            <div>
              <span>Draft</span>
              <h2>{draftCount}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              G
            </div>

            <div>
              <span>Generated</span>
              <h2>{generatedCount}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              P
            </div>

            <div>
              <span>Published</span>
              <h2>{publishedCount}</h2>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* FILTERS */}
      {/* ========================================= */}

      {!error &&
        timetables.length > 0 && (
          <div className="section-card timetable-filters-card">
            <div className="timetable-filters">
              <div className="form-group timetable-search">
                <label>
                  Search Timetables
                </label>

                <input
                  type="text"
                  placeholder="Search department, semester or division..."
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="form-group timetable-status-filter">
                <label>
                  Status
                </label>

                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value
                    )
                  }
                >
                  <option value="ALL">
                    All Status
                  </option>

                  <option value="DRAFT">
                    Draft
                  </option>

                  <option value="GENERATED">
                    Generated
                  </option>

                  <option value="PUBLISHED">
                    Published
                  </option>
                </select>
              </div>
            </div>
          </div>
        )}

      {/* ========================================= */}
      {/* EMPTY */}
      {/* ========================================= */}

      {!error &&
        timetables.length === 0 && (
          <div className="section-card">
            <div className="empty-state">
              <h3>
                No timetables found
              </h3>

              <p>
                Generate a timetable first
                from the Timetable Generator.
              </p>

              <button
                className="primary-button"
                onClick={() =>
                  navigate(
                    "/timetable-generator"
                  )
                }
              >
                Generate Timetable
              </button>
            </div>
          </div>
        )}

      {/* ========================================= */}
      {/* NO FILTER RESULTS */}
      {/* ========================================= */}

      {!error &&
        timetables.length > 0 &&
        filteredTimetables.length === 0 && (
          <div className="section-card">
            <div className="empty-state">
              <h3>
                No matching timetables
              </h3>

              <p>
                Try changing your search or
                status filter.
              </p>

              <button
                className="secondary-button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("ALL");
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

      {/* ========================================= */}
      {/* TIMETABLE LIST */}
      {/* ========================================= */}

      {filteredTimetables.length > 0 && (
        <div className="section-card">
          <div className="card-header">
            <div>
              <h2>
                Academic Timetables
              </h2>

              <p>
                Showing{" "}
                {filteredTimetables.length}{" "}
                of {timetables.length}{" "}
                timetable
                {timetables.length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="management-table">
              <thead>
                <tr>
                  <th>
                    Department
                  </th>

                  <th>
                    Semester
                  </th>

                  <th>
                    Division
                  </th>

                  <th>
                    Entries
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Created
                  </th>

                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredTimetables.map(
                  (timetable) => (
                    <tr
                      key={
                        timetable._id
                      }
                    >
                      {/* DEPARTMENT */}

                      <td>
                        <strong>
                          {timetable
                            .department
                            ?.name ||
                            "Unknown Department"}
                        </strong>

                        <small>
                          {timetable
                            .department
                            ?.code || ""}
                        </small>
                      </td>

                      {/* SEMESTER */}

                      <td>
                        {timetable
                          .semester
                          ?.name ||
                          "Unknown Semester"}
                      </td>

                      {/* DIVISION */}

                      <td>
                        {timetable
                          .division
                          ?.name ||
                          "Unknown Division"}

                        <small>
                          {timetable
                            .division
                            ?.studentCount
                            ? `${timetable.division.studentCount} students`
                            : ""}
                        </small>
                      </td>

                      {/* ENTRIES */}

                      <td>
                        <span className="entry-count">
                          {timetable
                            .entries
                            ?.length || 0}
                        </span>
                      </td>

                      {/* STATUS */}

                      <td>
                        <span
                          className={`status-badge ${getStatusClass(
                            timetable.status
                          )}`}
                        >
                          {timetable.status}
                        </span>
                      </td>

                      {/* CREATED */}

                      <td>
                        {timetable.createdAt
                          ? new Date(
                              timetable.createdAt
                            ).toLocaleDateString()
                          : "-"}
                      </td>

                      {/* ACTIONS */}

                      <td>
                        <div className="item-actions">
                          <button
                            className="edit-button"
                            onClick={() =>
                              navigate(
                                `/timetables/${timetable._id}`
                              )
                            }
                          >
                            View
                          </button>

                          {timetable.status !==
                            "PUBLISHED" && (
                            <button
                              className="delete-button"
                              onClick={() =>
                                handleDelete(
                                  timetable._id
                                )
                              }
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetables;