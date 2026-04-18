import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config';
import { ServiceUnavailableError } from '../domain/errors';
import { logger } from '../infrastructure/logger';

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const EMAIL_DELIVERY_UNAVAILABLE_MESSAGE =
  'Email delivery is temporarily unavailable. Please try again shortly.';

export class EmailService {
  private readonly transporter: Transporter | null;
  private readonly isConfigured: boolean;

  constructor() {
    this.isConfigured = Boolean(
      config.SMTP_HOST && config.SMTP_PORT && config.SMTP_USER && config.SMTP_PASS,
    );

    this.transporter = this.isConfigured
      ? nodemailer.createTransport({
          host: config.SMTP_HOST,
          port: config.SMTP_PORT,
          secure: config.SMTP_SECURE,
          auth: {
            user: config.SMTP_USER,
            pass: config.SMTP_PASS,
          },
        })
      : null;
  }

  async sendEmail(input: SendEmailInput): Promise<void> {
    if (!this.transporter || !this.isConfigured) {
      if (config.NODE_ENV === 'production') {
        logger.error(
          {
            to: input.to,
            subject: input.subject,
            hasSmtpHost: Boolean(config.SMTP_HOST),
            hasSmtpPort: Boolean(config.SMTP_PORT),
            hasSmtpUser: Boolean(config.SMTP_USER),
            hasSmtpPass: Boolean(config.SMTP_PASS),
          },
          'Email delivery is unavailable because SMTP is not fully configured.',
        );
        throw new ServiceUnavailableError(EMAIL_DELIVERY_UNAVAILABLE_MESSAGE, {
          code: 'EMAIL_DELIVERY_UNAVAILABLE',
        });
      }

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

    try {
      await this.transporter.sendMail({
        from: config.EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
    } catch (error) {
      logger.error(
        {
          err: error,
          to: input.to,
          subject: input.subject,
        },
        'Email delivery failed.',
      );
      throw new ServiceUnavailableError(EMAIL_DELIVERY_UNAVAILABLE_MESSAGE, {
        code: 'EMAIL_DELIVERY_UNAVAILABLE',
      });
    }
  }
}
