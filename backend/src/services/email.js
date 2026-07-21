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

export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const transport = getTransporter();
  if (!transport) throw new Error('Email service not configured');

  await transport.sendMail({
    from: `"MyPhotoLife" <${env.mail.from}>`,
    to,
    subject: 'Recuperação de senha - MyPhotoLife',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fafaf9;padding:40px 24px">
        <div style="background:#fff;border-radius:16px;padding:40px 32px;border:1px solid #e4e4e7">
          <h1 style="font-size:24px;font-weight:700;color:#1c1917;margin:0 0 8px">MyPhotoLife</h1>
          <p style="color:#444;margin:0 0 24px;font-size:15px;line-height:1.6">Olá, <strong>${escapeHtml(name)}</strong>!</p>
          <p style="color:#444;margin:0 0 24px;font-size:15px;line-height:1.6">Recebemos uma solicitação de redefinição de senha para sua conta. Clique no botão abaixo para criar uma nova senha:</p>
          <div style="text-align:center;margin:32px 0">
            <a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#1c1917;color:#fff;padding:14px 32px;border-radius:999px;font-size:15px;font-weight:600;text-decoration:none">Redefinir Senha</a>
          </div>
          <p style="color:#888;font-size:13px;margin:0 0 8px">Este link expira em 1 hora.</p>
          <p style="color:#888;font-size:13px;margin:0">Se não foi você quem solicitou, ignore este email.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
          <p style="color:#aaa;font-size:12px;margin:0">MyPhotoLife - Portfólio Profissional para Fotógrafos</p>
        </div>
      </div>
    `,
    text: `Recuperação de senha - MyPhotoLife\n\nOlá, ${name}!\n\nRecebemos uma solicitação de redefinição de senha para sua conta. Acesse o link abaixo para criar uma nova senha:\n\n${resetUrl}\n\nEste link expira em 1 hora.\nSe não foi você quem solicitou, ignore este email.`,
  });
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
