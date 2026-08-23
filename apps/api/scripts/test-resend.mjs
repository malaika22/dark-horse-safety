import { readFileSync } from 'node:fs';
import { Resend } from 'resend';

const env = readFileSync('.env', 'utf8');
const get = (name) => env.match(new RegExp(`^${name}=(.+)$`, 'm'))?.[1]?.trim()?.replace(/^"|"$/g, '');

const key = get('RESEND_API_KEY');
const from = get('MAIL_FROM') || 'Dark Horse Safety <onboarding@resend.dev>';
const testTo = process.argv[2] || 'gulaboo26@gmail.com';

if (!key) {
  console.error('RESEND_API_KEY missing');
  process.exit(1);
}

const resend = new Resend(key);

const domains = await resend.domains.list();
console.log('DOMAINS:', JSON.stringify(domains, null, 2));

const { data, error } = await resend.emails.send({
  from,
  to: [testTo],
  subject: 'Dark Horse test email',
  html: '<p>If you received this, delivery works.</p>',
});

console.log('SEND:', JSON.stringify({ data, error }, null, 2));
