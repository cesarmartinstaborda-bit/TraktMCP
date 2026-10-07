import { createHash, createHmac, randomBytes } from "node:crypto";

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function hmacKey(): string {
  const secret = process.env["TRAKT_CLIENT_SECRET"];
  if (!secret) {
    throw new Error("TRAKT_CLIENT_SECRET not configured");
  }
  return secret;
}

export function createNonce(): string {
  return base64url(randomBytes(16));
}

export function verifierFromNonce(nonce: string): string {
  return base64url(createHmac("sha256", hmacKey()).update(nonce).digest());
}

export function challengeFromVerifier(verifier: string): string {
  return base64url(createHash("sha256").update(verifier).digest());
}

const SEPARATOR = ".";

export function packCode(traktCode: string, nonce: string): string {
  return `${traktCode}${SEPARATOR}${nonce}`;
}

export function unpackCode(packed: string): {
  code: string;
  nonce: string | null;
} {
  const index = packed.lastIndexOf(SEPARATOR);
  if (index === -1) {
    return { code: packed, nonce: null };
  }
  return { code: packed.slice(0, index), nonce: packed.slice(index + 1) };
}
