import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { scheduleInterview } from "../../server/Api";
import { useToast } from "../ui/ToastContext";
//  import { scheduleInterview } from "../../server/Api";
import "./Interview.css"; // ✅ Make sure this file contains your zak11h CSS

function Interview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [interview, setInterview] = useState({
    date: "",
    time: "",
    platform: "",
    link: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    date: "",
    time: "",
    platform: "",
    link: "",
  });

  const now = new Date();
  const minDate = now.toISOString().split("T")[0];

  const handleChange = (e) => {
    setInterview({
      ...interview,
      [e.target.name]: e.target.value,
    });
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const validate = () => {
    const nextErrors = {
      date: "",
      time: "",
      platform: "",
      link: "",
    };

    if (!interview.date) nextErrors.date = "Please choose interview date.";
    if (!interview.time) nextErrors.time = "Please choose interview time.";
    if (!interview.platform) nextErrors.platform = "Please choose a platform.";
    if (!interview.link) {
      nextErrors.link = "Please enter meeting link.";
    } else {
      try {
        const parsed = new URL(interview.link);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          nextErrors.link = "Meeting link must start with http/https.";
        }
      } catch {
        nextErrors.link = "Please enter a valid URL.";
      }
    }

    if (interview.date && interview.time) {
      const chosen = new Date(`${interview.date}T${interview.time}:00`);
      if (!Number.isNaN(chosen.getTime()) && chosen.getTime() < Date.now()) {
        nextErrors.time = "Interview time should be in the future.";
      }
    }

    setErrors(nextErrors);
    return Object.values(nextErrors).every((msg) => !msg);
  };

  const handleApprove = async () => {
    if (submitting) return;
    if (!validate()) {
      toast.error("Please fix highlighted fields.");
      return;
    }

    try {
      setSubmitting(true);
      await scheduleInterview(id, interview);
      toast.success("Interview scheduled and mail sent to candidate.");
      navigate("/teacher-dashboard/interview");
    } catch (err) {
      console.error(err);
      const backendMsg = err?.response?.data?.error || err?.response?.data?.message;
      toast.error(backendMsg || "Something went wrong while scheduling interview.");
    } finally {
      setSubmitting(false);
    }


  };

  return (
  <div className="interview-container">
    <h2 className="interview-title">Schedule Interview</h2>

    <div className="form-group">
      <label>Date</label>
      <input
        type="date"
        name="date"
        value={interview.date}
        onChange={handleChange}
        min={minDate}
      />
      {errors.date && <small className="field-error">{errors.date}</small>}
    </div>

    <div className="form-group">
      <label>Time</label>
      <input
        type="time"
        name="time"
        value={interview.time}
        onChange={handleChange}
      />
      {errors.time && <small className="field-error">{errors.time}</small>}
    </div>

    <div className="form-group">
      <label>Platform</label>
      <select
        name="platform"
        value={interview.platform}
        onChange={handleChange}
      >
        <option value="">Select</option>
        <option>Google Meet</option>
        <option>Zoom</option>
        <option>Microsoft Teams</option>
      </select>
      {errors.platform && <small className="field-error">{errors.platform}</small>}
    </div>

    <div className="form-group">
      <label>Meeting Link</label>
      <input
        type="text"
        name="link"
        placeholder="https://..."
        value={interview.link}
        onChange={handleChange}
      />
      {errors.link && <small className="field-error">{errors.link}</small>}
    </div>

    <button className="submit-btn" onClick={handleApprove} disabled={submitting}>
      {submitting ? "Sending..." : "Approve & Send Mail"}
    </button>
  </div>
  );
}

export default Interview;
