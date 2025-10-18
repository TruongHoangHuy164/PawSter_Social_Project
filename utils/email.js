// Reusable email helper (Nodemailer) for later SMTP use
// Configure via environment:
//  SMTP_HOST=smtp.gmail.com
//  SMTP_PORT=587
//  SMTP_USER=you@gmail.com
//  SMTP_PASS=your_app_password
//  SMTP_SECURE=false
//  SMTP_REQUIRE_TLS=true
//  SMTP_CONNECTION_TIMEOUT=5000
//  SMTP_GREETING_TIMEOUT=5000
//  SMTP_SOCKET_TIMEOUT=5000

import nodemailer from "nodemailer";

const toBool = (v, d = false) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return ["1", "true", "yes", "on"].includes(v.toLowerCase());
  return d;
};

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = toBool(process.env.SMTP_SECURE, false);
const SMTP_REQUIRE_TLS = toBool(process.env.SMTP_REQUIRE_TLS, true);
const SMTP_CONNECTION_TIMEOUT = Number(process.env.SMTP_CONNECTION_TIMEOUT || 5000);
const SMTP_GREETING_TIMEOUT = Number(process.env.SMTP_GREETING_TIMEOUT || 5000);
const SMTP_SOCKET_TIMEOUT = Number(process.env.SMTP_SOCKET_TIMEOUT || 5000);

let transporter;

function buildTransporter() {
  if (transporter) return transporter;
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP credentials missing. Set SMTP_USER and SMTP_PASS in your environment.");
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE, // false for 587 (STARTTLS), true for 465
    requireTLS: SMTP_REQUIRE_TLS,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: SMTP_CONNECTION_TIMEOUT,
    greetingTimeout: SMTP_GREETING_TIMEOUT,
    socketTimeout: SMTP_SOCKET_TIMEOUT,
  });
  return transporter;
}

/**
 * Verify SMTP configuration
 * @returns {Promise<void>}
 */
export async function verifyEmailTransport() {
  const t = buildTransporter();
  await t.verify();
}

/**
 * Send an email
 * @param {{ to: string|string[], subject: string, text?: string, html?: string, from?: string }} params
 * @returns {Promise<import('nodemailer').SentMessageInfo>}
 */
export async function sendEmail({ to, subject, text, html, from }) {
  const t = buildTransporter();
  const defaultFrom = `${process.env.APP_NAME || "PawSter"} <${SMTP_USER}>`;
  const info = await t.sendMail({
    from: from || defaultFrom,
    to,
    subject,
    text,
    html,
  });
  return info;
}

export function getEmailTransport() {
  return buildTransporter();
}

export default { sendEmail, verifyEmailTransport, getEmailTransport };
