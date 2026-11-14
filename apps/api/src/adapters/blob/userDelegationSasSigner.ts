import type { TokenCredential } from "@azure/identity";
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  SASProtocol,
  type UserDelegationKey,
} from "@azure/storage-blob";
import type { BlobUploadUrlSigner, Clock, UploadUrlGrant } from "../../ports";

const KEY_LIFETIME_MS = 6 * 60 * 60 * 1000;
const KEY_REFRESH_MARGIN_MS = 30 * 60 * 1000;

/**
 * Issues write-only user-delegation SAS URLs (no account keys involved). The delegation key
 * is cached per process and refreshed well before expiry.
 */
export class UserDelegationSasSigner implements BlobUploadUrlSigner {
  readonly containerUrl: string;
  private readonly service: BlobServiceClient;
  private cached: { key: UserDelegationKey; expiresAt: number } | null = null;

  constructor(
    accountUrl: string,
    private readonly container: string,
    credential: TokenCredential,
    private readonly clock: Clock,
  ) {
    const base = accountUrl.replace(/\/+$/, "");
    this.service = new BlobServiceClient(base, credential);
    this.containerUrl = `${base}/${container}`;
  }

  async createUploadUrl(blobName: string, expiresOn: Date): Promise<UploadUrlGrant> {
    const now = this.clock.now();
    const key = await this.delegationKey(now);
    const sas = generateBlobSASQueryParameters(
      {
        containerName: this.container,
        blobName,
        permissions: BlobSASPermissions.parse("cw"),
        startsOn: new Date(now.getTime() - 5 * 60 * 1000),
        expiresOn,
        protocol: SASProtocol.Https,
      },
      key,
      this.service.accountName,
    ).toString();
    const blobUrl = `${this.containerUrl}/${blobName}`;
    return { blobUrl, uploadUrl: `${blobUrl}?${sas}` };
  }

  private async delegationKey(now: Date): Promise<UserDelegationKey> {
    if (this.cached && this.cached.expiresAt - KEY_REFRESH_MARGIN_MS > now.getTime()) return this.cached.key;
    const startsOn = new Date(now.getTime() - 5 * 60 * 1000);
    const expiresOn = new Date(now.getTime() + KEY_LIFETIME_MS);
    const key = await this.service.getUserDelegationKey(startsOn, expiresOn);
    this.cached = { key, expiresAt: expiresOn.getTime() };
    return key;
  }
}
