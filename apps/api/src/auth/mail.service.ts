import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { Resend } from 'resend';

type EmailPayload = {
  to: string;
  subject: string;
  title: string;
  body: string;
  kind: string;
  /** When Resend test mode blocks delivery, relay goes to admin with this label */
  intendedRecipient?: string;
};

type SendResult = {
  ok: boolean;
  provider?: 'resend' | 'smtp';
  error?: string;
};

/**
 * Auth emails: SMTP first (when configured), then Resend.
 * - Password reset / invite → user's email
 * - Invite request → ADMIN_EMAIL
 *
 * Dev tip: set SMTP_* (Gmail app password) so any recipient works.
 * Production: verify darkhorseops.com on Resend and set MAIL_FROM to that domain.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly smtp: Transporter | null;
  private readonly from: string;
  private readonly smtpFrom: string | null;
  private readonly adminEmail: string;
  private readonly usingResendSandbox: boolean;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from =
      this.config.get<string>('MAIL_FROM')?.trim() ||
      'Dark Horse Safety <onboarding@resend.dev>';
    this.adminEmail =
      this.config.get<string>('ADMIN_EMAIL')?.trim() || 'laiba2618@gmail.com';
    this.usingResendSandbox = /@resend\.dev>/i.test(this.from);

    const smtpHost = this.config.get<string>('SMTP_HOST')?.trim();
    const smtpUser = this.config.get<string>('SMTP_USER')?.trim();
    const smtpPass = this.config.get<string>('SMTP_PASS')?.trim();
    this.smtpFrom =
      this.config.get<string>('SMTP_FROM')?.trim() ||
      (smtpUser ? `Dark Horse Safety <${smtpUser}>` : null);

    if (smtpHost && smtpUser && smtpPass) {
      this.smtp = nodemailer.createTransport({
        host: smtpHost,
        port: Number(this.config.get('SMTP_PORT', 587)),
        secure: this.config.get<string>('SMTP_SECURE') === 'true',
        auth: { user: smtpUser, pass: smtpPass.replace(/\s+/g, '') },
      });
    } else {
      this.smtp = null;
    }
  }

  onModuleInit() {
    if (!this.resend && !this.smtp) {
      this.logger.warn(
        'No mail provider configured — set SMTP_HOST+SMTP_USER+SMTP_PASS and/or RESEND_API_KEY in apps/api/.env',
      );
      return;
    }

    if (this.smtp) {
      this.logger.log(
        `Mail primary=SMTP from=${this.smtpFrom ?? this.from}`,
      );
      return;
    }

    if (this.usingResendSandbox) {
      this.logger.warn(
        'SMTP_PASS missing — Resend sandbox only delivers to your signup email. Set SMTP_PASS (Gmail app password) in apps/api/.env to email any user.',
      );
    }
  }

  async sendPasswordReset(email: string, resetUrl: string, isResend = false) {
    const subject = isResend
      ? 'Reminder: reset your Dark Horse password'
      : 'Reset your Dark Horse password';

    this.logger.log(`[password-reset] recipient=${email} url=${resetUrl}`);

    await this.deliver({
      to: email,
      subject,
      title: isResend ? 'Password reset reminder' : 'Password reset',
      body: `<p style="margin:0 0 16px;color:#d1d5db">We received a request to reset the password for <strong style="color:#fff">${email}</strong>. This link expires soon.</p>
       <p style="margin:0 0 24px">${this.cta(resetUrl, 'Reset password')}</p>
       <p style="margin:0;color:#9ca3af;font-size:13px;word-break:break-all">Or copy: ${resetUrl}</p>`,
      kind: 'password-reset',
      intendedRecipient: email,
    });
  }

  async sendInvite(
    email: string,
    inviteUrl: string,
    inviterName?: string,
    isResend = false,
  ) {
    const who = inviterName?.trim() || 'your admin';
    const subject = isResend
      ? 'Reminder: your Dark Horse Force invite'
      : 'You are invited to Dark Horse Force';

    this.logger.log(`[invite] recipient=${email} url=${inviteUrl}`);

    await this.deliver({
      to: email,
      subject,
      title: isResend ? 'Invite reminder' : 'Team invite',
      body: `<p style="margin:0 0 16px;color:#d1d5db">${who} invited <strong style="color:#fff">${email}</strong> to Dark Horse Force. Accept to set a password and activate the account.</p>
       <p style="margin:0 0 24px">${this.cta(inviteUrl, 'Accept invite')}</p>
       <p style="margin:0;color:#9ca3af;font-size:13px;word-break:break-all">Or copy: ${inviteUrl}</p>`,
      kind: 'invite',
      intendedRecipient: email,
    });
  }

  async notifyInviteRequest(requesterEmail: string) {
    const subject = `Invite request from ${requesterEmail}`;

    this.logger.log(
      `[invite-request] requester=${requesterEmail} admin=${this.adminEmail}`,
    );

    await this.deliver({
      to: this.adminEmail,
      subject,
      title: 'Invite request',
      body: `<p style="margin:0 0 16px;color:#d1d5db"><strong style="color:#fff">${requesterEmail}</strong> asked for an invite to Dark Horse Force.</p>
       <p style="margin:0;color:#9ca3af;font-size:13px">Resend an invite from the admin panel or call <code style="color:#fff">POST /auth/invite/resend</code> with this email.</p>`,
      kind: 'invite-request',
    });
  }

  private async deliver(payload: EmailPayload) {
    const html = this.layout(payload.title, payload.body);

    if (!this.resend && !this.smtp) {
      this.logger.warn(
        `[${payload.kind}] no mail provider — logged only. to=${payload.to}`,
      );
      this.logger.log(
        `[${payload.kind}] to=${payload.to} subject=${payload.subject}`,
      );
      return;
    }

    const recipient = payload.intendedRecipient ?? payload.to;
    const primary = await this.tryDeliver({
      to: payload.to,
      subject: payload.subject,
      html,
      replyTo: this.adminEmail,
    });

    if (primary.ok) {
      this.logger.log(
        `[${payload.kind}] delivered via ${primary.provider} to=${payload.to}`,
      );
      return;
    }

    if (recipient.toLowerCase() === this.adminEmail.toLowerCase()) {
      this.logger.error(
        `[${payload.kind}] failed to deliver to admin ${this.adminEmail}: ${primary.error ?? 'unknown'}`,
      );
      return;
    }

    // Last resort: only when Resend sandbox blocks and SMTP is not available
    const sandboxBlocked =
      primary.error && this.isResendSandboxError(primary.error);

    if (sandboxBlocked || (!this.smtp && primary.error)) {
      this.logger.warn(
        `[${payload.kind}] relaying to admin=${this.adminEmail} (intended recipient=${recipient})`,
      );

      const relayHtml = this.layout(
        `Forward to ${recipient}`,
        `<p style="margin:0 0 16px;color:#fca5a5;font-size:13px">Could not deliver to <strong style="color:#fff">${recipient}</strong>. Set SMTP_PASS in apps/api/.env (Gmail app password), then retry.</p>
         ${payload.body}`,
      );

      await this.tryDeliver({
        to: this.adminEmail,
        subject: `[Forward to ${recipient}] ${payload.subject}`,
        html: relayHtml,
        replyTo: recipient,
      });
    }
  }

  private async tryDeliver(options: {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
  }): Promise<SendResult> {
    // Prefer SMTP so any recipient works in local/dev
    if (this.smtp) {
      const smtpResult = await this.trySmtp(options);
      if (smtpResult.ok) {
        return smtpResult;
      }
      if (this.resend) {
        this.logger.warn(
          `SMTP failed (${smtpResult.error}) — trying Resend`,
        );
        return this.tryResend(options);
      }
      return smtpResult;
    }

    if (this.resend) {
      return this.tryResend(options);
    }

    return { ok: false, error: 'No mail provider' };
  }

  private async tryResend(options: {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
  }): Promise<SendResult> {
    try {
      const { data, error } = await this.resend!.emails.send({
        from: this.from,
        to: [options.to],
        replyTo: options.replyTo,
        subject: options.subject,
        html: options.html,
      });

      if (error) {
        this.logger.error(`Resend error to=${options.to}: ${error.message}`);
        return { ok: false, error: error.message };
      }

      this.logger.log(
        `Resend sent id=${data?.id ?? 'unknown'} to=${options.to}`,
      );
      return { ok: true, provider: 'resend' };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Resend threw to=${options.to}: ${message}`);
      return { ok: false, error: message };
    }
  }

  private async trySmtp(options: {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
  }): Promise<SendResult> {
    if (!this.smtp) {
      return { ok: false, error: 'SMTP not configured' };
    }

    try {
      await this.smtp.sendMail({
        from: this.smtpFrom ?? this.from,
        to: options.to,
        replyTo: options.replyTo,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`SMTP sent to=${options.to}`);
      return { ok: true, provider: 'smtp' };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`SMTP error to=${options.to}: ${message}`);
      return { ok: false, error: message };
    }
  }

  private isResendSandboxError(message: string): boolean {
    return (
      message.includes('only send testing emails') ||
      message.includes('domain is not verified')
    );
  }

  private cta(href: string, label: string) {
    return `<a href="${href}" style="display:inline-block;background:#fff;color:#000;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:6px">${label}</a>`;
  }

  private layout(title: string, body: string) {
    return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#161618;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <div style="max-width:480px;margin:0 auto;background:#1C1C1E;border:1px solid #222;border-radius:12px;padding:28px">
      <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;letter-spacing:0.08em;text-transform:uppercase">Dark Horse Safety</p>
      <h1 style="margin:0 0 20px;color:#fff;font-size:22px;font-weight:600">${title}</h1>
      ${body}
    </div>
  </body>
</html>`;
  }
}
