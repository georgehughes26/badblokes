/**
 * Bookmaker "share slip" text usually comes as a label plus a link, e.g.
 * "Add To Your Bet Slip - https://www.bet365.com/s/r/ZdGkF" — pull just the
 * URL out of that so pasting the whole thing still works. Returns null if
 * no http(s) URL is found.
 */
export function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/\S+/i);
  if (!match) return null;
  // Trim trailing punctuation that's almost always prose, not part of the URL.
  return match[0].replace(/[.,;:!?)\]}]+$/, "");
}
