/**
 * Response shapes for the IOsense connector APIs this app calls.
 *
 * Kept deliberately narrow: only the fields the dashboard reads are typed, so
 * an unrelated change to the connector's payload cannot silently break the
 * build. Everything is validated at runtime in `api.ts` before use.
 */

/** Every connector endpoint wraps its payload this way. */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  errors?: string[];
  message?: string;
}

/** One aggregated result inside a `getWidgetData` bucket. */
export interface WidgetDataPoint {
  type: "device" | "cluster" | "compute";
  devID?: string;
  sensor?: string;
  clusterID?: string;
  flowId?: string;
  operator: string;
  key: string;
  /** The connector returns this as a string on some deployments. */
  data: string | number | null;
}

/**
 * `data` is nested timeFrame → bucket label → results, e.g.
 * `{ day: { "2026-09-01T00:00:00": [ {...}, {...} ] } }`.
 */
export type WidgetDataBuckets = Record<string, Record<string, WidgetDataPoint[]>>;

export interface WidgetDataResponse {
  success: boolean;
  data: WidgetDataBuckets;
  comparisonData?: WidgetDataBuckets;
  errors?: string[];
}

/** Operators the connector itself supports. */
export type ConnectorOperator = "sum" | "min" | "max" | "mean";

/** One entry of the `config` array sent to `getWidgetData`. */
export interface WidgetDataConfigEntry {
  type: "device" | "cluster" | "compute";
  devID?: string;
  sensor?: string;
  clusterID?: string;
  flowId?: string;
  operator: ConnectorOperator;
  /** Correlates a response row back to the node that asked for it. */
  key: string;
}

/** Trimmed `findUserDevices` device, for the binding-discovery helper. */
export interface IosenseDevice {
  devID: string;
  devName: string;
  devTypeID: string;
  devTypeName: string;
  sensors: { sensorId: string; sensorName: string }[];
  unitSelected?: Record<string, string>;
  tags?: string[];
}

export interface FindUserDevicesData {
  totalCount: number;
  data: IosenseDevice[];
}
