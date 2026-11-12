# ClassPilot assistant: plan for a learned model

Today the assistant is a rule-based engine in `packages/core/src/assistant`. It does keyword-scored intents, subject acronym and fuzzy matching, and date extraction. It runs on the device, never makes up a number, and has no API cost. This is the plan for replacing the intent step with a small learned model when the rules stop scaling. It keeps those three properties.

## What stays the same
- **Numbers always come from code, never from a model.** The model only decides *what* is being asked (the intent) and *about what* (subject, date, time). `answer.ts` keeps computing every percentage and count from the student's own data.
- **It runs on the device.** The web and mobile apps both work offline, so the model has to be small enough to ship inside the app.
- **There's always a fallback.** If the model's confidence is low, we use the rule engine, and if that's unsure too, the assistant asks a clarifying question with chips.

## Step 1: Naive Bayes intent classifier (the next build)
- Write a labelled set of about 300 example questions in the repo (`packages/core/src/assistant/examples.ts`), covering the existing 9 intents plus instructor, room, day schedule, free periods, deadlines and holidays.
- Train a multinomial Naive Bayes model on word unigrams and bigrams at build time, and ship the weights as JSON of about 20 KB. It's pure TypeScript and classifies in under 1 ms.
- The current extractors still pull out the subject, date and time.
- When confidence is below a threshold, show "Did you mean…" chips for the top two intents.
- **Pass mark:** at least 95% on a held-out 20% of the examples, and every existing assistant test still passes.

## Step 2: Collecting real questions
- With the student's consent, store only the questions that were low-confidence or fell back to help: the text, the predicted intent and a timestamp, with **no user ID**, in an `assistant_misses` table only admins can read.
- Label them each week against the same set of intents. Add new intents only when a cluster of real questions needs one.

## Step 3: A small sentence-encoder model
- Fine-tune a small sentence encoder (MiniLM class, about 20M parameters) with two heads: one for the intent and one for subject, date and time tags.
- Export it to ONNX and quantise it to int8 (about 15–25 MB). It runs with `onnxruntime-web` on the web and `onnxruntime-react-native` on mobile, so it stays on the device.
- **Evaluation:** intent accuracy and tag F1 on the held-out real questions, compared with the Naive Bayes model. Ship it only if it beats Naive Bayes by at least 3 points and replies in under 50 ms on a mid-range phone.
- **Rollout:** behind a flag, with Naive Bayes, then the rules, as fallbacks.

## Later
- Kannada and Hindi: add translated and code-mixed examples ("DBMS class bunk maadbahuda?") to the same dataset. A multilingual MiniLM covers all three languages.
- Voice: on-device speech-to-text feeds the same pipeline. The web app already uses the Web Speech API.
