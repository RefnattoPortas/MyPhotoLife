import nodemailer from 'nodemailer';
import { env } from '../config/index.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.mail.host || !env.mail.user) return null;
  transporter = nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.port === 465,
    auth: { user: env.mail.user, pass: env.mail.pass },
  });
  return transporter;
}

export async function sendContactEmail({ to, fromName, fromEmail, subject, message }) {
  const transport = getTransporter();
  if (!transport) throw new Error('Email service not configured');

  await transport.sendMail({
    from: `"${fromName}" <${env.mail.from}>`,
    replyTo: fromEmail,
    to,
    subject: `[Contato Portfólio] ${subject}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Novo contato do portfólio</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;font-weight:bold;color:#555">Nome</td><td style="padding:8px">${escapeHtml(fromName)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#555">E-mail</td><td style="padding:8px">${escapeHtml(fromEmail)}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#555">Assunto</td><td style="padding:8px">${escapeHtml(subject)}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
        <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
        <p style="color:#999;font-size:12px">Enviado via formulário de contato do portfólio</p>
      </div>
    `,
    text: `Novo contato do portfólio\n\nNome: ${fromName}\nE-mail: ${fromEmail}\nAssunto: ${subject}\n\n${message}`,
  });
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
