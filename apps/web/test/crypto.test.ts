import { it, expect, beforeAll } from "vitest";
import { encrypt, decrypt } from "@/lib/crypto";

beforeAll(() => { process.env.ERP_ENC_KEY = Buffer.alloc(32, 7).toString("base64"); });

it("round-trips and rejects tampering", () => {
  const c = encrypt("p@ss");
  expect(c.ciphertext).not.toContain("p@ss");
  expect(decrypt(c)).toBe("p@ss");
  const bad = { ...c, tag: Buffer.alloc(16, 1).toString("base64") };
  expect(() => decrypt(bad)).toThrow();
});
