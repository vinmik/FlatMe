const MAX_EDGE = 1600;

/** Shrinks and re-encodes a picked photo as JPEG: phone photos are 4–12 MB, this lands near 300 KB. */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("This file isn't an image the browser can read. Try a JPEG or PNG.");
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
  if (!blob) throw new Error("Couldn't prepare this photo. Try a different one.");
  return blob;
}
