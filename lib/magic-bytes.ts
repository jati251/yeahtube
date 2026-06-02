import "server-only";

// ── Magic Byte Signatures ───────────────────────────────
// Maps MIME types to their expected file header hex prefixes.
// The first 12 bytes (24 hex chars) are usually sufficient.

const MAGIC_BYTES: Record<string, string[]> = {
  "image/jpeg": ["ffd8ff"],
  "image/png": ["89504e47"],
  "image/gif": ["47494638"], // GIF87a or GIF89a
  "image/webp": ["52494646"], // RIFF....WEBP
  "image/avif": ["0000001c66747970", "0000002066747970"], // ftyp with avif/avis
  "video/mp4": ["0000001c66747970", "0000002066747970", "0000001866747970"], // ftyp
  "video/quicktime": ["0000001c66747970", "0000002066747970"], // ftyp (similar to mp4)
  "video/x-msvideo": ["52494646"], // RIFF....AVI
  "video/webm": ["1a45dfa3"],
};

// Map of extensions to MIME types for extension-to-content validation
const EXTENSION_MIME_MAP: Record<string, string[]> = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".gif": ["image/gif"],
  ".webp": ["image/webp"],
  ".avif": ["image/avif"],
  ".mp4": ["video/mp4"],
  ".mov": ["video/quicktime"],
  ".avi": ["video/x-msvideo"],
  ".webm": ["video/webm"],
};

/**
 * Validate that the file's magic bytes match the claimed MIME type.
 *
 * Reads the first 12 bytes of the buffer and checks them against
 * known signatures for the claimed type.
 *
 * @param buffer      - Raw file buffer (at least 12 bytes recommended).
 * @param claimedMime - The MIME type claimed by the client (e.g. "image/jpeg").
 * @returns `true` if the magic bytes match the claimed type.
 */
export function validateMagicBytes(buffer: Buffer, claimedMime: string): boolean {
  if (buffer.length < 4) return false;

  const hex = buffer.subarray(0, 12).toString("hex").toLowerCase();
  const signatures = MAGIC_BYTES[claimedMime];

  if (!signatures) {
    // Unknown MIME type — we don't have magic bytes for it
    return false;
  }

  return signatures.some((magic) => hex.startsWith(magic.toLowerCase()));
}

/**
 * Validate that the file extension matches the expected MIME type.
 * Prevents attacks like `shell.php.jpg` being treated as a JPEG.
 *
 * @param filename  - Original filename from the upload.
 * @param mimeType  - MIME type claimed by the client.
 * @returns `true` if the extension is valid for the given MIME type.
 */
export function validateExtension(filename: string, mimeType: string): boolean {
  const ext = filename.toLowerCase().split(".").pop();
  if (!ext) return false;

  const allowedMimes = EXTENSION_MIME_MAP[`.${ext}`];
  if (!allowedMimes) return false;

  return allowedMimes.includes(mimeType);
}
