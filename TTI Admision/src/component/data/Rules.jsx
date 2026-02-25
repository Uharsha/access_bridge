import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Rules.css";

const sections = [
  {
    title: "Documents Required for Admission",
    intro: "At the time of admission, the applicant must submit the following documents:",
    type: "ul",
    items: [
      "Photocopy of Aadhaar Card",
      "Photocopy of UDID Card",
      "Two recent passport-size photographs",
      "School Leaving Certificate / School Certificate",
      "Disability Certificate (original for verification)",
      "Parent/Guardian ID proof (photocopy)",
      "Medical fitness certificate"
    ]
  },
  {
    title: "Institute Rules & Discipline",
    type: "ol",
    items: [
      "Students are expected to maintain discipline, honesty, and good conduct at all times.",
      "Cleanliness of classrooms, workshops, and institute premises must be maintained.",
      "Respect toward faculty members, staff, and fellow trainees is mandatory.",
      "Any involvement in fights, misbehavior, or indiscipline will lead to strict disciplinary action.",
      "Violation of institute rules may result in suspension or cancellation of admission.",
      "A minimum of 80% attendance is compulsory for course completion.",
      "Leaving the training program midway without prior written permission is not allowed.",
      "A course completion certificate will be issued only after successful completion of training and attendance requirements."
    ]
  },
  {
    title: "Hostel Rules & Regulations",
    intro: "The institute provides free hostel accommodation and meals to eligible students. Students must follow:",
    type: "ol",
    items: [
      "Hostel discipline and timing must be strictly followed.",
      "Students are responsible for maintaining cleanliness in rooms and common areas.",
      "Parents/guardians are expected to cooperate with hostel authorities whenever required.",
      "Smoking, alcohol, tobacco, and intoxicating substances are strictly prohibited inside hostel premises.",
      "The institute is not responsible for loss or damage of personal belongings.",
      "Students must bring their own daily-use items such as clothes, toiletries, bucket, mug, and other necessities.",
      "Students must vacate the hostel immediately after completion of the course."
    ]
  }
];

function Rules() {
  const navigate = useNavigate();
  const headingRef = useRef(null);
  const cardRef = useRef(null);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("admissionThemeMode") || "dark");

  useLayoutEffect(() => {
    // Ensure route always opens from top, even if browser restores old position.
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    // Keep focus at the top heading (accessibility).
    if (headingRef.current) {
      headingRef.current.focus();
    }

    // Sync with form theme preference whenever rules opens.
    setThemeMode(localStorage.getItem("admissionThemeMode") || "dark");
  }, []);

  useEffect(() => {
    const darkClass = "admission-page-dark";
    const lightClass = "admission-page-light";
    document.body.classList.remove(darkClass, lightClass);
    document.body.classList.add(themeMode === "light" ? lightClass : darkClass);

    return () => {
      document.body.classList.remove(darkClass, lightClass);
    };
  }, [themeMode]);

  return (
    <main id="main" className={`tti-rules-page theme-${themeMode}`} role="main">
      <div className="tti-rules-orb tti-rules-orb-left" aria-hidden="true" />
      <div className="tti-rules-orb tti-rules-orb-right" aria-hidden="true" />
      <div className="container">
      <article ref={cardRef} className="tti-rules-card">
        <header className="tti-rules-header">
          <p className="tti-rules-kicker">Admission Policy</p>
          <h1 ref={headingRef} tabIndex="-1">Rules & Regulations</h1>
          <p className="tti-rules-subtitle">Technical Training Institute & Hostel</p>
        </header>

        <p className="tti-rules-intro">
          Applicants are advised to carefully read and understand the following rules before applying for admission.
          Submission of the admission form implies acceptance of all institute and hostel regulations.
        </p>

        <div className="tti-rules-sections">
          {sections.map((section, index) => {
            const ListTag = section.type;

            return (
              <section
                key={section.title}
                className="tti-rules-section"
                style={{ animationDelay: `${0.12 * (index + 1)}s` }}
              >
                <h2>
                  <span>{index + 1}</span>
                  {section.title}
                </h2>

                {section.intro && <p>{section.intro}</p>}

                <ListTag>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ListTag>
              </section>
            );
          })}
        </div>

        <section className="tti-rules-note" style={{ animationDelay: "0.48s" }}>
          <h2>Important Note</h2>
          <p>
            Failure to comply with these rules may result in disciplinary action, cancellation of admission, or removal
            from hostel facilities.
          </p>
          <p>
            By submitting the admission form, the applicant and parent/guardian confirm that they have read,
            understood, and agreed to follow all rules and regulations of the institute and hostel.
          </p>
        </section>

        <div className="tti-rules-actions">
          <button
            type="button"
            className="tti-rules-back"
            aria-label="Back to admission form"
            onClick={() => navigate("/admission")}
          >
            Back to Register
          </button>
        </div>
      </article>
      </div>
    </main>
  );
}

export default Rules;

