import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config';
import { logger } from '../infrastructure/logger';

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private readonly transporter: Transporter | null;

  constructor() {
    if (!config.SMTP_HOST || !config.SMTP_PORT || !config.SMTP_USER || !config.SMTP_PASS) {
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    });
  }

  async sendEmail(input: SendEmailInput): Promise<void> {
    if (!this.transporter) {
      logger.info(
        {
          to: input.to,
          subject: input.subject,
          html: input.html,
        },
        'Email delivery not configured. Logging email payload instead.',
      );
      return;
    }

    await this.transporter.sendMail({
      from: config.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  }
}
