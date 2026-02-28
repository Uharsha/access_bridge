


import { useLayoutEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import AdmissionForm from "./component/AdimssoinForm";
import './App.css'
import Rules from "./component/data/Rules";

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useLayoutEffect(() => {
    // Hard reset scroll for SPA route changes.
    if (typeof window !== "undefined") {
      window.history.scrollRestoration = "manual";
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search]);

  return null;
}

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<AdmissionForm />} />
        <Route path="/admission" element={<AdmissionForm />} />
        <Route path="/rules" element={<Rules />} />
      </Routes>
    </>
  );
}

export default App;
