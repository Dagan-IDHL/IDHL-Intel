export const GRAPH_SPEC_VERSION = 1;

/**
 * A `GraphSpec` describes a graph the UI can render using the existing mock analytics endpoints.
 *
 * @typedef {{
 *   version: 1,
 *   kind: 'time_series'|'brand_split'|'breakdown'|'kpi_split'|'multi_time_series',
 *   title: string,
 *   metric: string,
 *   metrics?: string[] | null,
 *   dimension: string|null,
 *   chartType: 'line'|'bar'|'stacked_area'|'stacked_bar'|'table'|'pie',
 *   range: { start: string, end: string }|null,
 *   compareMode: 'off'|'mom'|'yoy',
 *   granularity: 'auto'|'daily'|'weekly'|'monthly',
 *   limit: number|null
 * }} GraphSpec
 */
