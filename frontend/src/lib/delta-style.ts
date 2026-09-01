export type Tone = "up" | "down" | "flat";

/**
 * Colour convention, applied identically to KPI cards, delta columns and
 * badges:
 *
 *   energy   — an increase is a cost, so up is red and down is green
 *   output   — an increase is favourable, so the mapping inverts
 *
 * Anything that did not move reads grey, so a screen of zeros never looks like
 * a screen of warnings.
 */
export function energyTone(delta: number | null): Tone {
  if (delta === null || !Number.isFinite(delta) || delta === 0) return "flat";
  return delta > 0 ? "up" : "down";
}

export function outputTone(delta: number | null): Tone {
  if (delta === null || !Number.isFinite(delta) || delta === 0) return "flat";
  return delta > 0 ? "down" : "up";
}

export const TONE_TEXT: Record<Tone, string> = {
  up: "text-up",
  down: "text-down",
  flat: "text-ink-muted",
};

export const TONE_BG: Record<Tone, string> = {
  up: "bg-up-soft text-up",
  down: "bg-down-soft text-down",
  flat: "bg-canvas text-ink-muted",
};

export const TONE_BAR: Record<Tone, string> = {
  up: "bg-up",
  down: "bg-down",
  flat: "bg-ink-faint",
};
