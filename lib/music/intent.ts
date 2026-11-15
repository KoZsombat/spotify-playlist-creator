import type { Intent } from "../types";
import {
  ARTIST_PATTERNS,
  CLEAN_TRIGGERS,
  ENERGY_WORDS,
  ERA_WORDS,
  INSTRUMENTAL_TRIGGERS,
  LANGUAGE_WORDS,
  LEXICON,
  PHRASE_STOP,
  POPULARITY_WORDS,
  STOPWORDS,
  defaultQueries,
  type LexEntry,
} from "./lexicon";

function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Word-boundary match that tolerates punctuation inside multiword aliases. */
function aliasRegex(alias: string, flags: string): RegExp {
  const body = alias
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\s-]+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, flags);
}

export function containsPhrase(haystack: string, phrase: string): boolean {
  if (!phrase.trim()) return false;
  return aliasRegex(phrase, "iu").test(haystack);
}

type AliasMatch = { entry: LexEntry; start: number; end: number };

function findAliasMatches(text: string): AliasMatch[] {
  const matches: AliasMatch[] = [];
  for (const entry of LEXICON) {
    for (const alias of entry.aliases) {
      const regex = aliasRegex(alias, "giu");
      for (const match of text.matchAll(regex)) {
        if (match.index === undefined) continue;
        matches.push({ entry, start: match.index, end: match.index + match[0].length });
      }
    }
  }

  // Longest alias wins: "pop punk" claims the span before "pop" can.
  const sorted = [...matches].sort(
    (a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start,
  );
  const claimed: AliasMatch[] = [];
  for (const match of sorted) {
    if (claimed.some((c) => match.start < c.end && match.end > c.start)) continue;
    claimed.push(match);
  }
  return claimed.sort((a, b) => a.start - b.start);
}

type Exclusion = {
  entries: LexEntry[];
  keywords: string[];
  spans: [number, number][];
};

const EXCLUSION_RE =
  /\b(?:no|not|nothing|never|without|avoid|avoiding|except|excluding|minus|skip|anything but|none of|nope to)\s+([^,.;!?\n)]+)/gi;

const NON_EXCLUSION_TARGETS =
  /\b(?:explicit|lyrics|vocals|singing|swearing|cursing|cuss|words|lyric|radio edit)\b/i;

function extractExclusions(text: string): Exclusion {
  const exclusions: Exclusion = { entries: [], keywords: [], spans: [] };
  for (const match of text.matchAll(EXCLUSION_RE)) {
    if (match.index === undefined) continue;
    const raw = match[0];
    const segment = (match[1] ?? "")
      .split(/\b(?:but|and then|then|so)\b/i)[0]
      ?.split(/\s+(?:and|or)\s+/i)[0]
      ?.trim();
    if (!segment) continue;
    exclusions.spans.push([match.index, match.index + raw.length]);
    if (NON_EXCLUSION_TARGETS.test(segment)) continue;

    const matched = findAliasMatches(normalize(segment));
    if (matched.length > 0) {
      for (const item of matched) {
        if (!exclusions.entries.some((entry) => entry.id === item.entry.id)) {
          exclusions.entries.push(item.entry);
        }
      }
      continue;
    }
    const words = segment
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word));
    if (words.length > 0 && words.length <= 4) {
      exclusions.keywords.push(words.join(" "));
    }
  }
  return exclusions;
}

function stripSpans(text: string, spans: [number, number][]): string {
  if (spans.length === 0) return text;
  const chars = [...text];
  for (const [start, end] of spans) {
    for (let i = start; i < end && i < chars.length; i++) chars[i] = " ";
  }
  return chars.join("");
}

function energyFrom(text: string): number {
  let weighted = 0;
  let hits = 0;
  for (const group of ENERGY_WORDS) {
    const groupHits = group.words.filter((word) => containsPhrase(text, word)).length;
    weighted += group.value * groupHits;
    hits += groupHits;
  }
  if (hits === 0) return 0.5;
  return Math.min(1, Math.max(0, weighted / hits));
}

function popularityFrom(text: string): number {
  for (const group of POPULARITY_WORDS) {
    if (group.words.some((word) => containsPhrase(text, word))) return group.value;
  }
  return 55;
}

function yearRangeFrom(text: string): [number, number] | null {
  const ranges: [number, number][] = [];

  for (const era of ERA_WORDS) {
    if (era.words.some((word) => containsPhrase(text, word))) ranges.push(era.range);
  }

  const before = /\b(?:before|pre|pre-|prior to|until)\s+((?:19|20)\d{2})\b/.exec(text);
  const after = /\b(?:after|since|post|post-|from)\s+((?:19|20)\d{2})\b/.exec(text);
  const single = /\b(?:in|from|of|released in)?\s*((?:19|20)\d{2})\b/.exec(text);

  if (before?.[1]) ranges.push([1950, Number(before[1]) - 1]);
  else if (after?.[1]) ranges.push([Number(after[1]), 2026]);
  else if (single?.[1]) {
    const year = Number(single[1]);
    ranges.push([year - 1, year + 1]);
  }

  if (ranges.length === 0) return null;
  return [
    Math.min(...ranges.map((range) => range[0])),
    Math.max(...ranges.map((range) => range[1])),
  ];
}

