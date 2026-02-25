import { useEffect, useState } from "react";
import { getNotifications } from "../../server/Api";

export default function AuditLogs() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [windowDays, setWindowDays] = useState("all");
  const [isCompact, setIsCompact] = useState(() => window.innerWidth <= 640);

  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth <= 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setLoading(true);
    getNotifications({ days: windowDays, limit: 200 })
      .then((res) => setRows(res?.data?.notifications || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [windowDays]);

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <h2 style={styles.title}>Audit Log Panel</h2>
        <select
          value={windowDays}
          onChange={(e) => setWindowDays(e.target.value)}
          style={styles.select}
        >
          <option value="1">Last 24 hours</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="all">All time</option>
        </select>
      </div>
      {loading ? (
        <p style={styles.muted}>Loading logs...</p>
      ) : isCompact ? (
        <div style={styles.cardList}>
          {rows.length === 0 && <div style={styles.emptyCard}>No audit entries found.</div>}
          {rows.map((row) => (
            <article key={row._id} style={styles.logCard}>
              <p style={styles.logLine}><strong>Time:</strong> {new Date(row.createdAt).toLocaleString()}</p>
              <p style={styles.logLine}><strong>Type:</strong> {row.type || "EVENT"}</p>
              <p style={styles.logLine}><strong>Message:</strong> {row.message} {row?.createdBy?.name ? `(${row.createdBy.name})` : ""}</p>
            </article>
          ))}
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={3} style={styles.empty}>No audit entries found.</td></tr>
              )}
              {rows.map((row) => (
                <tr key={row._id}>
                  <td>{new Date(row.createdAt).toLocaleString()}</td>
                  <td>{row.type || "EVENT"}</td>
                  <td>{row.message} {row?.createdBy?.name ? `(${row.createdBy.name})` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { maxWidth: "1080px", margin: "0 auto", padding: "1.5rem 1rem 2rem" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" },
  title: { margin: "0 0 1rem", color: "var(--text-main)" },
  select: { border: "1px solid var(--border-color)", background: "var(--surface-card)", color: "var(--text-main)", borderRadius: 8, padding: "8px 10px", fontWeight: 600, cursor: "pointer" },
  muted: { color: "var(--text-muted)" },
  tableWrap: { overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: 12, background: "var(--surface-card)" },
  table: { width: "100%", borderCollapse: "collapse", color: "var(--text-main)" },
  empty: { textAlign: "center", padding: "16px", color: "var(--text-muted)" },
  cardList: { display: "grid", gap: "10px" },
  logCard: { border: "1px solid var(--border-color)", borderRadius: 10, background: "var(--surface-card)", padding: "10px" },
  logLine: { margin: "0 0 6px", color: "var(--text-main)", lineHeight: 1.35, wordBreak: "break-word" },
  emptyCard: { border: "1px dashed var(--border-color)", borderRadius: 10, background: "var(--surface-card)", color: "var(--text-muted)", padding: "14px", textAlign: "center" },
};
