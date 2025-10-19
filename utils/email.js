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

function loadSmtpConfig() {
  return {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    secure: toBool(process.env.SMTP_SECURE, false),
    requireTLS: toBool(process.env.SMTP_REQUIRE_TLS, true),
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 5000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 5000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 5000),
  };
}

let transporter;

function buildTransporter() {
  if (transporter) return transporter;
  const cfg = loadSmtpConfig();
  if (!cfg.user || !cfg.pass) {
    throw new Error("SMTP credentials missing. Set SMTP_USER and SMTP_PASS in your environment.");
  }
  transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure, // false for 587 (STARTTLS), true for 465
    requireTLS: cfg.requireTLS,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: cfg.connectionTimeout,
    greetingTimeout: cfg.greetingTimeout,
    socketTimeout: cfg.socketTimeout,
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
  const { user } = loadSmtpConfig();
  const defaultFrom = `${process.env.APP_NAME || "PawSter"} <${user}>`;
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
