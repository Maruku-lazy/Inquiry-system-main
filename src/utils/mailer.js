const nodemailer = require('nodemailer');

// Deliberately provider-agnostic: plain SMTP via env vars, so swapping
// Resend for Brevo/SendGrid/a real company mailbox later is a .env change,
// never a code change.
//
// Resend specifically (what this project is currently configured for):
//   SMTP_HOST=smtp.resend.com
//   SMTP_PORT=465
//   SMTP_SECURE=true
//   SMTP_USER=resend
//   SMTP_PASS=<your Resend API key>
//   EMAIL_FROM=InquireOS <onboarding@resend.dev>
//
// IMPORTANT Resend free-tier caveat: until you verify your own sending
// domain in the Resend dashboard, you can only send FROM their sandbox
// address (onboarding@resend.dev, as above) and only TO the email address
// on your own Resend account — real recipients will bounce until a domain
// is verified. See https://resend.com/docs/dashboard/domains/introduction.
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'Email is not configured — set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS ' +
        '(and optionally SMTP_SECURE, EMAIL_FROM) in backend/.env. See .env.example.',
    );
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || 'InquireOS <onboarding@resend.dev>';
  await getTransporter().sendMail({ from, to, subject, html, text });
}

module.exports = { sendMail };
