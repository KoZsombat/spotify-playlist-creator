import { z } from "zod";
import type { Intent } from "../types";
import { summarizeIntent } from "./intent";

const llmIntentSchema = z.object({
  genres: z.array(z.string().min(1).max(40)).max(12).default([]),
  moods: z.array(z.string().min(1).max(40)).max(12).default([]),
  occasions: z.array(z.string().min(1).max(40)).max(8).default([]),
  languages: z.array(z.string().min(1).max(20)).max(4).default([]),
  keywords: z.array(z.string().min(1).max(40)).max(10).default([]),
  excludeKeywords: z.array(z.string().min(1).max(40)).max(10).default([]),
  excludeGenres: z.array(z.string().min(1).max(40)).max(10).default([]),
  includeArtists: z.array(z.string().min(1).max(60)).max(8).default([]),
  excludeArtists: z.array(z.string().min(1).max(60)).max(8).default([]),
  energy: z.number().min(0).max(1).optional(),
  popularityTarget: z.number().min(0).max(100).optional(),
  yearRange: z
    .tuple([z.number().int().min(1900).max(2030), z.number().int().min(1900).max(2030)])
    .nullable()
    .optional(),
  instrumental: z.boolean().optional(),
  explicitAllowed: z.boolean().optional(),
});

export type LlmIntent = z.infer<typeof llmIntentSchema>;

export const llmEnabled = Boolean(process.env.LLM_API_KEY);

const SYSTEM_PROMPT = `You turn a listener's free-form description into structured search intent for the Spotify catalog.
Reply with a single JSON object, no markdown, no commentary. Shape:
{
  "genres": string[],       // broad + specific genre tags, e.g. "synthwave", "boom bap", "city pop"
  "moods": string[],        // emotions/atmospheres, e.g. "melancholic", "euphoric", "rainy"
  "occasions": string[],    // activities, e.g. "night drive", "gym", "study"
  "languages": string[],    // languages of the lyrics, lowercase
  "keywords": string[],     // concrete descriptive terms worth searching ("space", "saxophone")
  "excludeKeywords": string[],
  "excludeGenres": string[],  // genres/moods the user vetoed
  "includeArtists": string[], // ONLY artists the user actually named
  "excludeArtists": string[], // ONLY artists the user asked to avoid
  "energy": number,         // 0 = ambient, 1 = festival peak time
  "popularityTarget": number, // 0 = obscure deep cuts, 100 = global hits
  "yearRange": [number, number] | null,
  "instrumental": boolean,
  "explicitAllowed": boolean
}
Rules: never invent artist names. Keep genre tags Spotify-searchable (plain words, no slashes).
If the text is vague, infer sensible defaults instead of leaving arrays empty.`;

function union(first: string[], second: string[]): string[] {
  const seen = new Set(first.map((value) => value.toLowerCase()));
  const merged = [...first];
  for (const value of second) {
    if (seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    merged.push(value);
  }
  return merged;
}

function extractJsonObject(content: string): unknown {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("LLM response had no JSON object");
  return JSON.parse(content.slice(start, end + 1));
}

/**
 * Optional interpretation pass. Any failure (missing key, timeout, bad JSON,
 * schema mismatch) returns null so generation still runs on the local parser.
 */
export async function interpretWithLLM(
  description: string,
  fallback: Intent,
): Promise<Intent | null> {
  if (!llmEnabled) return null;

  const baseUrl = (process.env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.LLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              `Description: ${description}`,
              `Local parser baseline (correct it if wrong, keep what is right): ${JSON.stringify(
                {
                  genres: fallback.genres,
                  moods: fallback.moods,
                  occasions: fallback.occasions,
                  yearRange: fallback.yearRange,
                  includeArtists: fallback.includeArtists,
                },
              )}`,
            ].join("\n\n"),
          },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = llmIntentSchema.safeParse(extractJsonObject(content));
    if (!parsed.success) return null;
    const llm = parsed.data;

    const intent: Intent = {
      ...fallback,
      genres: union(fallback.genres, llm.genres),
      moods: union(fallback.moods, llm.moods),
      occasions: union(fallback.occasions, llm.occasions),
      languages: union(fallback.languages, llm.languages),
      keywords: union(fallback.keywords, llm.keywords).slice(0, 8),
      excludeKeywords: union(fallback.excludeKeywords, llm.excludeKeywords),
      excludeTags: union(fallback.excludeTags, llm.excludeGenres),
      includeArtists: union(fallback.includeArtists, llm.includeArtists),
      excludeArtists: union(fallback.excludeArtists, llm.excludeArtists),
      yearRange: llm.yearRange ?? fallback.yearRange,
      energy: llm.energy ?? fallback.energy,
      popularityTarget: llm.popularityTarget ?? fallback.popularityTarget,
      instrumental: llm.instrumental ?? fallback.instrumental,
      explicitAllowed: llm.explicitAllowed ?? fallback.explicitAllowed,
    };

    const known = new Set(fallback.evidence.map((item) => item.label.toLowerCase()));
    const additions: Intent["evidence"] = [
      ...llm.genres.map((label) => ({ label, kind: "genre" })),
      ...llm.moods.map((label) => ({ label, kind: "mood" })),
      ...llm.occasions.map((label) => ({ label, kind: "occasion" })),
      ...llm.includeArtists.map((label) => ({ label, kind: "artist" })),
      ...llm.excludeGenres.map((label) => ({ label: `no ${label}`, kind: "exclude" })),
    ].filter((item) => !known.has(item.label.toLowerCase()));

    intent.evidence = [...fallback.evidence, ...additions];
    intent.summary = summarizeIntent(intent);
    return intent;
  } catch {
    return null;
  }
}
