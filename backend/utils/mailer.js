const nodemailer = require('nodemailer');

let transporter = null;
let warned = false;

const getTransporter = () => {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    if (!warned && process.env.NODE_ENV !== 'test') {
      console.warn('[mailer] SMTP is not configured — email alerts are disabled.');
      warned = true;
    }
    return null;
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
};

/**
 * Sends an email. Returns true when sent, false when SMTP is not configured.
 * Never throws — alert failures must not break the request that triggered them.
 */
const sendMail = async ({ to, subject, html, text }) => {
  try {
    const tx = getTransporter();
    if (!tx) return false;
    await tx.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text,
    });
    return true;
  } catch (err) {
    console.error('[mailer] send failed:', err.message);
    return false;
  }
};

module.exports = { sendMail, isConfigured: () => Boolean(getTransporter()) };
