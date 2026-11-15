import type { InterpretResult } from "../types";
import { interpretHeuristic, summarizeIntent } from "./intent";
import { interpretWithLLM, llmEnabled } from "./llm";

/**
 * Deterministic parser always runs first. When LLM_API_KEY is configured, a
 * second pass refines the result and falls back silently on any failure.
 */
export async function interpretDescription(
  description: string,
): Promise<InterpretResult> {
  const heuristic = interpretHeuristic(description);
  heuristic.summary = summarizeIntent(heuristic);

  if (!llmEnabled || !description.trim()) {
    return { intent: heuristic, engine: "heuristic" };
  }

  const refined = await interpretWithLLM(description, heuristic);
  if (!refined) return { intent: heuristic, engine: "heuristic" };
  return { intent: refined, engine: "llm" };
}