function extractArtists(text: string): string[] {
  const found: string[] = [];
  for (const pattern of ARTIST_PATTERNS) {
    const regex = new RegExp(pattern.source, "gi");
    for (const match of text.matchAll(regex)) {
      const captured = match[1] ?? "";
      const cut = captured.split(PHRASE_STOP)[0] ?? "";
      for (const part of cut.split(/\s*(?:,|&|\band\b|\bor\b)\s*/i)) {
        const name = part
          .replace(/[^\p{L}\p{N}'&.\- ]/gu, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (name.length < 2 || name.split(" ").length > 5) continue;
        if (name.split(" ").every((word) => STOPWORDS.has(word))) continue;
        if (!found.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
          found.push(name);
        }
      }
    }
  }
  return found.slice(0, 6);
}

function extractKeywords(text: string, claimed: AliasMatch[]): string[] {
  const keywords: string[] = [];

  // Quoted phrases are strong, explicit user intent.
  for (const match of text.matchAll(/"([^"]{2,40})"/g)) {
    const value = (match[1] ?? "").trim();
    if (value) keywords.push(value);
  }

  const claimedSpans: [number, number][] = claimed.map((c) => [c.start, c.end]);
  const leftovers = stripSpans(text, claimedSpans);
  for (const word of leftovers.split(/[^\p{L}\p{N}'-]+/u)) {
    if (word.length < 4 || STOPWORDS.has(word)) continue;
    if (keywords.some((key) => key.toLowerCase() === word)) continue;
    keywords.push(word);
    if (keywords.length >= 6) break;
  }
  return keywords;
}

const ENERGY_LABEL = (energy: number) =>
  energy <= 0.3 ? "low energy" : energy <= 0.55 ? "mid energy" : "high energy";

export function interpretHeuristic(description: string): Intent {
  const raw = description.replace(/\s+/g, " ").trim();
  const text = normalize(raw);

  const exclusions = extractExclusions(text);
  const positive = stripSpans(text, exclusions.spans);
  const claimed = findAliasMatches(positive);
  const artists = extractArtists(positive);

  const excludedIds = new Set(exclusions.entries.map((entry) => entry.id));
  const excludedLabels = new Set(
    exclusions.entries.map((entry) => entry.label.toLowerCase()),
  );
  const excludeTags = exclusions.entries.map((entry) => entry.label);

  const pick = (group: LexEntry["group"]) =>
    claimed
      .filter((match) => match.entry.group === group && !excludedIds.has(match.entry.id))
      .map((match) => match.entry.label);

  const dedupe = (values: string[]) => [...new Set(values)];

  const genres = dedupe(pick("genre"));
  const moods = dedupe(pick("mood"));
  const occasions = dedupe(pick("occasion"));

  const languages = LANGUAGE_WORDS.filter((entry) =>
    entry.words.some((word) => containsPhrase(positive, word)),
  ).map((entry) => entry.label);

  const keywords = extractKeywords(positive, claimed).filter(
    (keyword) => !excludedLabels.has(keyword.toLowerCase()),
  );

  const evidence: Intent["evidence"] = [
    ...claimed
      .filter((match) => !excludedIds.has(match.entry.id))
      .map((match) => ({ label: match.entry.label, kind: match.entry.group })),
    ...languages.map((label) => ({ label, kind: "language" })),
    ...artists.map((artist) => ({ label: artist, kind: "artist" })),
  ];

  const yearRange = yearRangeFrom(positive);
  if (yearRange) {
    evidence.push({ label: `${yearRange[0]}–${yearRange[1]}`, kind: "era" });
  }

  const instrumental = INSTRUMENTAL_TRIGGERS.some((trigger) =>
    containsPhrase(positive, trigger),
  );
  if (instrumental) evidence.push({ label: "instrumental", kind: "filter" });

  const explicitAllowed = !CLEAN_TRIGGERS.some((trigger) =>
    containsPhrase(positive, trigger),
  );
  if (!explicitAllowed) evidence.push({ label: "clean", kind: "filter" });

  const energy = energyFrom(positive);
  const popularityTarget = popularityFrom(positive);
  evidence.push({ label: ENERGY_LABEL(energy), kind: "energy" });

  return {
    genres,
    moods,
    occasions,
    languages,
    keywords,
    excludeKeywords: exclusions.keywords,
    excludeTags,
    includeArtists: artists,
    excludeArtists: [],
    energy,
    popularityTarget,
    yearRange,
    instrumental,
    explicitAllowed,
    maxPerArtist: 2,
    evidence,
    summary: "",
  };
}

export function summarizeIntent(intent: Intent): string {
  const parts = [
    intent.genres.slice(0, 3).join(", "),
    intent.moods.slice(0, 2).join(", "),
    intent.occasions.slice(0, 2).join(", "),
    intent.languages.length > 0 ? `in ${intent.languages.join(", ")}` : "",
    intent.yearRange ? `${intent.yearRange[0]}–${intent.yearRange[1]}` : "",
    intent.instrumental ? "instrumental" : "",
    ENERGY_LABEL(intent.energy),
  ].filter(Boolean);
  return parts.length > 0
    ? parts.join(" · ")
    : "Broad mix · nothing narrowed down yet";
}

/** Spotify search phrases for a label, falling back to the label itself. */
export function queriesForLabel(label: string): string[] {
  const target = normalize(label);
  const entry = LEXICON.find(
    (candidate) =>
      normalize(candidate.label) === target ||
      candidate.aliases.some((alias) => normalize(alias) === target),
  );
  return entry ? defaultQueries(entry) : [label];
}
