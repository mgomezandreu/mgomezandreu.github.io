// Vanilla siteswap notation: each digit is a throw height in beats. A pattern is
// jugglable when its average is a whole number (the ball count) and no two
// throws land on the same beat.

export type Siteswap = { pattern: number[]; balls: number };

export function parseSiteswap(s: string): Siteswap | { error: string } {
  if (!/^[0-9]{1,8}$/.test(s)) return { error: "digits 0-9 only, up to 8" };
  const pattern = s.split("").map(Number), n = pattern.length;
  const sum = pattern.reduce((a, b) => a + b, 0);
  if (!sum) return { error: "that's zero balls" };
  if (sum % n) return { error: "average must be a whole number" };
  if (new Set(pattern.map((h, i) => (i + h) % n)).size !== n) return { error: "two balls land on the same beat" };
  return { pattern, balls: sum / n };
}
