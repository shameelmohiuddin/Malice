import { features, maskTokens } from "./featurize";
import type { Course } from "../subjects";

/** What the model can recognise. Order matters: it is the output layer's order. */
export const INTENTS = [
  "attendance", "can_skip", "cost_of_skip", "should_skip_day", "next_class", "day_schedule", "free_time",
  "instructor", "room", "deadlines", "events", "holidays", "exams", "projection",
  "open_section", "open_classroom", "help", "out_of_scope",
] as const;
export type ModelIntent = (typeof INTENTS)[number];

/** A trained model: hashed-feature embeddings (int8), averaged, then one linear layer and a softmax. */
export type ModelWeights = {
  version: number; buckets: number; dim: number; intents: readonly string[];
  emb: string; embScale: number; out: string; outScale: number; bias: number[]; vocab: string[];
};
export type Prediction = { intent: ModelIntent; confidence: number; ranked: { intent: ModelIntent; p: number }[]; known: boolean };

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
/** Base64 → signed bytes, without Buffer/atob so it runs in Node, browsers and React Native alike. */
const int8 = (s: string): Int8Array => {
  const clean = s.replace(/=+$/, "");
  const out = new Int8Array(Math.floor((clean.length * 3) / 4));
  let buf = 0, bits = 0, o = 0;
  for (const ch of clean) {
    buf = (buf << 6) | B64.indexOf(ch); bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (buf >> bits) & 0xff; }
  }
  return out;
};

export type Model = { predict: (text: string, courses: Course[]) => Prediction };

export const loadModel = (w: ModelWeights): Model => {
  const emb = int8(w.emb), out = int8(w.out);
  const vocab = new Set(w.vocab);
  const K = w.intents.length, D = w.dim;
  return {
    predict(text, courses) {
      const tokens = maskTokens(text, courses);
      const ids = features(tokens, w.buckets);
      const h = new Float64Array(D);
      for (const id of ids) for (let j = 0; j < D; j++) h[j] += emb[id * D + j] * w.embScale;
      if (ids.length) for (let j = 0; j < D; j++) h[j] /= ids.length;
      const logits = w.bias.slice();
      for (let k = 0; k < K; k++) for (let j = 0; j < D; j++) logits[k] += h[j] * out[j * K + k] * w.outScale;
      const m = Math.max(...logits);
      const e = logits.map((x) => Math.exp(x - m));
      const sum = e.reduce((a, b) => a + b, 0);
      const ranked = e.map((x, k) => ({ intent: w.intents[k] as ModelIntent, p: x / sum })).sort((a, b) => b.p - a.p);
      // A question with no word the model was trained on (e.g. "asdfgh") is not something it knows.
      const known = tokens.some((t) => vocab.has(t));
      return { intent: ranked[0].intent, confidence: ranked[0].p, ranked, known };
    },
  };
};
