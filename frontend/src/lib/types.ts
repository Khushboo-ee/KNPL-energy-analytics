/** Core domain types for the EMS hierarchy. */

/** An inclusive date window, ISO `yyyy-mm-dd`. */
export interface Period {
  start: string;
  end: string;
}

/** The current window plus the window it is compared against. */
export interface PeriodPair {
  current: Period;
  previous: Period;
}

export type PresetId =
  | "today"
  | "week"
  | "month"
  | "custom";

export interface DurationSelection extends PeriodPair {
  preset: PresetId;
  label: string;
}

/** Leaf-level machine reading. */
export interface Equipment {
  id: string;
  name: string;
  rated_kw: number;
  current_kwh: number;
  previous_kwh: number;
  current_run_hrs: number;
  previous_run_hrs: number;
}

/**
 * A node in the plant tree. A node either has `children` (further
 * sections/subsections) or `equipment` (it is a deepest level), never both.
 */
export interface EnergyNode {
  id: string;
  name: string;
  /** 0 = Overall Plant, 1 = section, 2 = subsection. */
  depth: number;
  current_kwh: number;
  previous_kwh: number;
  current_production: number;
  previous_production: number;
  children?: EnergyNode[];
  equipment?: Equipment[];
}

export type LoadStatus = "idle-heavy" | "overload" | "normal" | "unknown";
