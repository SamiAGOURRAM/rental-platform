import type { INotificationChannel, EmailMessage } from './notification-channel.interface.js';
import { config } from '../../../config/index.js';

/**
 * Email channel using Resend.
 * Falls back to console logging in development when no API key is configured.
 */
export class EmailChannel implements INotificationChannel {
  private resend: { emails: { send: (data: unknown) => Promise<unknown> } } | null = null;

  private async getResend() {
    if (this.resend) return this.resend;

    if (!config.RESEND_API_KEY) {
      return null; // Dev fallback
    }

    const { Resend } = await import('resend');
    this.resend = new Resend(config.RESEND_API_KEY) as unknown as {
      emails: { send: (data: unknown) => Promise<unknown> };
    };
    return this.resend;
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    const resend = await this.getResend();

    if (!resend) {
      // Development fallback: log to console
      console.log('\n📧 [Email] (dev mode — no Resend key configured)');
      console.log(`  To:      ${message.to}`);
      console.log(`  Subject: ${message.subject}`);
      console.log(`  Body:    ${message.text ?? message.html.replace(/<[^>]+>/g, '')}`);
      console.log();
      return;
    }

    await resend.emails.send({
      from: config.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}

export const emailChannel = new EmailChannel();
