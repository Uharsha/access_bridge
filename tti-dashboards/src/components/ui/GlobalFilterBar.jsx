export default function GlobalFilterBar({
  title = "Filters",
  children,
  rightSlot = null,
}) {
  return (
    <section style={styles.wrap} aria-label={`${title} controls`}>
      <div style={styles.header}>
        <h3 style={styles.title}>{title}</h3>
        {rightSlot}
      </div>
      <div style={styles.controls}>{children}</div>
    </section>
  );
}

const styles = {
  wrap: {
    border: "1px solid var(--border-color)",
    background: "var(--surface-card)",
    borderRadius: "var(--radius-md)",
    padding: "12px",
    marginBottom: "12px",
    boxShadow: "var(--shadow-sm)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "8px",
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    color: "var(--text-main)",
    fontSize: "0.95rem",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
};
