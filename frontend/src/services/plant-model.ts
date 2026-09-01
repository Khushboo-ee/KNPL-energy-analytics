/**
 * Static asset hierarchy for the Bawal plant.
 *
 * This is the *shape* of the plant — sections, subsections, machines and their
 * nameplate ratings and duty profiles. It carries no readings; the period
 * readings are produced by `energy-source.ts` for whatever window the user
 * selects. Swapping to live IOsense telemetry means replacing that module, not
 * this one.
 */

/** A drift regime: a change that began `startDaysAgo` and ramps in linearly. */
export interface DriftSpec {
  startDaysAgo: number;
  rampDays: number;
  /** Fractional change in load factor once fully ramped. */
  loadDrift?: number;
  /** Fractional change in daily run hours once fully ramped. */
  runDrift?: number;
}

export interface EquipmentSpec {
  id: string;
  name: string;
  /** Nameplate rating, kW. */
  rated_kw: number;
  /** Typical run hours on a working day. */
  dutyHrs: number;
  /** Share of nameplate drawn while running. */
  loadFactor: number;
  /** Multiplier applied to duty hours on Sundays. */
  weekendFactor: number;
  drift?: DriftSpec;
}

export interface NodeSpec {
  id: string;
  name: string;
  /** Authored on deepest levels only; parents roll up from children. */
  productionKlPerDay?: number;
  productionDrift?: DriftSpec;
  children?: NodeSpec[];
  equipment?: EquipmentSpec[];
}

const PAINT_PLANT: NodeSpec = {
  id: "paint-plant",
  name: "Paint Plant",
  children: [
    {
      id: "paint-mixing",
      name: "Mixing Block",
      productionKlPerDay: 45,
      productionDrift: { startDaysAgo: 30, rampDays: 60, loadDrift: 0.06 },
      equipment: [
        { id: "pm-m1", name: "Mixer M-1", rated_kw: 75, dutyHrs: 18, loadFactor: 0.65, weekendFactor: 0.3 },
        { id: "pm-m2", name: "Mixer M-2", rated_kw: 75, dutyHrs: 18, loadFactor: 0.65, weekendFactor: 0.3 },
        { id: "pm-hsd3", name: "High Speed Disperser HSD-3", rated_kw: 110, dutyHrs: 16, loadFactor: 0.7, weekendFactor: 0.25 },
        { id: "pm-tp1", name: "Transfer Pump TP-1", rated_kw: 15, dutyHrs: 20, loadFactor: 0.5, weekendFactor: 0.4 },
        { id: "pm-eb2", name: "Exhaust Blower EB-2", rated_kw: 22, dutyHrs: 22, loadFactor: 0.6, weekendFactor: 0.5 },
      ],
    },
    {
      id: "paint-dispersion",
      name: "Dispersion Block",
      productionKlPerDay: 38,
      productionDrift: { startDaysAgo: 30, rampDays: 60, loadDrift: 0.05 },
      equipment: [
        { id: "pd-d1", name: "Disperser D-1", rated_kw: 132, dutyHrs: 20, loadFactor: 0.72, weekendFactor: 0.3 },
        {
          id: "pd-d2",
          name: "Disperser D-2",
          rated_kw: 132,
          dutyHrs: 20,
          loadFactor: 0.72,
          weekendFactor: 0.3,
          drift: { startDaysAgo: 30, rampDays: 60, loadDrift: 0.12, runDrift: 0.22 },
        },
        { id: "pd-cwp4", name: "Cooling Water Pump CWP-4", rated_kw: 37, dutyHrs: 22, loadFactor: 0.65, weekendFactor: 0.6 },
        { id: "pd-dc1", name: "Dust Collector DC-1", rated_kw: 30, dutyHrs: 18, loadFactor: 0.6, weekendFactor: 0.35 },
      ],
    },
    {
      id: "paint-grinding",
      name: "Grinding Block",
      productionKlPerDay: 30,
      productionDrift: { startDaysAgo: 30, rampDays: 60, loadDrift: 0.04 },
      equipment: [
        { id: "pg-bm1", name: "Bead Mill BM-1", rated_kw: 90, dutyHrs: 20, loadFactor: 0.7, weekendFactor: 0.3 },
        { id: "pg-bm2", name: "Bead Mill BM-2", rated_kw: 90, dutyHrs: 20, loadFactor: 0.7, weekendFactor: 0.3 },
        {
          id: "pg-bm3",
          name: "Bead Mill BM-3",
          rated_kw: 110,
          dutyHrs: 20,
          loadFactor: 0.7,
          weekendFactor: 0.3,
          drift: { startDaysAgo: 30, rampDays: 60, loadDrift: 0.22, runDrift: 0.25 },
        },
        {
          // Fouled condenser: draws far more power for the same running time,
          // which surfaces as an overload marginal-load badge.
          id: "pg-ch2",
          name: "Chiller CH-2",
          rated_kw: 160,
          dutyHrs: 22,
          loadFactor: 0.65,
          weekendFactor: 0.7,
          drift: { startDaysAgo: 28, rampDays: 50, loadDrift: 0.55, runDrift: 0.18 },
        },
        { id: "pg-fp7", name: "Feed Pump FP-7", rated_kw: 11, dutyHrs: 20, loadFactor: 0.6, weekendFactor: 0.35 },
      ],
    },
  ],
};

