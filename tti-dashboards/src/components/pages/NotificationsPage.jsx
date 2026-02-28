import { useCallback, useEffect, useState } from "react";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../../server/Api";
import { useToast } from "../ui/ToastContext";
import GlobalFilterBar from "../ui/GlobalFilterBar";

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [windowDays, setWindowDays] = useState("all");
  const [category, setCategory] = useState("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getNotifications({ days: windowDays, limit: 100 });
      setItems(res?.data?.notifications || []);
      setUnread(res?.data?.unreadCount || 0);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [toast, windowDays]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRead = async (id) => {
    try {
      await markNotificationRead(id);
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnread((prev) => Math.max(0, prev - 1));
    } catch {
      toast.error("Unable to mark as read.");
    }
  };

  const handleReadAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch {
      toast.error("Unable to mark all as read.");
    }
  };

  const filteredItems = items.filter((item) => {
    const type = String(item?.type || "INFO").toUpperCase();
    const inCategory =
      category === "ALL" ||
      (category === "INTERVIEW" && type.includes("INTERVIEW")) ||
      (category === "ADMISSION" && (type.includes("ADMISSION") || type.includes("HEAD"))) ||
      (category === "DECISION" && (type.includes("FINAL") || type.includes("REJECT")));
    const inUnread = !unreadOnly || !item.isRead;
    return inCategory && inUnread;
  });

  return (
    <div style={styles.wrap}>
      <div style={styles.headRow}>
        <h2 style={styles.title}>Notifications</h2>
        <div style={styles.actions}><span style={styles.badge}>{unread} unread</span></div>
      </div>
      <GlobalFilterBar
        title="Notification Filters"
        rightSlot={<button style={styles.btn} onClick={handleReadAll}>Mark all read</button>}
      >
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
        <div style={styles.tabRow}>
          {["ALL", "ADMISSION", "INTERVIEW", "DECISION"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setCategory(tab)}
              style={{ ...styles.tabBtn, ...(category === tab ? styles.tabBtnActive : {}) }}
            >
              {tab}
            </button>
          ))}
        </div>
        <label style={styles.unreadToggle}>
          <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
          Unread only
        </label>
      </GlobalFilterBar>

      {loading ? (
        <div style={styles.skeletonList}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={styles.skeletonItem} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={styles.emptyCard}>
          <div style={styles.emptyIcon}>Inbox</div>
          <p>No notifications match the selected filters.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {filteredItems.map((n) => (
            <button
              key={n._id}
              onClick={() => handleRead(n._id)}
              style={{
                ...styles.item,
                ...(n.isRead ? styles.itemRead : styles.itemUnread),
              }}
            >
              <strong>{n.title}</strong>
              <span>{n.message}</span>
              <small>{new Date(n.createdAt).toLocaleString()}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { maxWidth: "1080px", margin: "0 auto", padding: "1.5rem 1rem 2rem" },
  headRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" },
  title: { margin: 0, color: "var(--text-main)" },
  actions: { display: "flex", alignItems: "center", gap: "0.75rem" },
  badge: { padding: "6px 10px", borderRadius: "999px", background: "var(--surface-muted)", border: "1px solid var(--border-color)", color: "var(--text-main)", fontWeight: 700, fontSize: 12 },
  select: { border: "1px solid var(--border-color)", background: "var(--surface-card)", color: "var(--text-main)", borderRadius: 8, padding: "8px 10px", fontWeight: 600, cursor: "pointer" },
  btn: { border: "1px solid var(--border-color)", background: "var(--surface-card)", color: "var(--text-main)", borderRadius: 8, padding: "8px 12px", fontWeight: 700, cursor: "pointer" },
  tabRow: { display: "flex", flexWrap: "wrap", gap: "6px" },
  tabBtn: { border: "1px solid var(--border-color)", background: "var(--surface-card)", color: "var(--text-main)", borderRadius: 999, padding: "6px 10px", fontWeight: 700, cursor: "pointer", fontSize: "0.75rem" },
  tabBtnActive: { background: "var(--surface-muted)", borderColor: "#9db3ff" },
  unreadToggle: { display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--text-main)", fontWeight: 700, fontSize: "0.85rem" },
  list: { display: "grid", gap: "10px" },
  item: { border: "1px solid var(--border-color)", background: "var(--surface-card)", borderRadius: 10, padding: "12px", textAlign: "left", display: "grid", gap: "6px", cursor: "pointer", color: "var(--text-main)" },
  itemUnread: { borderColor: "#9db3ff", background: "rgba(157,179,255,0.15)" },
  itemRead: { opacity: 0.88 },
  skeletonList: { display: "grid", gap: "10px" },
  skeletonItem: { height: 74, borderRadius: 10, background: "linear-gradient(90deg, #e6eaf5 25%, #f4f7ff 37%, #e6eaf5 63%)", backgroundSize: "400% 100%", animation: "pulse 1.4s ease infinite" },
  emptyCard: { border: "1px dashed var(--border-color)", borderRadius: 12, padding: "2rem", textAlign: "center", color: "var(--text-muted)", background: "var(--surface-card)" },
  emptyIcon: { fontWeight: 700, marginBottom: 8, color: "var(--text-main)" },
};
