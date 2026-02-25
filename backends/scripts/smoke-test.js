const mongoose = require("mongoose");
const User = require("../src/models/User");
const env = require("../src/config/env");
const { hashPassword } = require("../src/utils/password");

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const API_BASE = process.env.TEST_API_BASE || "http://localhost:5530";
const uniq = Date.now();

function filePart(name) {
  return new Blob([`fake ${name} ${uniq}`], { type: "text/plain" });
}

async function postJson(path, body, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function getJson(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function putJson(path, body, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function submitAdmission({ name, email, mobile, course }) {
  const form = new FormData();
  form.set("name", name);
  form.set("email", email);
  form.set("mobile", mobile);
  form.set("dob", "2001-08-15");
  form.set("gender", "Male");
  form.set("state", "Maharashtra");
  form.set("district", "Pune");
  form.set("course", course);
  form.set("disabilityStatus", "40% locomotor disability");
  form.set("education", "B.Com");
  form.set("enrolledCourse", "Spoken English");
  form.set("basicComputerKnowledge", "Yes");
  form.set("basicEnglishSkills", "Average");
  form.set("ScreenReader", "Yes");
  form.set("declaration", "true");

  form.set("passport_photo", filePart("passport"), "passport.txt");
  form.set("adhar", filePart("adhar"), "adhar.txt");
  form.set("UDID", filePart("udid"), "udid.txt");
  form.set("disability", filePart("disability"), "disability.txt");
  form.set("Degree_memo", filePart("degree"), "degree.txt");
  form.set("doctor", filePart("doctor"), "doctor.txt");

  const res = await fetch(`${API_BASE}/admission/saveAdmission`, {
    method: "POST",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

(async () => {
  const report = [];
  const push = (step, ok, detail = "") => report.push({ step, ok, detail });

  try {
    const health = await getJson("/health");
    assert(health.res.ok, "health failed");
    push("health", true);

    const headEmail = `head.${uniq}@example.com`;
    const teacherEmail = `teacher.${uniq}@example.com`;
    const headPassword = "Test@12345";

    const regHead = await postJson("/api/auth/register", {
      name: "Head Tester",
      email: headEmail,
      password: headPassword,
      role: "HEAD",
      course: "",
    });

    if (!regHead.res.ok) {
      if (regHead.data?.error === "HEAD token required to create account") {
        await mongoose.connect(env.mongoUri);
        const seededEmail = `seed.head.${uniq}@example.com`;
        await User.create({
          name: "Seed Head",
          email: seededEmail,
          passwordHash: hashPassword(headPassword),
          role: "HEAD",
          course: "",
          authTokens: [],
        });
        await mongoose.disconnect();
        push("seed HEAD in DB (existing users found)", true, seededEmail);
      } else {
        throw new Error(`head register failed: ${JSON.stringify(regHead.data)}`);
      }
    } else {
      push("register HEAD", true);
    }

    const headLoginEmail = regHead.res.ok ? headEmail : `seed.head.${uniq}@example.com`;
    const loginHead = await postJson("/api/auth/login", {
      email: headLoginEmail,
      password: headPassword,
    });
    assert(loginHead.res.ok && loginHead.data.token, "head login failed");
    const headToken = loginHead.data.token;
    push("login HEAD", true);

    const regTeacher = await postJson(
      "/api/auth/register",
      {
        name: "Teacher Tester",
        email: teacherEmail,
        password: "Test@12345",
        role: "TEACHER",
        course: "BasicComputers",
      },
      headToken
    );
    assert(regTeacher.res.ok, `teacher register failed: ${JSON.stringify(regTeacher.data)}`);
    push("register TEACHER", true);

    const loginTeacher = await postJson("/api/auth/login", {
      email: teacherEmail,
      password: "Test@12345",
    });
    assert(loginTeacher.res.ok && loginTeacher.data.token, "teacher login failed");
    const teacherToken = loginTeacher.data.token;
    push("login TEACHER", true);

    const app1 = await submitAdmission({
      name: "Candidate One",
      email: `cand1.${uniq}@example.com`,
      mobile: `9${String(uniq).slice(-9)}`,
      course: "BasicComputers",
    });
    assert(app1.res.ok && app1.data?.data?._id, `submit app1 failed: ${JSON.stringify(app1.data)}`);
    const id1 = app1.data.data._id;
    push("submit admission #1", true, id1);

    const submitted = await getJson("/admission/submitted", headToken);
    assert(submitted.res.ok && Array.isArray(submitted.data), "head submitted list failed");
    assert(submitted.data.some((x) => x._id === id1), "app1 missing in submitted list");
    push("HEAD list submitted", true);

    const approve = await putJson(`/admission/head/approve/${id1}`, {}, headToken);
    assert(approve.res.ok && approve.data?.data?.status === "HEAD_ACCEPTED", "head approve failed");
    push("HEAD approve", true);

    const teacherHeadAccepted = await getJson("/admission/head-accepted", teacherToken);
    assert(teacherHeadAccepted.res.ok && teacherHeadAccepted.data.some((x) => x._id === id1), "teacher head-accepted list missing app1");
    push("TEACHER list head-accepted", true);

    const interview = await postJson(
      `/admission/schedule-interview/${id1}`,
      { date: "2026-03-01", time: "11:00", platform: "Google Meet", link: "https://meet.google.com/fake-link" },
      teacherToken
    );
    assert(interview.res.ok && interview.data?.data?.status === "INTERVIEW_SCHEDULED", "schedule interview failed");
    push("schedule interview", true);

    const finalApprove = await putJson(`/admission/final/approve/${id1}`, {}, teacherToken);
    assert(finalApprove.res.ok && finalApprove.data?.data?.status === "SELECTED", "final approve failed");
    push("final approve", true);

    const app2 = await submitAdmission({
      name: "Candidate Two",
      email: `cand2.${uniq}@example.com`,
      mobile: `8${String(uniq + 12345).slice(-9)}`,
      course: "BasicComputers",
    });
    assert(app2.res.ok && app2.data?.data?._id, `submit app2 failed: ${JSON.stringify(app2.data)}`);
    const id2 = app2.data.data._id;
    push("submit admission #2", true, id2);

    const headReject = await putJson(`/admission/head/reject/${id2}`, {}, headToken);
    assert(headReject.res.ok && headReject.data?.data?.status === "HEAD_REJECTED", "head reject failed");
    push("HEAD reject", true);

    const app3 = await submitAdmission({
      name: "Candidate Three",
      email: `cand3.${uniq}@example.com`,
      mobile: `7${String(uniq + 54321).slice(-9)}`,
      course: "BasicComputers",
    });
    assert(app3.res.ok && app3.data?.data?._id, `submit app3 failed: ${JSON.stringify(app3.data)}`);
    const id3 = app3.data.data._id;
    push("submit admission #3", true, id3);

    const headApprove3 = await putJson(`/admission/head/approve/${id3}`, {}, headToken);
    assert(headApprove3.res.ok, "head approve app3 failed");

    const interview3 = await postJson(
      `/admission/schedule-interview/${id3}`,
      { date: "2026-03-02", time: "10:30", platform: "Zoom", link: "https://zoom.us/fake-link" },
      teacherToken
    );
    assert(interview3.res.ok, "schedule interview app3 failed");

    const finalReject = await putJson(`/admission/final/reject/${id3}`, {}, teacherToken);
    assert(finalReject.res.ok && finalReject.data?.data?.status === "REJECTED", "final reject failed");
    push("final reject", true);

    const finalSelected = await getJson("/admission/teacher-accepted", teacherToken);
    assert(finalSelected.res.ok && finalSelected.data.some((x) => x._id === id1), "teacher selected list missing app1");
    push("TEACHER list final selected", true);

    const finalRejected = await getJson("/admission/teacher-rejected", teacherToken);
    assert(finalRejected.res.ok && finalRejected.data.some((x) => x._id === id3), "teacher rejected list missing app3");
    push("TEACHER list final rejected", true);

    const notifications = await getJson("/admission/notifications", headToken);
    assert(notifications.res.ok && Array.isArray(notifications.data.notifications), "notifications endpoint failed");
    push("notifications compatibility endpoint", true);

    console.log(JSON.stringify({ ok: true, report }, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ ok: false, error: error.message, report }, null, 2));
    process.exit(1);
  }
})();
