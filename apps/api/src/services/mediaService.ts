import { randomUUID } from "node:crypto";
import type { UploadUrlRequestSchema, UploadUrlResponse } from "@flatme/shared";
import type { z } from "zod";
import type { BlobUploadUrlSigner, Clock } from "../ports";

export const UPLOAD_URL_TTL_MS = 10 * 60 * 1000;

const EXTENSIONS: Record<z.output<typeof UploadUrlRequestSchema>["contentType"], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

export class MediaService {
  constructor(
    private readonly signer: BlobUploadUrlSigner,
    private readonly clock: Clock,
  ) {}

  async createUploadUrl(userId: string, req: z.output<typeof UploadUrlRequestSchema>): Promise<UploadUrlResponse> {
    const expiresOn = new Date(this.clock.now().getTime() + UPLOAD_URL_TTL_MS);
    const blobName = `${req.purpose}/${userId}/${randomUUID()}.${EXTENSIONS[req.contentType]}`;
    const { uploadUrl, blobUrl } = await this.signer.createUploadUrl(blobName, expiresOn);
    return {
      uploadUrl,
      blobUrl,
      expiresAt: expiresOn.toISOString(),
      requiredHeaders: { "x-ms-blob-type": "BlockBlob", "Content-Type": req.contentType },
    };
  }
}
