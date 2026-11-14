import type { BlobUploadUrlSigner, UploadUrlGrant } from "../../ports";

/** Default Azurite-style base used when no storage account is configured (local dev / tests). */
export const LOCAL_STORAGE_URL = "http://127.0.0.1:10000/devstoreaccount1";

/**
 * Local fallback: returns syntactically valid but fake URLs so the upload flow can be
 * exercised end-to-end without Azure. Uploads to it will fail unless Azurite is running.
 */
export class LocalUploadUrlSigner implements BlobUploadUrlSigner {
  readonly containerUrl: string;

  constructor(accountUrl: string, container: string) {
    this.containerUrl = `${accountUrl.replace(/\/+$/, "")}/${container}`;
  }

  async createUploadUrl(blobName: string, expiresOn: Date): Promise<UploadUrlGrant> {
    const blobUrl = `${this.containerUrl}/${blobName}`;
    return { blobUrl, uploadUrl: `${blobUrl}?sv=dev&se=${encodeURIComponent(expiresOn.toISOString())}&sig=dev` };
  }
}
