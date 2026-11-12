import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type Sealed = { ciphertext: string; iv: string; tag: string };

const key = () => {
  const k = Buffer.from(process.env.ERP_ENC_KEY ?? "", "base64");
  if (k.length !== 32) throw new Error("ERP_ENC_KEY must be 32 bytes, base64");
  return k;
};

export const encrypt = (plain: string): Sealed => {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return { ciphertext: ct.toString("base64"), iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64") };
};

export const decrypt = (s: Sealed): string => {
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(s.iv, "base64"));
  d.setAuthTag(Buffer.from(s.tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(s.ciphertext, "base64")), d.final()]).toString("utf8");
};
