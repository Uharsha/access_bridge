import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import EmptyState from "./pages/EmptyState";
import "./StudentDiv.css";
import { useToast } from "./ui/ToastContext";
import {
  headApproveStudent,
  headDeleteStudent,
  headRejectStudent,
  teacherApproveStudent,
  teacherRejectStudent,
} from "../server/Api";

const ACTION_REFRESH_DELAY_MS = 5000;

function StudentTable({
  students,
  refresh,
  enableSelection = false,
  selectedIds = [],
  onToggleSelected = () => {},
  initialOpenStudentId = "",
  closeRedirectPath = "",
}) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionKey, setActionKey] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const autoOpenedCandidateRef = useRef("");
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const toast = useToast();
  const safeText = (value) => String(value || "").trim();
  const toWhatsAppUrl = (value) => {
    const digits = safeText(value).replace(/\D/g, "");
    if (!digits) return "#";
    const withCountry = digits.length === 10 ? `91${digits}` : digits;
    return `https://wa.me/${withCountry}`;
  };

  const handleCloseDetails = useCallback(() => {
    setSelectedStudent(null);
    setDeleteConfirmOpen(false);
    setDeleteReason("");
    if (closeRedirectPath) {
      navigate(closeRedirectPath, { replace: true });
    }
  }, [closeRedirectPath, navigate]);

  useEffect(() => {
    if (!selectedStudent) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") handleCloseDetails();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedStudent, handleCloseDetails]);

  useEffect(() => {
    if (!initialOpenStudentId || !Array.isArray(students) || students.length === 0) return;
    if (autoOpenedCandidateRef.current === initialOpenStudentId) return;
    if (selectedStudent?._id === initialOpenStudentId) return;
    const match = students.find((student) => String(student?._id) === String(initialOpenStudentId));
    if (match) {
      setSelectedStudent(match);
      autoOpenedCandidateRef.current = initialOpenStudentId;
    }
  }, [initialOpenStudentId, students, selectedStudent]);

  if (!Array.isArray(students) || students.length === 0) {
    return <EmptyState />;
  }

  const handleAction = async (actionFn, id, key) => {
    if (actionLoading) return;

    setActionLoading(true);
    setActionKey(`${id}:${key}`);
    try {
      await actionFn(id);
      setSelectedStudent(null);
      toast.success("Action completed. Refreshing in 5 seconds...");
      window.setTimeout(() => {
        window.location.reload();
      }, ACTION_REFRESH_DELAY_MS);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Action failed.");
    } finally {
      setActionLoading(false);
      setActionKey("");
    }
  };

  const handleHeadDelete = async () => {
    if (!selectedStudent || actionLoading) return;
    setActionLoading(true);
    setActionKey(`${selectedStudent._id}:head-delete`);
    try {
      await headDeleteStudent(selectedStudent._id, deleteReason.trim());
      setSelectedStudent(null);
      setDeleteConfirmOpen(false);
      setDeleteReason("");
      toast.success("Application deleted. Refreshing in 5 seconds...");
      window.setTimeout(() => {
        window.location.reload();
      }, ACTION_REFRESH_DELAY_MS);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Delete failed.");
    } finally {
      setActionLoading(false);
      setActionKey("");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "SUBMITTED":
        return "#0d6efd";
      case "SELECTED":
        return "#198754";
      case "REJECTED":
      case "HEAD_REJECTED":
        return "#dc3545";
      default:
        return "#fd7e14";
    }
  };

  const renderDocLink = (label, url) =>
    url ? (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        style={styles.docLink}
      >
        {label}
      </a>
    ) : null;

  return (
    <div style={styles.tableContainer}>
      {students.map((s) => (
        <div
          key={s._id}
          style={{
            ...styles.card,
            borderLeft: `6px solid ${getStatusColor(s.status)}`,
          }}
        >
          {enableSelection && (
            <input
              type="checkbox"
              checked={selectedIds.includes(s._id)}
              onChange={() => onToggleSelected(s._id)}
              aria-label={`Select ${s.name}`}
              style={{ position: "absolute", left: 10, top: 10 }}
            />
          )}
          {s.passport_photo ? (
            <a href={s.passport_photo} target="_blank" rel="noreferrer" title="Open passport photo">
              <img src={s.passport_photo} alt={`${s.name} passport`} style={styles.cardImage} />
            </a>
          ) : (
            <img src="/default-user.png" alt="user" style={styles.cardImage} />
          )}
          <h3 style={styles.cardName}>{s.name}</h3>
          <p style={styles.cardCourse}>{s.course}</p>
          <span style={{ ...styles.statusPill, color: getStatusColor(s.status), borderColor: `${getStatusColor(s.status)}55` }}>
            {String(s.status || "PENDING").replaceAll("_", " ")}
          </span>
          <button type="button" onClick={() => setSelectedStudent(s)} style={styles.viewButton}>
            View Profile
          </button>
        </div>
      ))}

      {selectedStudent && (
        <div className="modalOverlay" onClick={(e) => e.target === e.currentTarget && handleCloseDetails()}>
          <div className="modalContent" role="dialog" aria-modal="true" aria-labelledby="student-details-title">
            <button type="button" onClick={handleCloseDetails} style={styles.closeButton} aria-label="Close details">
              x
            </button>

            <div className="profileHeader">
              {selectedStudent.passport_photo ? (
                <a href={selectedStudent.passport_photo} target="_blank" rel="noreferrer" title="Open passport photo">
                  <img src={selectedStudent.passport_photo} alt="Student profile" className="profileImage" />
                </a>
              ) : (
                <img src="/default-user.png" alt="Student profile" className="profileImage" />
              )}
              <div>
                  <h2 id="student-details-title" style={styles.profileName}>{selectedStudent.name}</h2>
                <p style={{ ...styles.profileStatus, color: getStatusColor(selectedStudent.status) }}>
                  Status: {selectedStudent.status}
                </p>
              </div>
            </div>

            <div className="detailsGrid">
              <div>
                <p style={styles.detailLine}>
                  <strong style={styles.detailKey}>Email:</strong>{" "}
                  <a href={`mailto:${safeText(selectedStudent.email)}`} style={styles.link}>
                    {safeText(selectedStudent.email)}
                  </a>
                </p>
                <p style={styles.detailLine}>
                  <strong style={styles.detailKey}>Mobile:</strong>{" "}
                  <a href={toWhatsAppUrl(selectedStudent.mobile)} target="_blank" rel="noreferrer" style={styles.link}>
                    {safeText(selectedStudent.mobile)}
                  </a>
                </p>
                <p style={styles.detailLine}><strong style={styles.detailKey}>DOB:</strong> <span style={styles.detailValue}>{new Date(selectedStudent.dob).toLocaleDateString()}</span></p>
                <p style={styles.detailLine}><strong style={styles.detailKey}>Gender:</strong> <span style={styles.detailValue}>{selectedStudent.gender}</span></p>
                <p style={styles.detailLine}><strong style={styles.detailKey}>State/Dist:</strong> <span style={styles.detailValue}>{selectedStudent.state}, {selectedStudent.district}</span></p>
              </div>
              <div>
                <p style={styles.detailLine}><strong style={styles.detailKey}>Disability:</strong> <span style={styles.detailValue}>{selectedStudent.disabilityStatus}</span></p>
                <p style={styles.detailLine}><strong style={styles.detailKey}>Education:</strong> <span style={styles.detailValue}>{selectedStudent.education}</span></p>
                <p style={styles.detailLine}><strong style={styles.detailKey}>Computer:</strong> <span style={styles.detailValue}>{selectedStudent.basicComputerKnowledge}</span></p>
                <p style={styles.detailLine}><strong style={styles.detailKey}>English:</strong> <span style={styles.detailValue}>{selectedStudent.basicEnglishSkills}</span></p>
                <p style={styles.detailLine}><strong style={styles.detailKey}>NVDA:</strong> <span style={styles.detailValue}>{selectedStudent.ScreenReader || "N/A"}</span></p>
                <p style={styles.detailLine}><strong style={styles.detailKey}>Enrolled:</strong> <span style={styles.detailValue}>{selectedStudent.enrolledCourse}</span></p>
                <p style={styles.rulesText}>
                  TTI Rules: <strong style={styles.detailKey}>Candidate has accepted the rules and regulations</strong>
                </p>
              </div>
            </div>

            <div style={styles.timelineWrap}>
              <h4 style={styles.timelineTitle}>Candidate Timeline</h4>
              <div style={styles.timeline}>
                {[
                  "SUBMITTED",
                  "HEAD_ACCEPTED",
                  "INTERVIEW_SCHEDULED",
                  "SELECTED",
                ].map((step) => {
                  const current = selectedStudent.status;
                  const order = ["SUBMITTED", "HEAD_ACCEPTED", "INTERVIEW_SCHEDULED", "SELECTED", "REJECTED", "HEAD_REJECTED"];
                  const active = order.indexOf(current) >= order.indexOf(step) && !["REJECTED", "HEAD_REJECTED"].includes(current);
                  const rejected = ["REJECTED", "HEAD_REJECTED"].includes(current) && step === "SELECTED";
                  return (
                    <div key={step} style={styles.timelineItem}>
                      <span style={{ ...styles.timelineDot, ...(active ? styles.timelineDotActive : {}), ...(rejected ? styles.timelineDotRejected : {}) }} />
                      <span style={styles.timelineLabel}>{step.replaceAll("_", " ")}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={styles.documentsSection}>
              <h4 style={styles.documentsTitle}>Verification Documents</h4>
              <div style={styles.documentsGrid}>
                {renderDocLink("Aadhar", selectedStudent.adhar)}
                {renderDocLink("UDID Card", selectedStudent.UDID)}
                {renderDocLink("Disability Cert", selectedStudent.disability)}
                {renderDocLink("Degree Memo", selectedStudent.Degree_memo)}
                {renderDocLink("Medical certificate", selectedStudent.doctor)}
              </div>
            </div>

            <div className="actionsSection">
              {selectedStudent.status === "SUBMITTED" && (
                <>
                  <button
                    type="button"
                    onClick={() => handleAction(headApproveStudent, selectedStudent._id, "head-approve")}
                    disabled={actionLoading}
                    style={{
                      ...styles.actionButton,
                      backgroundColor: "#28a745",
                      ...(actionLoading ? styles.disabledActionButton : {}),
                    }}
                  >
                    {actionKey === `${selectedStudent._id}:head-approve` ? "Processing..." : "Approve Application"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(headRejectStudent, selectedStudent._id, "head-reject")}
                    disabled={actionLoading}
                    style={{
                      ...styles.actionButton,
                      backgroundColor: "#dc3545",
                      ...(actionLoading ? styles.disabledActionButton : {}),
                    }}
                  >
                    {actionKey === `${selectedStudent._id}:head-reject` ? "Processing..." : "Reject Application"}
                  </button>
                </>
              )}
              {role === "HEAD" && (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={actionLoading}
                  style={{
                    ...styles.actionButton,
                    backgroundColor: "#6c757d",
                    ...(actionLoading ? styles.disabledActionButton : {}),
                  }}
                >
                  {actionKey === `${selectedStudent._id}:head-delete` ? "Deleting..." : "Delete Application"}
                </button>
              )}
              {selectedStudent.status === "HEAD_ACCEPTED" && role === "TEACHER" && (
                <a
                  href={`${role === "TEACHER" ? "/teacher-dashboard" : "/head-dashboard"}/interview/details/${selectedStudent._id}`}
                  style={{ ...styles.actionButton, backgroundColor: "#ffc107", color: "#000", textDecoration: "none", textAlign: "center" }}
                >
                  Schedule Interview
                </a>
              )}
              {selectedStudent.status === "INTERVIEW_SCHEDULED" && (
                <>
                  <button
                    type="button"
                    onClick={() => handleAction(teacherApproveStudent, selectedStudent._id, "teacher-approve")}
                    disabled={actionLoading}
                    style={{
                      ...styles.actionButton,
                      backgroundColor: "#007bff",
                      ...(actionLoading ? styles.disabledActionButton : {}),
                    }}
                  >
                    {actionKey === `${selectedStudent._id}:teacher-approve` ? "Processing..." : "Confirm Selection"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(teacherRejectStudent, selectedStudent._id, "teacher-reject")}
                    disabled={actionLoading}
                    style={{
                      ...styles.actionButton,
                      backgroundColor: "#dc3545",
                      ...(actionLoading ? styles.disabledActionButton : {}),
                    }}
                  >
                    {actionKey === `${selectedStudent._id}:teacher-reject` ? "Processing..." : "Final Reject"}
                  </button>
                </>
              )}
              {selectedStudent.decisionDone && (
                <p style={styles.finalMessage}>Decision has been finalized for this candidate.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {deleteConfirmOpen && selectedStudent && (
        <div className="modalOverlay" onClick={(e) => e.target === e.currentTarget && setDeleteConfirmOpen(false)}>
          <div className="modalContent" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title">
            <button type="button" onClick={() => setDeleteConfirmOpen(false)} style={styles.closeButton} aria-label="Close delete confirmation">
              x
            </button>
            <h3 id="delete-confirm-title" style={styles.confirmTitle}>Delete Application</h3>
            <p style={styles.confirmText}>
              You are deleting <strong>{selectedStudent.name}</strong>. This removes the application from dashboard lists.
            </p>
            <label htmlFor="delete-reason" style={styles.confirmLabel}>Reason (optional)</label>
            <textarea
              id="delete-reason"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={3}
              placeholder="Example: Duplicate entry"
              style={styles.confirmInput}
            />
            <div style={styles.confirmActions}>
              <button type="button" style={styles.cancelBtn} onClick={() => setDeleteConfirmOpen(false)} disabled={actionLoading}>
                Cancel
              </button>
              <button
                type="button"
                style={styles.deleteBtn}
                onClick={handleHeadDelete}
                disabled={actionLoading}
              >
                {actionLoading ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  tableContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(235px, 1fr))",
    gap: "16px",
    padding: "10px 2px",
  },
  card: {
    background: "var(--dash-panel-bg)",
    color: "var(--text-main)",
    border: "1px solid var(--dash-panel-border)",
    borderRadius: "14px",
    padding: "16px 14px 14px",
    width: "100%",
    position: "relative",
    boxShadow: "0 12px 28px rgba(2, 8, 25, 0.24)",
    textAlign: "center",
    transition: "all 0.3s ease",
    backdropFilter: "blur(2px)",
  },
  cardImage: {
    width: 86,
    height: 86,
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid var(--dash-soft-border)",
    boxShadow: "0 8px 18px rgba(2, 8, 25, 0.35)",
  },
  cardName: {
    margin: "11px 0 5px",
    color: "var(--dash-strong-text)",
    fontWeight: "700",
    fontSize: "1.05rem",
  },
  cardCourse: {
    color: "var(--dash-muted-text)",
    fontSize: "13px",
    fontWeight: "600",
    margin: 0,
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.2px",
    marginTop: "10px",
    textTransform: "uppercase",
    background: "var(--dash-soft-bg)",
  },
  viewButton: {
    width: "100%",
    padding: "9px",
    background: "linear-gradient(135deg, #657cff, #8b5cf6)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
    marginTop: "12px",
    boxShadow: "0 8px 18px rgba(79,70,229,0.35)",
  },
  closeButton: {
    position: "absolute",
    top: "15px",
    right: "20px",
    border: "none",
    background: "transparent",
    color: "var(--modal-text)",
    fontSize: "24px",
    cursor: "pointer",
  },
  profileName: {
    margin: 0,
    color: "var(--modal-text)",
    fontWeight: "700",
  },
  profileStatus: {
    fontWeight: "bold",
    margin: "5px 0",
  },
  link: {
    textDecoration: "none",
    color: "var(--modal-link)",
    fontWeight: "600",
  },
  detailLine: {
    color: "var(--modal-text)",
    margin: "0 0 6px 0",
  },
  detailKey: {
    color: "var(--modal-text)",
  },
  detailValue: {
    color: "var(--modal-text)",
  },
  rulesText: {
    fontStyle: "italic",
    color: "var(--modal-muted)",
  },
  documentsSection: {
    marginTop: "20px",
    padding: "15px",
    backgroundColor: "var(--modal-surface-muted)",
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
  },
  documentsTitle: {
    margin: "0 0 10px 0",
    color: "var(--modal-text)",
    fontWeight: "700",
  },
  documentsGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  docLink: {
    padding: "5px 10px",
    backgroundColor: "var(--modal-surface)",
    borderRadius: "5px",
    textDecoration: "none",
    color: "var(--modal-text)",
    fontSize: "12px",
    border: "1px solid var(--border-color)",
  },
  actionButton: {
    flex: 1,
    minWidth: "170px",
    color: "#fff",
    border: "none",
    padding: "14px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "14px",
    opacity: 1,
  },
  disabledActionButton: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
  finalMessage: {
    width: "100%",
    textAlign: "center",
    color: "var(--modal-muted)",
    fontStyle: "italic",
  },
  timelineWrap: {
    marginTop: "14px",
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    padding: "10px",
    background: "var(--modal-surface-muted)",
  },
  timelineTitle: {
    margin: "0 0 8px 0",
    color: "var(--modal-text)",
  },
  timeline: {
    display: "grid",
    gap: "6px",
  },
  timelineItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  timelineDot: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    background: "#cbd5e1",
  },
  timelineDotActive: {
    background: "#2563eb",
  },
  timelineDotRejected: {
    background: "#dc2626",
  },
  timelineLabel: {
    fontSize: "12px",
    color: "var(--modal-text)",
    fontWeight: 600,
  },
  confirmTitle: {
    margin: "0 0 10px",
    color: "var(--modal-text)",
  },
  confirmText: {
    color: "var(--modal-muted)",
    margin: "0 0 10px",
    lineHeight: 1.45,
  },
  confirmLabel: {
    display: "block",
    fontWeight: 700,
    color: "var(--modal-text)",
    marginBottom: "6px",
  },
  confirmInput: {
    width: "100%",
    resize: "vertical",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    padding: "8px",
    color: "var(--modal-text)",
    background: "var(--modal-surface-muted)",
    marginBottom: "12px",
  },
  confirmActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    flexWrap: "wrap",
  },
  cancelBtn: {
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    background: "var(--modal-surface)",
    color: "var(--modal-text)",
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  deleteBtn: {
    border: "1px solid #ef9a9a",
    borderRadius: "8px",
    background: "#ffebee",
    color: "#b71c1c",
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
};

export default StudentTable;
