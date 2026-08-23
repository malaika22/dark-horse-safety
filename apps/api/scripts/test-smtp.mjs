import { readFileSync } from 'node:fs';
import nodemailer from 'nodemailer';

const env = readFileSync('.env', 'utf8');
const get = (name) =>
  env.match(new RegExp(`^${name}=(.+)$`, 'm'))?.[1]?.trim()?.replace(/^"|"$/g, '');

const host = get('SMTP_HOST');
const port = Number(get('SMTP_PORT') || 587);
const user = get('SMTP_USER');
const pass = (get('SMTP_PASS') || '').replace(/\s+/g, '');
const from = get('SMTP_FROM') || `Dark Horse Safety <${user}>`;
const to = process.argv[2] || 'gulaboo26@gmail.com';

if (!host || !user || !pass) {
  console.error('SMTP_HOST / SMTP_USER / SMTP_PASS missing');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: false,
  auth: { user, pass },
});

const info = await transporter.sendMail({
  from,
  to,
  subject: 'Dark Horse SMTP test',
  html: '<p>If you got this, SMTP delivery works.</p>',
});

console.log('OK', { messageId: info.messageId, to, from });
