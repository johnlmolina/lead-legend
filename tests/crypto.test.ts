import { describe, expect, it, beforeAll } from "vitest";
import { encrypt, decrypt } from "@/lib/crypto";

beforeAll(() => {
  // A fixed, valid 32-byte key for this test — independent of whatever the
  // real .env.local key is, so this test doesn't depend on that being set.
  process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("encrypt/decrypt", () => {
  it("round-trips a plaintext value", () => {
    const plaintext = "1//0gA_a_real_looking_refresh_token";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext each time", () => {
    const plaintext = "same input";
    expect(encrypt(plaintext)).not.toBe(encrypt(plaintext));
  });

  it("throws on tampered ciphertext instead of silently returning garbage", () => {
    const encoded = encrypt("sensitive-token-value");
    const tampered = Buffer.from(encoded, "base64");
    tampered[tampered.length - 1] ^= 0xff; // flip a byte in the ciphertext
    expect(() => decrypt(tampered.toString("base64"))).toThrow();
  });

  it("handles empty strings", () => {
    expect(decrypt(encrypt(""))).toBe("");
  });

  it("handles long values", () => {
    const long = "x".repeat(5000);
    expect(decrypt(encrypt(long))).toBe(long);
  });
});
