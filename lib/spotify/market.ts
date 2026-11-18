import type { Intent } from "../types";

/** Search markets for the languages the brief can name. */
const LANGUAGE_MARKETS: Record<string, string> = {
  english: "US",
  spanish: "ES",
  korean: "KR",
  japanese: "JP",
  french: "FR",
  german: "DE",
  portuguese: "BR",
  italian: "IT",
  hindi: "IN",
  arabic: "EG",
  turkish: "TR",
  dutch: "NL",
  swedish: "SE",
  polish: "PL",
  russian: "RU",
  hungarian: "HU",
};

/**
 * The market search runs against: the requested language's home market when the
 * brief names one, otherwise SPOTIFY_MARKET (default US) so an English brief is
 * not answered with whatever is popular where the listener happens to live.
 */
export function marketForIntent(intent: Intent): string {
  for (const language of intent.languages) {
    const market = LANGUAGE_MARKETS[language.toLowerCase()];
    if (market) return market;
  }
  return (process.env.SPOTIFY_MARKET ?? "US").toUpperCase();
}
