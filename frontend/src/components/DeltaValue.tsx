import { TONE_TEXT, type Tone } from "@/lib/delta-style";

interface DeltaValueProps {
  text: string;
  tone: Tone;
  /** Renders the figure at label weight rather than table weight. */
  strong?: boolean;
}

/** A signed figure carrying the shared red-up / green-down colour reading. */
export function DeltaValue({ text, tone, strong = false }: DeltaValueProps) {
  return (
    <span
      className={`num ${TONE_TEXT[tone]} ${strong ? "font-semibold" : "font-medium"}`}
      data-tone={tone}
    >
      {text}
    </span>
  );
}
