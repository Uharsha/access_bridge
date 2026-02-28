function EmptyState({
  title = "No Candidates Yet",
  subtitle = "Once applications are submitted, they will appear here.",
  ctaLabel = "Go to Pending",
  ctaHref = "/head-dashboard/pending",
}) {
  return (
    <section style={styles.wrap}>
      <div style={styles.illustration} aria-hidden="true">
        <span style={styles.orbA}></span>
        <span style={styles.orbB}></span>
        <span style={styles.icon}>Inbox</span>
      </div>
      <h2 style={styles.title}>{title}</h2>
      <p style={styles.subtitle}>{subtitle}</p>
      <a href={ctaHref} style={styles.cta}>{ctaLabel}</a>
    </section>
  );
}

const styles = {
  wrap: {
    width: "100%",
    textAlign: "center",
    padding: "70px 20px",
    color: "var(--text-main)",
    border: "1px dashed var(--border-color)",
    background: "var(--surface-card)",
    borderRadius: "var(--radius-lg)",
    animation: "fade 0.5s ease-in-out",
  },
  illustration: {
    width: 110,
    height: 110,
    margin: "0 auto 16px",
    borderRadius: "50%",
    position: "relative",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(140deg, rgba(102,126,234,0.18), rgba(118,75,162,0.1))",
    border: "1px solid var(--border-color)",
  },
  orbA: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#667eea",
    top: 14,
    left: 20,
    opacity: 0.7,
  },
  orbB: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: "#764ba2",
    bottom: 16,
    right: 24,
    opacity: 0.7,
  },
  icon: {
    fontWeight: 800,
    color: "var(--text-main)",
    fontSize: "0.95rem",
  },
  title: {
    margin: "0 0 6px",
    fontSize: "1.3rem",
    color: "var(--text-main)",
  },
  subtitle: {
    margin: "0 0 14px",
    color: "var(--text-muted)",
  },
  cta: {
    display: "inline-flex",
    textDecoration: "none",
    border: "1px solid var(--border-color)",
    background: "var(--surface-muted)",
    color: "var(--text-main)",
    borderRadius: "999px",
    padding: "8px 14px",
    fontWeight: 700,
  },
};

export default EmptyState;
