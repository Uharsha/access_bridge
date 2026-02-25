import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./description.css";

const TTIDescription = () => {
  const navTitleRef = useRef(null);
  const mainRef = useRef(null);
  const [showNavTitle, setShowNavTitle] = useState(false);
  const [flyPhase, setFlyPhase] = useState("typing");
  const [showIntroFly, setShowIntroFly] = useState(false);
  useEffect(() => {
    const loader = document.getElementById("loader");
    const loaderTitle = document.getElementById("loaderTitle");
    const heroTypingText = document.getElementById("heroTypingText");
    const introStartDelay = 5000;
    const introMoveDelay = introStartDelay + 700;
    const introHideDelay = introStartDelay + 2500;
    const loaderHideDelay = introStartDelay;

    let loaderTimer;
    let typeInterval;
    let flyMoveTimer;
    let flyHideTimer;
    let flyStartTimer;
    let heroTypeTimer;

    if (loaderTitle) {
      const text = (loaderTitle.textContent || "").trim();
      loaderTitle.textContent = "";
      const chars = [];

      const words = text.split(/\s+/).filter(Boolean);
      words.forEach((word, wordIndex) => {
        const wordSpan = document.createElement("span");
        wordSpan.className = "loader-word";

        [...word].forEach((char) => {
          const span = document.createElement("span");
          span.className = "char";
          span.style.setProperty("--i", String(chars.length + 1));
          span.textContent = char;
          wordSpan.appendChild(span);
          chars.push(span);
        });

        loaderTitle.appendChild(wordSpan);

        if (wordIndex < words.length - 1) {
          const spaceSpan = document.createElement("span");
          spaceSpan.className = "loader-space";
          spaceSpan.textContent = " ";
          loaderTitle.appendChild(spaceSpan);
        }
      });

      let index = 0;
      typeInterval = window.setInterval(() => {
        if (index >= chars.length) {
          clearInterval(typeInterval);
          return;
        }
        chars[index].classList.add("show");
        index += 1;
      }, 35);
    }

    loaderTimer = window.setTimeout(() => {
      if (loader) loader.classList.add("hide");
    }, loaderHideDelay);

    flyStartTimer = window.setTimeout(() => {
      setShowIntroFly(true);
      setFlyPhase("typing");
    }, introStartDelay);

    // Move early so intro does not feel slow.
    flyMoveTimer = window.setTimeout(() => {
      const flyText = document.getElementById("introFlyText");
      if (flyText && navTitleRef.current) {
        const flyRect = flyText.getBoundingClientRect();
        const navRect = navTitleRef.current.getBoundingClientRect();

        // Move using centers and clamp inside viewport so mobile text never flies off-screen.
        const startCenterX = flyRect.left + flyRect.width / 2;
        const startCenterY = flyRect.top + flyRect.height / 2;
        const targetCenterX = navRect.left + navRect.width / 2;
        const targetCenterY = navRect.top + navRect.height / 2;

        let deltaX = targetCenterX - startCenterX;
        let deltaY = targetCenterY - startCenterY;

        const margin = 10;
        const minCenterX = margin + flyRect.width / 2;
        const maxCenterX = window.innerWidth - margin - flyRect.width / 2;
        const minCenterY = margin + flyRect.height / 2;
        const maxCenterY = window.innerHeight - margin - flyRect.height / 2;

        const finalCenterX = Math.min(Math.max(startCenterX + deltaX, minCenterX), maxCenterX);
        const finalCenterY = Math.min(Math.max(startCenterY + deltaY, minCenterY), maxCenterY);

        deltaX = finalCenterX - startCenterX;
        deltaY = finalCenterY - startCenterY;

        flyText.style.setProperty("--fly-x", `${Math.round(deltaX)}px`);
        flyText.style.setProperty("--fly-y", `${Math.round(deltaY)}px`);
        setFlyPhase("moving");
      }
    }, introMoveDelay);

    // End faster so navbar title appears quickly.
    flyHideTimer = window.setTimeout(() => {
      setShowNavTitle(true);
      setFlyPhase("done");
    }, introHideDelay);

    const heroSentences = [
      "Accessible Technical Education",
      "Certified Skills and Employability",
      "A Future with Independence",
    ];
    let sentenceIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    const runHeroTyping = () => {
      if (!heroTypingText) return;

      const current = heroSentences[sentenceIndex];
      if (isDeleting) {
        charIndex -= 1;
      } else {
        charIndex += 1;
      }

      heroTypingText.textContent = current.slice(0, charIndex);

      let delay = isDeleting ? 40 : 70;
      if (!isDeleting && charIndex === current.length) {
        delay = 1100;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        sentenceIndex = (sentenceIndex + 1) % heroSentences.length;
        delay = 260;
      }

      heroTypeTimer = window.setTimeout(runHeroTyping, delay);
    };

    runHeroTyping();

    return () => {
      clearTimeout(loaderTimer);
      clearTimeout(flyStartTimer);
      clearTimeout(flyMoveTimer);
      clearTimeout(flyHideTimer);
      clearTimeout(heroTypeTimer);
      clearInterval(typeInterval);
    };
  }, []);

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <>
      <div className="loader" id="loader"><div className="loader-content"><div className="loader-emblem" aria-hidden="true"><span className="loader-orbit loader-orbit-a"></span><span className="loader-orbit loader-orbit-b"></span><span className="loader-core"></span></div><div className="loader-title" id="loaderTitle">Technical Training Institute of PBMA</div><div className="loader-track" aria-hidden="true"><span></span></div><div className="loader-pulse-row" aria-hidden="true"><span></span><span></span><span></span><span></span></div></div></div>
      <div className="progress-bar" id="progressBar" aria-hidden="true"></div><canvas id="stars" aria-hidden="true"></canvas>
      <div className="shape-bg" aria-hidden="true"><span className="shape one"></span><span className="shape two"></span><span className="shape three"></span><span className="shape four"></span></div>
      {showIntroFly && flyPhase !== "done" && (
        <div id="introFlyText" className={`intro-fly-text ${flyPhase === "moving" ? "moving" : ""}`} aria-hidden="true">
          Technical Training Institute, PBMA
        </div>
      )}
      <div className="container tti-home-container"><a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="topbar"><div className="nav-wrap"><div className="brand"><img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRFlz4OfP1nBWaS3hOa29SIyEia0ALS-gR7-Q1uBEgvYx0oNx34eaZ5jju5pNB3Lnv9kUg&usqp=CAU" alt="Institute Logo" /><div><small>Since 1960</small><div ref={navTitleRef} className={`logo-title ${showNavTitle ? "logo-title-visible" : "logo-title-hidden"}`} data-text="Technical Training Institute, PBMA">Technical Training Institute, PBMA</div></div></div><nav className="nav-links"><a href="#about">About</a><a href="#vision">Vision</a><div className="mega"><button className="menu-btn" type="button">Programs</button><div className="mega-panel"><div className="mega-grid"><div className="mega-item">IAAP CPACC &amp; WAS accessibility certifications</div><div className="mega-item">AI and Machine Learning (Google Generative AI)</div><div className="mega-item">Azure AZ-900 and DP-900 foundation tracks</div><div className="mega-item">Oracle PSQL and database management training</div></div></div></div><a href="#courses">Courses</a><Link to="/admission">Admission</Link><a href="#media">Gallery</a><a href="#contact">Contact</a></nav></div></header>
      <main id="main-content" ref={mainRef}>
        <section className="hero" id="home"><video className="hero-video" autoPlay muted loop playsInline aria-hidden="true" tabIndex={-1}><source src="https://videos.pexels.com/video-files/3195394/3195394-hd_1920_1080_25fps.mp4" type="video/mp4" /></video><div className="hero-overlay"></div><article className="hero-content" id="heroContent"><span className="tag">Online Admission Management System</span><h1 className="hero-title">Build Your Future with <br /> <span id="heroTypingText" className="typing-live" aria-live="polite" aria-atomic="true"></span></h1><p className="hero-sub">Kamla Amul Massand&apos;s The Technical Training Institute of The Poona Blind Men&apos;s Association supports visually impaired youth aged 18-45 through free training, hostel, food, medical support, and career-focused certification programs.</p><div className="wave-text" aria-hidden="true"><span style={{ "--i": 1 }}>E</span><span style={{ "--i": 2 }}>m</span><span style={{ "--i": 3 }}>p</span><span style={{ "--i": 4 }}>o</span><span style={{ "--i": 5 }}>w</span><span style={{ "--i": 6 }}>e</span><span style={{ "--i": 7 }}>r</span><span style={{ "--i": 8 }}>i</span><span style={{ "--i": 9 }}>n</span><span style={{ "--i": 10 }}>g</span><span style={{ "--i": 11 }}> </span><span style={{ "--i": 12 }}>I</span><span style={{ "--i": 13 }}>n</span><span style={{ "--i": 14 }}>d</span><span style={{ "--i": 15 }}>e</span><span style={{ "--i": 16 }}>p</span><span style={{ "--i": 17 }}>e</span><span style={{ "--i": 18 }}>n</span><span style={{ "--i": 19 }}>d</span><span style={{ "--i": 20 }}>e</span><span style={{ "--i": 21 }}>n</span><span style={{ "--i": 22 }}>c</span><span style={{ "--i": 23 }}>e</span></div><div className="hero-actions"><Link className="btn btn-primary" to="/admission">Apply for Admission</Link><a className="btn btn-secondary" href="#courses">View Certified Courses</a></div></article><aside className="hero-side"><div className="stat"><strong>1960</strong><span>Institute Established</span></div><div className="stat"><strong>18-45</strong><span>Eligible Age Group</span></div><div className="stat"><strong>75</strong><span>Total Hostel Capacity</span></div><div className="stat"><strong>Pan India</strong><span>Students Across India</span></div></aside></section>
        <section id="about" className="section reveal-left"><div className="section-head"><h3>Institute Overview</h3></div><div className="split-grid"><div className="text-block glass"><p className="muted">The institute is professionally managed by trained staff, trainers, and helpers dedicated to rehabilitation and employability. Students receive accessible learning support and practical skill development for career outcomes.</p><p className="muted" style={{ marginTop: "10px" }}><span className="glitch" data-text="100% Free Facilities">100% Free Facilities</span>: all training programs, hostel stay, food, and medical expenses are provided free for admitted students.</p></div><div className="flip-wrap"><div className="flip-card"><div className="flip-face front"><h4 style={{ fontFamily: "Montserrat,sans-serif", color: "var(--purple-700)", marginBottom: "8px" }}>Why Students Choose PBMA</h4><p className="muted">Inclusive learning, certified courses, and a complete admission-to-employability support system.</p></div><div className="flip-face back"><h4 style={{ fontFamily: "Montserrat,sans-serif", marginBottom: "8px" }}>Career Oriented</h4><p>From online registration and email updates to interview scheduling and final admission confirmation.</p></div></div></div></div><div className="grid-3"><article className="card glass"><h4>Professional Management</h4><p>Experienced and trained faculty team delivering structured training programs.</p></article><article className="card neumorph"><h4>Accessible Infrastructure</h4><p>Supportive setup for visually impaired learners with technology-enabled education.</p></article><article className="card"><h4>Outcome Driven</h4><p>Focused on confidence, employability, and independent living through skill mastery.</p></article></div></section>
        <section id="vision" className="section reveal-right"><div className="section-head"><h3>Goal, Vision, and Mission</h3></div><div className="grid-3"><article className="card"><h4>Goal</h4><p>Provide a clear online admission path so students can register easily and stay connected with the institute via email updates.</p></article><article className="card glass"><h4>Vision</h4><p>Enable visually impaired learners to acquire high-value skills, pursue higher education, and secure suitable employability.</p></article><article className="card"><h4>Mission</h4><p>Deliver vocational and technical training that enhances employability for visually impaired and disabled students.</p></article></div></section>
        <section id="courses" className="section reveal-up"><div className="section-head"><h3>Certified Courses Offered</h3></div><p className="muted">Programs designed for visually impaired graduates and postgraduates.</p><div className="courses"><article className="course-item"><strong>IAAP Accessibility Certifications</strong><span>CPACC and WAS tracks for accessibility professionals.</span></article><article className="course-item"><strong>Artificial Intelligence and Machine Learning</strong><span>Google Generative AI certification pathway.</span></article><article className="course-item"><strong>Microsoft Azure Certifications</strong><span>AZ-900 and DP-900 foundation certifications.</span></article><article className="course-item"><strong>Oracle Certification</strong><span>PSQL and database management professional modules.</span></article><article className="course-item"><strong>Microsoft Office Certification</strong><span>SPPU and Technical Board certification streams.</span></article><article className="course-item"><strong>Employability Preparation</strong><span>Communication, interview readiness, and workplace orientation.</span></article></div><div className="slider-3d" aria-label="Campus image slider"><div className="slider-track"><figure className="slide"><img src="https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=900&q=80" alt="Classroom" loading="eager" /></figure><figure className="slide"><img src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=80" alt="Campus" loading="eager" /></figure><figure className="slide"><img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80" alt="Skills training" /></figure><figure className="slide"><img src="https://images.unsplash.com/photo-1588072432904-843af37f03ed?auto=format&fit=crop&w=900&q=80" alt="Student session" /></figure><figure className="slide"><img src="https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=900&q=80" alt="Classroom" /></figure><figure className="slide"><img src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=80" alt="Campus" /></figure><figure className="slide"><img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80" alt="Skills training" /></figure><figure className="slide"><img src="https://images.unsplash.com/photo-1588072432904-843af37f03ed?auto=format&fit=crop&w=900&q=80" alt="Student session" /></figure></div></div></section>
        <section id="admission" className="section reveal-down"><div className="section-head"><h3>Online Admission Workflow</h3></div><div className="split-grid"><article className="text-block"><h4 style={{ fontFamily: "Montserrat,sans-serif", color: "var(--purple-700)" }}>Student Journey</h4><div className="process"><div className="step"><b>Registration:</b> Students submit details through the online admission form.</div><div className="step"><b>Email Updates:</b> Students receive notifications and status updates by email.</div><div className="step"><b>Interview Scheduling:</b> Institute management schedules interviews through dashboard.</div><div className="step"><b>Decision Actions:</b> Management can accept, reject, or hold applications.</div><div className="step"><b>Final Confirmation:</b> Selected students receive final admission confirmation.</div></div></article><article className="card glass" style={{ alignSelf: "stretch" }}><h4>Admission Highlights</h4><p><b>Hostel Capacity:</b> 75 students.</p><p style={{ marginTop: "8px" }}><b>Coverage:</b> Students from Pan India.</p><p style={{ marginTop: "8px" }}><b>Support:</b> Free training, hostel, food, and medical expenses.</p><Link className="btn btn-primary" style={{ display: "inline-block", marginTop: "14px" }} to="/admission">Start Registration</Link></article></div></section>
        <section id="media" className="section reveal-left"><div className="section-head"><h3>Campus Glimpse and Orientation Video</h3></div><div className="media-wrap"><figure className="media-card"><img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80" alt="Campus training activity" /></figure><figure className="media-card"><iframe src="https://www.youtube.com/embed/WjValbul9Ug" title="Orientation video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></figure></div></section>        <section id="contact" className="section reveal-right">
          <div className="section-head"><h3>Contact and Social Connect</h3></div>
          <div className="contact-box">
            <p className="muted" style={{ color: "#e9ddff", maxWidth: "unset" }}>
              Reach us for eligibility guidance, admissions, and course details.
            </p>
            <div className="contact-grid">
              <div className="contact-item">
                <span className="contact-icon" aria-hidden="true">&#9993;</span>
                <b>Email:</b>
                <a href="mailto:info@pbma.org">info@pbma.org</a>
              </div>
              <div className="contact-item">
                <span className="contact-icon" aria-hidden="true">&#9742;</span>
                <b>Phone:</b>
                <a href="tel:+910000000000">+91 00000 00000</a>
              </div>
              <div className="contact-item">
                <span className="contact-icon" aria-hidden="true">&#128247;</span>
                <b>Instagram:</b>
                <a href="https://www.instagram.com/pbma_official/" target="_blank" rel="noreferrer" aria-label="PBMA official Instagram (opens in a new tab)">@pbma_official</a>
              </div>
              <div className="contact-item location-item">
                <span className="contact-icon" aria-hidden="true">&#128205;</span>
                <a className="location-link" href="https://maps.app.goo.gl/XdnmVm7fYuizL1aKA?g_st=aw">View Location</a>
              </div>
            </div>
          </div>
        </section></main>
      <footer className="footer">Copyright 2026 | Technical Training Institute of The Poona Blind Men&apos;s Association</footer>
      </div>
    </>
  );
};

export default TTIDescription;

