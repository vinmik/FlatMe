import { EmailClient } from "@azure/communication-email";
import type { TokenCredential } from "@azure/identity";
import type { EmailMessage, EmailSender, Logger } from "../../ports";

/**
 * Azure Communication Services email. Prefers endpoint + managed identity (Entra ID);
 * a connection string is accepted as a fallback for environments without RBAC.
 */
export class AcsEmailSender implements EmailSender {
  private readonly client: EmailClient;

  constructor(
    target: { endpoint: string; credential: TokenCredential } | { connectionString: string },
    private readonly senderAddress: string,
    private readonly logger: Logger,
  ) {
    this.client =
      "connectionString" in target
        ? new EmailClient(target.connectionString)
        : new EmailClient(target.endpoint, target.credential);
  }

  async send(message: EmailMessage): Promise<void> {
    // beginSend resolves once ACS has accepted the message (202); we don't block on final delivery.
    const poller = await this.client.beginSend({
      senderAddress: this.senderAddress,
      recipients: { to: [{ address: message.to }] },
      content: { subject: message.subject, html: message.html, plainText: message.text },
    });
    this.logger.info(`Email accepted by ACS (operation ${poller.getOperationState().result?.id ?? "pending"})`);
  }
}
