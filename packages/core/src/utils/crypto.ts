import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

export function encrypt(text: string, secretKey: string): string {
  const key = crypto.scryptSync(secretKey, "salt", KEY_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from("additional-data"));

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedData: string, secretKey: string): string {
  const [ivHex, tagHex, encrypted] = encryptedData.split(":");

  const key = crypto.scryptSync(secretKey, "salt", KEY_LENGTH);
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAAD(Buffer.from("additional-data"));
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Verify that the signature is valid for the given data and secret using HMAC SHA256
 * @param secret - The secret to use for the HMAC
 * @param data - The data to verify
 * @param signature - The signature to verify
 * @returns True if the signature is valid, false otherwise
 */
export const hmacSha256Verify = async (
  secret: string,
  data: crypto.BinaryLike,
  signature: string,
) => {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(data);
  const digest = hmac.digest("hex");

  const valid =
    digest.length === signature.length &&
    crypto.timingSafeEqual(
      Buffer.from(digest, "hex"),
      Buffer.from(signature, "hex"),
    );
  return valid;
};
