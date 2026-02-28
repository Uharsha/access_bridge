import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import StudentTable from "../StudentTable";
import { getDashboardData, getNotifications, headApproveStudent, headDeleteStudent, headRejectStudent, markAllNotificationsRead } from "../../server/Api";
import { useToast } from "../ui/ToastContext";
import GlobalFilterBar from "../ui/GlobalFilterBar";

const ALL_COURSES = [
  "DBMS",
  "CloudComputing",
  "Accessibility",
  "BasicComputers",
  "MachineLearning",
];
const ACTION_REFRESH_DELAY_MS = 5000;

export default function StudentList({ title, fetchFn }) {
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [globalStatusCounts, setGlobalStatusCounts] = useState({});
  const toast = useToast();
  const initialOpenStudentId = searchParams.get("candidateId") || "";
  const source = searchParams.get("source") || "";

  const refresh = useCallback(() => {
    setLoading(true);
    fetchFn()
      .then((res) => setStudents(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [fetchFn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    getNotifications()
      .then((res) =>
        setRecentActivity(
          (res?.data?.notifications || []).filter((n) => !n.isRead).slice(0, 5)
        )
      )
      .catch(() => setRecentActivity([]));
  }, [students]);

  useEffect(() => {
    getDashboardData()
      .then((res) => setGlobalStatusCounts(res?.data?.statusCounts || {}))
      .catch(() => setGlobalStatusCounts({}));
  }, []);

  const markRecentSeen = async () => {
    try {
      await markAllNotificationsRead();
      setRecentActivity([]);
      toast.success("Recent activity marked as seen.");
    } catch {
      toast.error("Unable to mark as seen.");
    }
  };

  const visibleStudents = useMemo(() => {
    if (!Array.isArray(students)) return [];

    const role = (localStorage.getItem("role") || "").trim().toUpperCase();
    const course = (localStorage.getItem("course") || "").trim().toUpperCase();

    if (role !== "TEACHER" || !course) return students;

    return students.filter(
      (student) => (student?.course || "").trim().toUpperCase() === course
    );
  }, [students]);

  const role = (localStorage.getItem("role") || "").trim().toUpperCase();
  const isHead = role === "HEAD";
  const closeRedirectPath =
    source === "calendar" && initialOpenStudentId
      ? role === "TEACHER"
        ? "/teacher-dashboard/interview-calendar"
        : "/head-dashboard/interview-calendar"
      : "";

  const courseOptions = useMemo(() => ["ALL", ...ALL_COURSES], []);

  const courseFilteredStudents = useMemo(() => {
    if (!isHead || selectedCourse === "ALL") return visibleStudents;
    return visibleStudents.filter((student) => (student?.course || "").trim() === selectedCourse);
  }, [isHead, selectedCourse, visibleStudents]);

  useEffect(() => {
    if (!courseOptions.includes(selectedCourse)) {
      setSelectedCourse("ALL");
    }
  }, [courseOptions, selectedCourse]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return courseFilteredStudents;

    return courseFilteredStudents.filter((student) => {
      const name = (student?.name || "").toLowerCase();
      const email = (student?.email || "").toLowerCase();
      const mobile = String(student?.mobile || "").toLowerCase();
      const course = (student?.course || "").toLowerCase();
      const status = (student?.status || "").toLowerCase();

      return (
        name.includes(query) ||
        email.includes(query) ||
        mobile.includes(query) ||
        course.includes(query) ||
        status.includes(query)
      );
    });
  }, [courseFilteredStudents, search]);

  const totalCount = courseFilteredStudents.length;
  const shownCount = filteredStudents.length;
  const fallbackSubmittedCount = filteredStudents.filter((s) => String(s?.status || "").toUpperCase() === "SUBMITTED").length;
  const fallbackScheduledCount = filteredStudents.filter((s) => String(s?.status || "").toUpperCase() === "INTERVIEW_SCHEDULED").length;
  const fallbackSelectedCount = filteredStudents.filter((s) => String(s?.status || "").toUpperCase() === "SELECTED").length;

  const submittedCount = Number(globalStatusCounts?.SUBMITTED ?? fallbackSubmittedCount);
  const scheduledCount = Number(globalStatusCounts?.INTERVIEW_SCHEDULED ?? fallbackScheduledCount);
  const selectedCount = Number(globalStatusCounts?.SELECTED ?? fallbackSelectedCount);
  const visibleCount = Object.keys(globalStatusCounts || {}).length
    ? Object.values(globalStatusCounts || {}).reduce((sum, value) => sum + Number(value || 0), 0)
    : shownCount;

  const toggleSelected = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    setSelectedIds(filteredStudents.map((s) => s._id));
  };

  const clearSelected = () => setSelectedIds([]);

  const runBulk = async (type) => {
    if (!selectedIds.length || bulkLoading) return;
    setBulkLoading(true);
    const apiFn =
      type === "approve"
        ? headApproveStudent
        : type === "reject"
          ? headRejectStudent
          : (id) => headDeleteStudent(id, "Bulk action");
    try {
      const results = await Promise.allSettled(selectedIds.map((id) => apiFn(id)));
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;
      toast.success(`Bulk ${type}: ${ok} success${fail ? `, ${fail} failed` : ""}. Refreshing in 5 seconds...`);
      clearSelected();
      window.setTimeout(() => {
        window.location.reload();
      }, ACTION_REFRESH_DELAY_MS);
    } catch {
      toast.error("Bulk action failed.");
    } finally {
      setBulkLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.skeletonGrid}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={styles.skeletonCard} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <div style={styles.headerRow}>
        <h2 style={styles.pageTitle}>{title}</h2>
        <span style={styles.countBadge}>
          {search.trim() ? `${shownCount} / ${totalCount}` : totalCount}
        </span>
      </div>
      <div style={styles.kpiGrid}>
        <article style={styles.kpiCard}>
          <p style={styles.kpiLabel}>Visible</p>
          <strong style={styles.kpiValue}>{visibleCount}</strong>
        </article>
        <article style={styles.kpiCard}>
          <p style={styles.kpiLabel}>Submitted</p>
          <strong style={styles.kpiValue}>{submittedCount}</strong>
        </article>
        <article style={styles.kpiCard}>
          <p style={styles.kpiLabel}>Interview Scheduled</p>
          <strong style={styles.kpiValue}>{scheduledCount}</strong>
        </article>
        <article style={styles.kpiCard}>
          <p style={styles.kpiLabel}>Selected</p>
          <strong style={styles.kpiValue}>{selectedCount}</strong>
        </article>
      </div>
      <GlobalFilterBar title="Student Filters">
        <div style={styles.filtersRow}>
          <label htmlFor="student-search" style={styles.srOnly}>Search students</label>
          <input
            id="student-search"
            type="text"
            placeholder="Search by name, email, mobile, course, status"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search students by name, email, mobile, course or status"
            style={{
              ...styles.searchInput,
              ...(isHead ? styles.searchInputHead : styles.searchInputTeacher),
            }}
          />
          {isHead && (
            <>
              <label htmlFor="course-filter" style={styles.srOnly}>Filter by course</label>
            <select
              id="course-filter"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              aria-label="Filter students by course"
              style={styles.courseSelect}
            >
              {courseOptions.map((course) => (
                <option key={course} value={course}>
                  {course === "ALL" ? "ALL" : course}
                </option>
              ))}
            </select>
            </>
          )}
        </div>
      </GlobalFilterBar>
      {isHead && (
        <div style={styles.bulkRow}>
          <button type="button" style={styles.bulkBtn} onClick={selectAllVisible}>Select Visible</button>
          <button type="button" style={styles.bulkBtn} onClick={clearSelected}>Clear</button>
          <button type="button" style={styles.bulkBtn} disabled={bulkLoading || !selectedIds.length} onClick={() => runBulk("approve")}>Bulk Approve</button>
          <button type="button" style={styles.bulkBtn} disabled={bulkLoading || !selectedIds.length} onClick={() => runBulk("reject")}>Bulk Reject</button>
          <button type="button" style={styles.bulkDangerBtn} disabled={bulkLoading || !selectedIds.length} onClick={() => runBulk("delete")}>Bulk Delete</button>
          <span style={styles.bulkCount}>{selectedIds.length} selected</span>
        </div>
      )}
      <div style={styles.activityCard}>
        <div style={styles.activityHeader}>
          <h4 style={styles.activityTitle}>Recent Activity</h4>
          {recentActivity.length > 0 && (
            <button type="button" style={styles.activityActionBtn} onClick={markRecentSeen}>Mark as Seen</button>
          )}
        </div>
        {recentActivity.length === 0 ? (
          <p style={styles.activityEmpty}>No recent updates.</p>
        ) : (
          <ul style={styles.activityList}>
            {recentActivity.map((a) => (
              <li key={a._id} style={styles.activityItem}>
                <strong>{a.title}</strong>
                <span>{a.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <StudentTable
        students={filteredStudents}
        refresh={refresh}
        enableSelection={isHead}
        selectedIds={selectedIds}
        onToggleSelected={toggleSelected}
        initialOpenStudentId={initialOpenStudentId}
        closeRedirectPath={closeRedirectPath}
      />
    </div>
  );
}

const styles = {
  pageContainer: {
    maxWidth: "1180px",
    margin: "0 auto",
    padding: "1.35rem 1rem 2.2rem",
  },
  pageTitle: {
    fontSize: "2.1rem",
    fontWeight: "700",
    textAlign: "center",
    color: "var(--text-main)",
    marginBottom: "1.4rem",
    letterSpacing: "-0.5px",
    background: "linear-gradient(135deg, #8ca3ff 0%, #8d63d6 65%, #52b3ff 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    margin: 0,
    textShadow: "0 12px 24px rgba(79,70,229,0.18)",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.75rem",
    marginBottom: "1rem",
    flexWrap: "wrap",
  },
  countBadge: {
    padding: "0.42rem 0.8rem",
    borderRadius: "999px",
    background: "var(--surface-card)",
    color: "#5566e0",
    fontSize: "0.9rem",
    fontWeight: "700",
    border: "1px solid var(--dash-panel-border)",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.14)",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "12px",
    maxWidth: "940px",
    margin: "0 auto 14px auto",
  },
  kpiCard: {
    border: "1px solid var(--dash-panel-border)",
    background: "var(--dash-panel-bg)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-sm)",
    padding: "12px",
    backdropFilter: "blur(2px)",
  },
  kpiLabel: {
    margin: 0,
    color: "var(--dash-muted-text)",
    fontWeight: 700,
    fontSize: "0.8rem",
  },
  kpiValue: {
    color: "var(--dash-strong-text)",
    fontSize: "1.35rem",
    lineHeight: 1.2,
  },
  loadingContainer: {
    minHeight: "320px",
    padding: "1.5rem",
  },
  loadingText: {
    textAlign: "center",
    fontSize: "1.2rem",
    color: "#667eea",
    fontWeight: "600",
  },
  filtersRow: {
    display: "flex",
    gap: "0.75rem",
    margin: 0,
    maxWidth: "900px",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  searchInput: {
    flex: "1 1 420px",
    padding: "0.8rem 0.95rem",
    border: "1px solid var(--dash-soft-border)",
    borderRadius: "10px",
    fontSize: "0.95rem",
    outline: "none",
    background: "var(--dash-soft-bg)",
    color: "var(--text-main)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
  },
  searchInputHead: {
    maxWidth: "640px",
  },
  searchInputTeacher: {
    maxWidth: "500px",
    margin: "0 auto",
  },
  courseSelect: {
    flex: "0 0 220px",
    padding: "0.8rem 1rem",
    border: "1px solid var(--dash-soft-border)",
    borderRadius: "10px",
    fontSize: "0.95rem",
    outline: "none",
    backgroundColor: "var(--dash-soft-bg)",
    color: "var(--text-main)",
  },
  skeletonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "12px",
  },
  skeletonCard: {
    height: "170px",
    borderRadius: "12px",
    background: "linear-gradient(90deg, #e6eaf5 25%, #f4f7ff 37%, #e6eaf5 63%)",
    backgroundSize: "400% 100%",
    animation: "pulse 1.2s ease infinite",
  },
  bulkRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: "14px",
  },
  bulkBtn: {
    border: "1px solid var(--dash-soft-border)",
    background: "var(--surface-card)",
    color: "var(--text-main)",
    borderRadius: "10px",
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "12px",
  },
  bulkDangerBtn: {
    border: "1px solid var(--dash-danger-border)",
    background: "var(--dash-danger-bg)",
    color: "var(--dash-danger-text)",
    borderRadius: "10px",
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "12px",
  },
  bulkCount: {
    alignSelf: "center",
    fontWeight: 700,
    color: "#8fa2ff",
  },
  activityCard: {
    maxWidth: "940px",
    margin: "0 auto 14px auto",
    border: "1px solid var(--dash-panel-border)",
    background: "var(--dash-panel-bg)",
    borderRadius: "12px",
    padding: "12px",
  },
  activityTitle: {
    margin: 0,
    color: "var(--dash-strong-text)",
    fontSize: "1.18rem",
  },
  activityHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
    gap: "8px",
  },
  activityActionBtn: {
    border: "1px solid var(--dash-soft-border)",
    background: "var(--surface-card)",
    color: "var(--text-main)",
    borderRadius: "10px",
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "12px",
  },
  activityEmpty: {
    color: "var(--text-muted)",
    margin: 0,
  },
  activityList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "grid",
    gap: "6px",
  },
  activityItem: {
    border: "1px solid var(--dash-soft-border)",
    borderRadius: "10px",
    padding: "10px",
    display: "grid",
    gap: "5px",
    color: "var(--dash-strong-text)",
    background: "var(--dash-soft-bg)",
  },
  srOnly: {
    border: 0,
    clip: "rect(0 0 0 0)",
    height: "1px",
    margin: "-1px",
    overflow: "hidden",
    padding: 0,
    position: "absolute",
    width: "1px",
  },
};