const CED_F2: NodeSpec = {
  id: "ced-f2",
  name: "CED F2",
  productionKlPerDay: 60,
  productionDrift: { startDaysAgo: 20, rampDays: 45, loadDrift: -0.08 },
  equipment: [
    { id: "ced-r1", name: "CED Rectifier R-1", rated_kw: 150, dutyHrs: 20, loadFactor: 0.75, weekendFactor: 0.25 },
    {
      id: "ced-r2",
      name: "CED Rectifier R-2",
      rated_kw: 150,
      dutyHrs: 20,
      loadFactor: 0.75,
      weekendFactor: 0.25,
      drift: { startDaysAgo: 20, rampDays: 45, runDrift: -0.3 },
    },
    { id: "ced-acp", name: "Anolyte Circulation Pump", rated_kw: 45, dutyHrs: 22, loadFactor: 0.6, weekendFactor: 0.6 },
    { id: "ced-uf", name: "UF Pump", rated_kw: 37, dutyHrs: 20, loadFactor: 0.6, weekendFactor: 0.5 },
    { id: "ced-obb", name: "Oven Burner Blower", rated_kw: 55, dutyHrs: 20, loadFactor: 0.7, weekendFactor: 0.3 },
    { id: "ced-conv", name: "Conveyor Drive", rated_kw: 18.5, dutyHrs: 20, loadFactor: 0.5, weekendFactor: 0.25 },
  ],
};

const PC_PLANT: NodeSpec = {
  id: "pc-plant",
  name: "PC Plant",
  children: [
    {
      id: "pc-extrusion",
      name: "Premix & Extrusion",
      productionKlPerDay: 26,
      productionDrift: { startDaysAgo: 25, rampDays: 50, loadDrift: 0.04 },
      equipment: [
        { id: "pce-pm1", name: "Premixer PM-1", rated_kw: 45, dutyHrs: 16, loadFactor: 0.6, weekendFactor: 0.3 },
        { id: "pce-ex1", name: "Extruder EX-1", rated_kw: 160, dutyHrs: 18, loadFactor: 0.7, weekendFactor: 0.3 },
        { id: "pce-ex2", name: "Extruder EX-2", rated_kw: 160, dutyHrs: 18, loadFactor: 0.7, weekendFactor: 0.3 },
        { id: "pce-cr", name: "Chill Roll Unit", rated_kw: 30, dutyHrs: 18, loadFactor: 0.5, weekendFactor: 0.35 },
      ],
    },
    {
      id: "pc-grinding",
      name: "Grinding & Classifying",
      productionKlPerDay: 22,
      productionDrift: { startDaysAgo: 25, rampDays: 50, loadDrift: 0.03 },
      equipment: [
        { id: "pcg-g1", name: "ACM Grinder G-1", rated_kw: 75, dutyHrs: 18, loadFactor: 0.7, weekendFactor: 0.3 },
        { id: "pcg-g2", name: "ACM Grinder G-2", rated_kw: 75, dutyHrs: 18, loadFactor: 0.7, weekendFactor: 0.3 },
        { id: "pcg-cl1", name: "Classifier CL-1", rated_kw: 22, dutyHrs: 18, loadFactor: 0.6, weekendFactor: 0.3 },
        { id: "pcg-cyc", name: "Cyclone Blower", rated_kw: 37, dutyHrs: 18, loadFactor: 0.65, weekendFactor: 0.3 },
      ],
    },
  ],
};

