import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getInterviewRequiredStudents } from "../../server/Api";
import { useToast } from "../ui/ToastContext";

export default function InterviewCalendar() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const navigate = useNavigate();
  const toast = useToast();
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

  const dayColumns = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startTomorrow = new Date(startToday);
    startTomorrow.setDate(startTomorrow.getDate() + 1);
    const startDayAfter = new Date(startToday);
    startDayAfter.setDate(startDayAfter.getDate() + 2);
    const startFourthDay = new Date(startToday);
    startFourthDay.setDate(startFourthDay.getDate() + 3);

    const buckets = {
      today: [],
      tomorrow: [],
      dayAfterTomorrow: [],
    };

    items.forEach((item) => {
      const interviewDate = toInterviewDateTime(item?.interview?.date, item?.interview?.time);
      if (!interviewDate) return;
      if (interviewDate >= startToday && interviewDate < startTomorrow) {
        buckets.today.push(item);
        return;
      }
      if (interviewDate >= startTomorrow && interviewDate < startDayAfter) {
        buckets.tomorrow.push(item);
        return;
      }
      if (interviewDate >= startDayAfter && interviewDate < startFourthDay) {
        buckets.dayAfterTomorrow.push(item);
      }
    });

    const sortByTime = (a, b) => {
      const t1 = toInterviewDateTime(a?.interview?.date, a?.interview?.time)?.getTime() || 0;
      const t2 = toInterviewDateTime(b?.interview?.date, b?.interview?.time)?.getTime() || 0;
      return t1 - t2;
    };

    buckets.today.sort(sortByTime);
    buckets.tomorrow.sort(sortByTime);
    buckets.dayAfterTomorrow.sort(sortByTime);

    return [
      { key: "today", title: "Today", date: startToday, students: buckets.today },
      { key: "tomorrow", title: "Tomorrow", date: startTomorrow, students: buckets.tomorrow },
      { key: "dayAfterTomorrow", title: "Day After Tomorrow", date: startDayAfter, students: buckets.dayAfterTomorrow },
    ];
  }, [items]);

  const handleViewDetails = (student) => {
    if (!student?._id) return;
    if (role === "TEACHER") {
      navigate(`/teacher-dashboard/interview?candidateId=${student._id}&source=calendar`);
      return;
    }
    navigate(`/head-dashboard/head-accepted?candidateId=${student._id}&source=calendar`);
  };

  const copyInterviewLink = async (link) => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Interview link copied.");
    } catch {
      toast.error("Unable to copy link.");
    }
  };

  return (
    <div style={styles.wrap}>
      <h2 style={styles.title}>Interview Calendar</h2>
      {loading ? (
        <p style={styles.muted}>Loading interview slots...</p>
      ) : (
        <div style={styles.grid}>
          {dayColumns.map((column) => (
            <section key={column.key} style={styles.card}>
              <h3 style={styles.date}>
                {column.title}
              </h3>
              <small style={styles.dateSub}>{column.date.toDateString()}</small>
              <div style={styles.list}>
                {column.students.length === 0 ? (
                  <div style={styles.dayEmpty}>No interviews scheduled.</div>
                ) : column.students.map((s) => (
                  <div key={s._id} style={styles.item}>
                    <strong>{s.name}</strong>
                    <span>{s.course}</span>
                    <small style={styles.timePlatform}>
                      {(s?.interview?.time || "Time pending")}{" "}
                      {s?.interview?.platform ? `|| ${s.interview.platform}` : ""}
                    </small>
                    {s?.interview?.link ? (
                      <div style={styles.linkActions}>
                        <button type="button" style={styles.joinBtn} onClick={() => window.open(s.interview.link, "_blank", "noopener,noreferrer")}>
                          Join
                        </button>
                        <button type="button" style={styles.copyBtn} onClick={() => copyInterviewLink(s.interview.link)}>
                          Copy Link
                        </button>
                      </div>
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
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" },
  card: { border: "1px solid var(--border-color)", background: "var(--surface-card)", borderRadius: 12, padding: "12px" },
  date: { margin: "0 0 10px", color: "var(--text-main)", fontSize: "1rem" },
  dateSub: { color: "var(--text-muted)" },
  list: { display: "grid", gap: "8px" },
  item: { border: "1px solid var(--border-color)", borderRadius: 8, padding: "8px", display: "grid", gap: 3, color: "var(--text-main)" },
  timePlatform: { color: "var(--text-muted)", fontWeight: 600 },
  dayEmpty: { border: "1px dashed var(--border-color)", borderRadius: 8, padding: "10px", color: "var(--text-muted)", fontSize: "0.9rem" },
  linkActions: { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" },
  joinBtn: { border: "1px solid #93c5fd", background: "#dbeafe", color: "#1e3a8a", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontWeight: 700, fontSize: "0.75rem" },
  copyBtn: { border: "1px solid var(--border-color)", background: "var(--surface-card)", color: "var(--text-main)", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontWeight: 700, fontSize: "0.75rem" },
  viewBtn: { marginTop: 6, border: "1px solid #c7d2fe", background: "#eef2ff", color: "#1e3a8a", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontWeight: 700, width: "fit-content" },
};
