import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getInterviewRequiredStudents } from "../../server/Api";

export default function InterviewCalendar() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const navigate = useNavigate();
  const role = (localStorage.getItem("role") || "").toUpperCase();

  useEffect(() => {
    getInterviewRequiredStudents()
      .then((res) => setItems(Array.isArray(res.data) ? res.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const toInterviewDateTime = (dateValue, timeValue) => {
    if (!dateValue) return null;
    const safeDate = String(dateValue).slice(0, 10);
    const safeTime = (timeValue && /^\d{2}:\d{2}/.test(String(timeValue))) ? String(timeValue).slice(0, 5) : "00:00";
    const parsed = new Date(`${safeDate}T${safeTime}:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const grouped = useMemo(() => {
    const now = new Date();
    const map = new Map();
    items.forEach((item) => {
      const interviewDate = toInterviewDateTime(item?.interview?.date, item?.interview?.time);
      if (!interviewDate || interviewDate < now) return;
      const dateKey = interviewDate.toISOString().slice(0, 10);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey).push(item);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const handleViewDetails = (student) => {
    if (!student?._id) return;
    if (role === "TEACHER") {
      navigate(`/teacher-dashboard/interview?candidateId=${student._id}`);
      return;
    }
    navigate(`/head-dashboard/head-accepted?candidateId=${student._id}`);
  };

  return (
    <div style={styles.wrap}>
      <h2 style={styles.title}>Interview Calendar</h2>
      {loading ? (
        <p style={styles.muted}>Loading interview slots...</p>
      ) : grouped.length === 0 ? (
        <div style={styles.empty}>No scheduled interviews found.</div>
      ) : (
        <div style={styles.grid}>
          {grouped.map(([date, students]) => (
            <section key={date} style={styles.card}>
              <h3 style={styles.date}>
                {new Date(date).toDateString()}
              </h3>
              <div style={styles.list}>
                {students.map((s) => (
                  <div key={s._id} style={styles.item}>
                    <strong>{s.name}</strong>
                    <span>{s.course}</span>
                    <small>{s?.interview?.time || "Time pending"}</small>
                    {s?.interview?.link ? (
                      <a href={s.interview.link} target="_blank" rel="noreferrer" style={styles.platformLink}>
                        {s?.interview?.platform || "Open Platform"}
                      </a>
                    ) : (
                      <small>{s?.interview?.platform || "Platform pending"}</small>
                    )}
                    <button type="button" style={styles.viewBtn} onClick={() => handleViewDetails(s)}>
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { maxWidth: "1080px", margin: "0 auto", padding: "1.5rem 1rem 2rem" },
  title: { margin: "0 0 1rem", color: "var(--text-main)" },
  muted: { color: "var(--text-muted)" },
  empty: { border: "1px dashed var(--border-color)", borderRadius: 12, padding: "1.5rem", color: "var(--text-muted)", background: "var(--surface-card)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" },
  card: { border: "1px solid var(--border-color)", background: "var(--surface-card)", borderRadius: 12, padding: "12px" },
  date: { margin: "0 0 10px", color: "var(--text-main)", fontSize: "1rem" },
  list: { display: "grid", gap: "8px" },
  item: { border: "1px solid var(--border-color)", borderRadius: 8, padding: "8px", display: "grid", gap: 3, color: "var(--text-main)" },
  platformLink: { color: "#2563eb", textDecoration: "underline", fontWeight: 600, fontSize: "0.85rem", width: "fit-content" },
  viewBtn: { marginTop: 6, border: "1px solid #c7d2fe", background: "#eef2ff", color: "#1e3a8a", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontWeight: 700, width: "fit-content" },
};
