import type { EmailMessage, EmailSender, Logger } from "../../ports";

/** Local-dev fallback: logs recipient + subject only (never the body, which may contain an OTP). */
export class ConsoleEmailSender implements EmailSender {
  constructor(private readonly logger: Logger) {}

  async send(message: EmailMessage): Promise<void> {
    this.logger.info(`[email:console] to=${message.to} subject="${message.subject}"`);
  }
}

/** Test double that records sent messages. */
export class RecordingEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}
