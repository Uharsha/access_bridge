import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";

import InputField from "./InputFeild";
import GenderRadio from "./GenderFeild";
import SelectField from "./SelectFeild";
import DistrictData from "./data/DistrictData";
import Ratio from "./Ratio";
import RatioKnowledge from "./RatioKnowledge";
import RatioBasic from "./RatioBasic";

const API_BASE_URL = (import.meta.env.VITE_API_BASE || "http://localhost:5530").replace(/\/+$/, "");
const formatDobForAssistiveText = (value) => {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const buildErrorMessage = (res, data, rawText) => {
  const error = String(data?.error || "").trim();
  const message = String(data?.message || "").trim();
  const detail = String(data?.detail || "").trim();
  const details = Array.isArray(data?.details) ? data.details.filter(Boolean) : [];
  const mailErrors = data?.mailErrors && typeof data.mailErrors === "object"
    ? Object.entries(data.mailErrors)
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}: ${value}`)
    : [];

  if (res.status === 409 || error.toLowerCase().includes("duplicate key")) {
    return "You have already submitted the form with this email or mobile.";
  }

  const chunks = [error, message, detail, ...details, ...mailErrors].filter(Boolean);
  if (chunks.length) return chunks.join(" | ");

  const fallback = String(rawText || "").trim();
  return fallback || `Submission failed with status ${res.status}`;
};

function AdmissionForm() {
  const formRef = useRef(null);
  const initialFormState = {
    name: "",
    email: "",
    mobile: "",
    dob: "",
    gender: "",
    state: "",
    district: "",
    course: "",
    disabilityStatus: "",
    education: "",
    enrolledCourse: "",
    basicComputerKnowledge: "",
    basicEnglishSkills: "",
    ScreenReader: "",
    declaration: false
  };

  const [form, setForm] = useState(() => {
    const savedForm = localStorage.getItem("admissionForm");
    if (!savedForm) return initialFormState;

    try {
      return { ...initialFormState, ...JSON.parse(savedForm) };
    } catch {
      return initialFormState;
    }
  });

  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("admissionThemeMode") || "dark");

  /* ================== SAVE FORM TO LOCALSTORAGE ================== */
  useEffect(() => {
    localStorage.setItem("admissionForm", JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    localStorage.setItem("admissionThemeMode", themeMode);
  }, [themeMode]);

  useEffect(() => {
    const darkClass = "admission-page-dark";
    const lightClass = "admission-page-light";
    document.body.classList.remove(darkClass, lightClass);
    document.body.classList.add(themeMode === "light" ? lightClass : darkClass);

    return () => {
      document.body.classList.remove(darkClass, lightClass);
    };
  }, [themeMode]);

  useLayoutEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  /* ================== HANDLE CHANGE ================== */
const handleChange = (e) => {
  const { name, value, type, checked } = e.target;

  if (name === "mobile" && !/^\d{0,10}$/.test(value)) return;

  setForm((prev) => ({
    ...prev,
    [name]: type === "checkbox" ? checked : value
  }));
};

  const fillFakeData = () => {
    const fallbackState = Object.keys(DistrictData)[0] || "";
    const selectedState = DistrictData.Maharashtra ? "Maharashtra" : fallbackState;
    const selectedDistrict = (DistrictData[selectedState] && DistrictData[selectedState][0]) || "";

    setForm((prev) => ({
      ...prev,
      name: "Harsha Demo",
      email: `harsha.demo.${Date.now().toString().slice(-5)}@example.com`,
      mobile: "9876543210",
      dob: "2001-08-15",
      gender: "Male",
      state: selectedState,
      district: selectedDistrict,
      course: "BasicComputers",
      disabilityStatus: "40% locomotor disability",
      education: "B.Com Final Year",
      enrolledCourse: "Spoken English",
      basicComputerKnowledge: "Yes",
      basicEnglishSkills: "Average",
      ScreenReader: "Yes",
      declaration: true,
    }));
    setStatus("");
    setMessage("");
  };

  /* ================== HANDLE SUBMIT ================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setStatus("");
    setMessage("");

    if (!form.course) {
      alert("Please select a course!");
      setLoading(false);
      return;
    }

    if (!form.declaration) {
      setStatus("error");
      setMessage("Please check the Rules and Regulations checkbox to proceed!");
      setLoading(false);
      return;
    }

    const formData = new FormData(e.target);
    
    try {
      const res = await fetch(`${API_BASE_URL}/admission/saveAdmission`, {
        method: "POST",
        body: formData,
      });

      const rawText = await res.text();
      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {};
      }

      if (res.ok) {
        setStatus("success");
        setMessage("Submitted successfully!");

        e.target.reset();
        setForm(initialFormState);
        localStorage.removeItem("admissionForm");
      } else {
        setStatus("error");
        setMessage(buildErrorMessage(res, data, rawText));
      }
    } catch (err) {
      setStatus("error");
      setMessage("Server error: " + err.message);
    } finally {
      setLoading(false);
    }
   
  };

  return (
    <div className={`form-wrapper theme-${themeMode}`}>
      <div className="container">
      <form
        ref={formRef}
        id="main"
        role="main"
        onSubmit={handleSubmit}
        className="admission-form"
        encType="multipart/form-data"
        aria-busy={loading}
        aria-labelledby="admission-title"
      >
        <div className="theme-switcher" role="group" aria-label="Form color mode">
          <button
            type="button"
            className={`theme-btn ${themeMode === "dark" ? "active" : ""}`}
            onClick={() => setThemeMode("dark")}
          >
            Dark
          </button>
          <button
            type="button"
            className={`theme-btn ${themeMode === "light" ? "active" : ""}`}
            onClick={() => setThemeMode("light")}
          >
            Light
          </button>
        </div>

        <p id="admission-title" className="title">Admission</p>
        <h2>
          <span style={{ color: "white" }}>Technical Training Institute of PBMA</span>
        </h2>
        <div style={{ marginBottom: "14px" }}>
        
        </div>

        <InputField
          id="fullname"
          label="Full Name"
          placeholder="Enter your full name"
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
        />

        <InputField
          id="email"
          label="E-mail"
          placeholder="Enter your email"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
        />

      <InputField
        id="mobile"
        label="Mobile"
        placeholder="Enter your mobile number"
        name="mobile"
        type="tel"
        value={form.mobile}
        onChange={handleChange}
        required
        // pattern="^9[0-9]{9}$"
        title="Mobile number exactly 10 digits long"
        maxLength={10}
      />

        <InputField
          id="dob"
          label="Date of Birth"
          type="date"
          name="dob"
          value={form.dob}
          onChange={handleChange}
          aria-describedby="dob-help dob-preview"
          required
        />
        <p id="dob-help" className="visually-hidden">
          Use year format YYYY. Example: 2001.
        </p>
        {form.dob && (
          <p id="dob-preview" className="dob-preview-text" aria-live="polite">
            Selected Date of Birth: {formatDobForAssistiveText(form.dob)}
          </p>
        )}

        <GenderRadio
          value={form.gender}
          placeholder="Select your gender"
          onChange={handleChange}
        />
       
        <SelectField
          id="course"
          label="Select course"
          name="course"
          options={[
          { value: "DBMS", label: "Database Management System" },
          { value: "CloudComputing", label: "Microsoft Azure (Cloud Computing)" },
          { value: "Accessibility", label: "Accessibility Testing" },
          { value: "BasicComputers", label: "Microsoft Office (Basic Computer)" },
          { value: "MachineLearning", label: "AI & Machine Learning (AIML)" }
        ]}
          value={form.course}
          onChange={handleChange}
          required
          placeholder="Select a course"
        />

        <SelectField
          id="state"
          label="State"
          placeholder="Select your state"
          name="state"
          options={Object.keys(DistrictData)}
          value={form.state}
          onChange={handleChange}
          required
        />

        <SelectField
          id="district"
          label="District"
          placeholder="Select your district"
          name="district"
          options={DistrictData[form.state] || []}
          value={form.district}
          onChange={handleChange}
          required
        />
         <InputField
          id="education"
          label="Currently pursuing any education (if yes specify)"
          placeholder="Enter your current education details"
          type="text"
          name="education"
          value={form.education}
          onChange={handleChange}
          required
        />
         <InputField
          id="enrolledCourse"
          label="currently enrolled for any specific course (if yes specify)"
          placeholder="Enter the course you are currently enrolled in"
          type="text"
          name="enrolledCourse"
          value={form.enrolledCourse}
          onChange={handleChange}
          required
        />
         <InputField
          id="disability"
          label="mention the disability status with percentage (if applicable)"
          placeholder="Enter disability details"
          type="text"
          name="disabilityStatus"
          value={form.disabilityStatus}
          onChange={handleChange}
          required
        />
        <Ratio
          value={form.basicComputerKnowledge}
          onChange={handleChange}
        />
        <RatioKnowledge 
          value={form.basicEnglishSkills}
          onChange={handleChange}
        />
       <RatioBasic value={form.ScreenReader} onChange={handleChange} />

       <InputField id="passport_photo" label="Passport Photo" type="file" name="passport_photo" placeholder="Upload passport photo" required/>
       <InputField id="adhar" label="Aadhar Card" type="file" name="adhar" placeholder="Upload Aadhar card" required />
       <InputField id="UDID" label="UDID" type="file" name="UDID" placeholder="Upload UDID document" required/>
       <InputField id="disability_cert" label="Disability Certificate" type="file" name="disability" placeholder="Upload disability certificate" required />
       <InputField id="marks" label="Degree Certificate" type="file" name="Degree_memo" placeholder="Upload degree certificate" required/>
       <InputField id="doctor" label="Medical certificate" type="file" name="doctor" placeholder="Upload medical certificate" required/>

       <div className="declaration-wrap">
        <input
         id="declaration"
         type="checkbox"
         name="declaration"
         checked={form.declaration}
         onChange={handleChange}
         className="declaration-check"
         aria-required={true}
        />

          <div className="declaration-text">
            <label htmlFor="declaration" className="declaration-label" required>
              I hereby declare that the information provided is true to the best of my knowledge. I understand that any false information may lead to the rejection of my application.
            </label>{" "}
            
            <Link
              to="/rules"
              className="rules-link"
              onClick={(e) => e.stopPropagation()}
              >
              Read the Rules and Regulations
            </Link>{" "}
            before submitting the form.
          <br />
          </div>
        </div>

        <div className="form-buttons-wrapper">
          <Link
            to="/"
            className="submit-btn desc-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
            }}
          >
            Description
          </Link>

          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>

        {/* STATUS MESSAGE */}
        {status && (
          <div className={`status-box ${status}`} role="alert">
            <div className="status-icon" aria-hidden="true">
              {status === "success" ? "✓" : "✕"}
            </div>
            <p>{message}</p>
          </div>
        )}

        {loading && (
          <div className="submit-progress" role="status" aria-live="polite">
            <div className="submit-orbit" aria-hidden="true">
              <span className="submit-orbit-core"></span>
              <span className="submit-orbit-ring submit-orbit-ring-a"></span>
              <span className="submit-orbit-ring submit-orbit-ring-b"></span>
            </div>
            <p className="submit-progress-title">Uploading your documents...</p>
            <p className="submit-progress-subtitle">Please wait. It may take a couple of minutes.</p>
          </div>
        )}
      </form>
      </div>
    </div>
  );
}

export default AdmissionForm;





