"use client";

import type { Intent } from "@/lib/types";

const ENERGY_LABEL = (energy: number) =>
  energy <= 0.3 ? "low energy" : energy <= 0.55 ? "mid energy" : "high energy";

export function IntentChips({ intent }: { intent: Intent }) {
  const positives = intent.evidence.filter((item) => item.kind !== "energy");
  const exclusions = [
    ...intent.excludeTags.map((tag) => ({ label: `no ${tag}`, kind: "exclude" })),
    ...intent.excludeKeywords.map((keyword) => ({ label: `no ${keyword}`, kind: "exclude" })),
  ];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted">What I hear</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {positives.length === 0 ? (
            <span className="text-xs text-muted">
              Nothing specific yet — mention genres, moods, eras or an occasion.
            </span>
          ) : (
            positives.map((item, index) => (
              <span
                key={`${item.kind}-${item.label}-${index}`}
                className="chip-accent"
              >
                {item.label}
              </span>
            ))
          )}
        </div>
      </div>

      {exclusions.length > 0 ? (
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted">
            Keeping out
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {exclusions.map((item, index) => (
              <span
                key={`${item.label}-${index}`}
                className="chip border-danger/30 bg-danger/10 text-danger"
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted">
          <span>Energy</span>
          <span>{ENERGY_LABEL(intent.energy)}</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${Math.round(intent.energy * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
