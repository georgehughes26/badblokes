/**
 * Pure odds parsing/normalisation. Accepts whatever format a player is
 * likely to type off their betting slip and turns it into decimal odds for
 * the rules engine to compare against `oddsMinDecimal`.
 */

const EVENS_ALIASES = new Set(["evens", "evs", "even", "evens odds"]);

/**
 * Parse odds entered as fractional ("2/1", "11/10"), the word "evens", or
 * decimal ("3", "3.00"). Returns normalised decimal odds, or null if the
 * input can't be parsed.
 */
export function parseOdds(raw: string): number | null {
  const input = raw.trim().toLowerCase();
  if (input.length === 0) return null;

  if (EVENS_ALIASES.has(input)) return 2.0;

  if (input.includes("/")) {
    const parts = input.split("/");
    if (parts.length !== 2) return null;
    const numerator = Number(parts[0]);
    const denominator = Number(parts[1]);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
    if (denominator <= 0 || numerator < 0) return null;
    return numerator / denominator + 1;
  }

  const decimal = Number(input);
  if (!Number.isFinite(decimal)) return null;
  // Decimal odds below 1.0 are meaningless (1.0 = a guaranteed no-return bet).
  if (decimal < 1.0) return null;
  return decimal;
}

/** Is this decimal odds value legal under the "no shorter than 1/2" rule? */
export function isOddsLegal(decimalOdds: number, oddsMinDecimal: number): boolean {
  return decimalOdds >= oddsMinDecimal;
}