const RESIN_PLANT: NodeSpec = {
  id: "resin-plant",
  name: "Resin Plant",
  children: [
    {
      id: "resin-reactor",
      name: "Reactor Block",
      productionKlPerDay: 40,
      productionDrift: { startDaysAgo: 26, rampDays: 50, loadDrift: -0.15 },
      equipment: [
        {
          id: "rr-rx1",
          name: "Reactor RX-1",
          rated_kw: 110,
          dutyHrs: 20,
          loadFactor: 0.7,
          weekendFactor: 0.5,
          drift: { startDaysAgo: 26, rampDays: 50, loadDrift: -0.25, runDrift: -0.22 },
        },
        { id: "rr-rx2", name: "Reactor RX-2", rated_kw: 110, dutyHrs: 20, loadFactor: 0.7, weekendFactor: 0.5 },
        { id: "rr-tfp", name: "Thermic Fluid Pump", rated_kw: 45, dutyHrs: 22, loadFactor: 0.6, weekendFactor: 0.7 },
        { id: "rr-cp", name: "Condenser Pump", rated_kw: 30, dutyHrs: 22, loadFactor: 0.55, weekendFactor: 0.7 },
      ],
    },
    {
      id: "resin-thinning",
      name: "Thinning & Filtration",
      productionKlPerDay: 34,
      productionDrift: { startDaysAgo: 26, rampDays: 50, loadDrift: -0.1 },
      equipment: [
        { id: "rt-tv1", name: "Thinning Vessel TV-1", rated_kw: 37, dutyHrs: 14, loadFactor: 0.55, weekendFactor: 0.3 },
        { id: "rt-fp2", name: "Filter Press FP-2", rated_kw: 18.5, dutyHrs: 10, loadFactor: 0.6, weekendFactor: 0.2 },
        { id: "rt-tp9", name: "Transfer Pump TP-9", rated_kw: 15, dutyHrs: 12, loadFactor: 0.5, weekendFactor: 0.3 },
      ],
    },
  ],
};

// R&D, RM and Utility consume energy but book no production. Their SPC is
// undefined by construction — the UI must render an em dash, not divide by zero.
const RND: NodeSpec = {
  id: "rnd",
  name: "R&D",
  productionKlPerDay: 0,
  equipment: [
    { id: "rd-disp", name: "Lab Disperser", rated_kw: 7.5, dutyHrs: 8, loadFactor: 0.5, weekendFactor: 0.1 },
    { id: "rd-oven", name: "Lab Oven", rated_kw: 12, dutyHrs: 10, loadFactor: 0.7, weekendFactor: 0.2 },
    { id: "rd-chamber", name: "Accelerated Test Chamber", rated_kw: 9, dutyHrs: 12, loadFactor: 0.6, weekendFactor: 0.8 },
    { id: "rd-hvac", name: "Lab HVAC", rated_kw: 25, dutyHrs: 20, loadFactor: 0.6, weekendFactor: 0.5 },
    { id: "rd-fume", name: "Fume Hood Blower", rated_kw: 5.5, dutyHrs: 10, loadFactor: 0.5, weekendFactor: 0.2 },
  ],
};

const RM: NodeSpec = {
  id: "rm",
  name: "RM",
  productionKlPerDay: 0,
  equipment: [
    { id: "rm-stp", name: "Solvent Transfer Pump", rated_kw: 22, dutyHrs: 6, loadFactor: 0.6, weekendFactor: 0.2 },
    { id: "rm-exf", name: "Store Exhaust Fan", rated_kw: 11, dutyHrs: 20, loadFactor: 0.5, weekendFactor: 0.8 },
    { id: "rm-hoist", name: "Drum Handling Hoist", rated_kw: 7.5, dutyHrs: 4, loadFactor: 0.4, weekendFactor: 0.15 },
    { id: "rm-wb", name: "Weighbridge & Store Lighting", rated_kw: 4, dutyHrs: 24, loadFactor: 0.9, weekendFactor: 1 },
  ],
};

const UTILITY: NodeSpec = {
  id: "utility",
  name: "Utility",
  productionKlPerDay: 0,
  equipment: [
    { id: "ut-ac1", name: "Air Compressor AC-1", rated_kw: 160, dutyHrs: 22, loadFactor: 0.7, weekendFactor: 0.8 },
    {
      // Air-line leak: unloaded running time climbs while the extra energy per
      // added hour stays low — the classic idle-heavy signature.
      id: "ut-ac2",
      name: "Air Compressor AC-2",
      rated_kw: 160,
      dutyHrs: 22,
      loadFactor: 0.7,
      weekendFactor: 0.8,
      drift: { startDaysAgo: 22, rampDays: 55, runDrift: 0.7, loadDrift: -0.32 },
    },
    { id: "ut-ch1", name: "Chiller CH-1", rated_kw: 250, dutyHrs: 20, loadFactor: 0.65, weekendFactor: 0.6 },
    { id: "ut-ctf", name: "Cooling Tower Fan", rated_kw: 37, dutyHrs: 22, loadFactor: 0.7, weekendFactor: 0.8 },
    { id: "ut-etp", name: "ETP Aeration Blower", rated_kw: 55, dutyHrs: 24, loadFactor: 0.6, weekendFactor: 1 },
    { id: "ut-bfp", name: "Boiler Feed Pump", rated_kw: 30, dutyHrs: 18, loadFactor: 0.55, weekendFactor: 0.5 },
  ],
};

export const PLANT: NodeSpec = {
  id: "plant",
  name: "Overall Plant",
  children: [PAINT_PLANT, CED_F2, PC_PLANT, RND, RESIN_PLANT, RM, UTILITY],
};

export const PLANT_LABEL = "Bawal Plant";
