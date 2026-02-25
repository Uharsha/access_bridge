const nodemailer = require("nodemailer");
const env = require("../config/env");

const hasCustomSmtp = Boolean(env.smtpHost) && Boolean(env.smtpUser) && Boolean(env.smtpPass);
const hasGmail = !env.smtpHost && Boolean(env.smtpUser) && Boolean(env.smtpPass);
const isMailerConfigured = Boolean(env.mailFrom) && (hasCustomSmtp || hasGmail);

const transporter = !isMailerConfigured
  ? null
  : hasCustomSmtp
    ? nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpSecure,
        auth: {
          user: env.smtpUser,
          pass: env.smtpPass,
        },
      })
    : nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: env.smtpUser,
          pass: env.smtpPass,
        },
      });

async function sendMail({ to, subject, text, html }) {
  if (!to) return { skipped: true, reason: "No recipient" };
  if (!isMailerConfigured || !transporter) {
    return { skipped: true, reason: "Mailer not configured" };
  }

  try {
    const info = await transporter.sendMail({
      from: env.mailFrom,
      to,
      subject,
      text,
      html,
    });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

function formatInterview(admission) {
  const i = admission?.interview || {};
  return `${i.date || "-"} ${i.time || "-"} (${i.platform || "-"})`;
}

const signature = `
Warm regards,<br>
<b>TTI Foundation - Admissions Team</b><br><br>
<p style="font-size:12px;color:#666;">
This is an automatically generated email. Replies to this message are not monitored.
</p>
`;

const templates = {
  submissionToHead: (admission) => ({
    subject: "New Admission Request",
    html: `
Dear Sir/Madam,<br><br>
A new admission application has been submitted and requires your review.<br><br>
<b>Applicant Details:</b><br>
Name: ${admission.name}<br>
Course Applied: ${admission.course}<br>
<p><a href="${admission.passport_photo || "#"}" target="_blank">View Full Image</a></p>
<p>Call: <a href="tel:${admission.mobile}">${admission.mobile}</a></p>
${signature}
`,
  }),
  submissionToUser: (admission) => ({
    subject: "Admission Submitted TTI",
    html: `
Dear ${admission.name},<br><br>
Thank you for applying to the <b>TTI Foundation</b>.<br>
We are pleased to inform you that your admission application has been <b>successfully submitted</b>.<br>
Our team will review your application, and you will be notified about the next steps via email.<br><br>
Please ensure that you regularly check your email for updates regarding your application status.<br><br>
If you have any questions or need further assistance, feel free to contact us at
<a href="mailto:${env.headEmail || ""}">${env.headEmail || "TTI Admissions"}</a>.<br><br>
${signature}
`,
  }),
  headAcceptedToTeacher: ({ admission, teacher }) => ({
    subject: "Candidate Approved - Schedule Interview",
    html: `
Dear ${teacher.name || "Teacher"},<br><br>
We would like to inform you that the following candidate has been approved by the Head and is ready for the interview process.<br><br>
<b>Candidate Details</b><br>
Name: ${admission.name}<br>
Course: ${admission.course}<br>
<p><a href="${admission.passport_photo || "#"}" target="_blank">View Full Image</a></p>
Please log in to the dashboard and schedule the interview at your convenience.<br><br>
${signature}
`,
  }),
  headRejectedToUser: (admission) => ({
    subject: "Application Rejected",
    html: `
<p>Dear ${admission.name},</p>
<p>Thank you for your interest in the programs offered by <b>TTI Foundation</b>.</p>
<p>After careful review of your application, we regret to inform you that your application has not been approved at this stage.</p>
<p>We appreciate the time and effort you put into submitting your application and encourage you to apply again in the future if you meet the eligibility criteria.</p>
<p>We wish you all the best in your future endeavors.</p><br>
${signature}
`,
  }),
  interviewScheduledToUser: (admission) => ({
    subject: "Interview Scheduled - TTI",
    html: `
Dear ${admission.name},<br><br>
We are pleased to inform you that your interview has been scheduled.<br><br>
<b>Interview Details:</b><br>
Date: ${admission?.interview?.date || "-"}<br>
Time: ${admission?.interview?.time || "-"}<br>
Platform: ${admission?.interview?.platform || "-"}<br>
Meeting Link: ${admission?.interview?.link || "-"}<br><br>
Please ensure that you join the interview on time.<br>
We wish you the very best.<br><br>
${signature}
`,
  }),
  finalSelectedToUser: (admission) => ({
    subject: "Congratulations - TTI",
    html: `
Dear ${admission.name},<br><br>
Congratulations!<br>
We are delighted to inform you that you have been <b>successfully selected</b> after the interview process for the <b>${admission.course}</b> course at <b>TTI Foundation</b>.<br>
Further instructions regarding onboarding will be shared with you shortly.<br>
We look forward to having you with us.<br><br>
${signature}
`,
  }),
  finalRejectedToUser: (admission) => ({
    subject: "Interview Result - TTI",
    html: `
Dear ${admission.name},<br><br>
Thank you for taking the time to apply and attend the interview with <b>TTI Foundation</b>.<br>
After careful consideration, we regret to inform you that you have not been selected at this time.<br>
We truly appreciate your interest and encourage you to apply again in the future.<br>
We wish you all the best in your academic and professional journey.<br><br>
${signature}
`,
  }),
};

module.exports = {
  sendMail,
  templates,
};
