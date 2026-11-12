const SYNONYMS: Record<string, string> = {
  bunk: "skip", bunking: "skip", skip: "skip", skipping: "skip", miss: "skip", missing: "skip",
  leave: "skip", absent: "skip", cut: "skip",
  att: "attendance", attendance: "attendance", percentage: "attendance", percent: "attendance", pct: "attendance",
};

/** Lowercase, strip punctuation, map synonyms. Returns the token list. */
export const normalize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/%/g, " percent ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => SYNONYMS[t] ?? t);

export const levenshtein = (a: string, b: string): number => {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
};
