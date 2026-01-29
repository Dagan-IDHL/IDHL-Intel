export const CARD_CONTEXT_VERSION = 1;

/**
 * `CardContext` is the ONLY source of truth the AI is allowed to use.
 * It should contain raw numbers (not just formatted strings) so the model can
 * reference exact values without inventing metrics.
 *
 * Versioning:
 * - `version` is required and should be `CARD_CONTEXT_VERSION`.
 * - Additive changes should keep the same version; breaking changes bump it.
 *
 * @typedef {{ date: string, value: number }} TimeSeriesPoint
 *
 * @typedef {{
 *   version: 1,
 *   kind: 'time_series',
 *   metric: string,
 *   metricLabel: string,
 *   unit: 'count'|'percent'|'currency'|'number',
 *   source: string|null,
 *   compareMode: 'off'|'mom'|'yoy',
 *   range: { start: string, end: string }|null,
 *   compareRange: { start: string, end: string }|null,
 *   current: { total: number|null, granularity: string|null, points: TimeSeriesPoint[] },
 *   compare: { total: number|null, granularity: string|null, points: TimeSeriesPoint[] }|null,
 *   deltaAbs: number|null,
 *   deltaPct: number|null,
 *   filters: Record<string, unknown>
 * }} TimeSeriesCardContext
 *
 * @typedef {{
 *   key: string,
 *   label: string,
 *   points: TimeSeriesPoint[]
 * }} SplitSegment
 *
 * @typedef {{
 *   version: 1,
 *   kind: 'brand_split',
 *   title: string,
 *   metric: string,
 *   metricLabel: string,
 *   unit: 'count'|'percent'|'currency'|'number',
 *   source: string|null,
 *   compareMode: 'off'|'mom'|'yoy',
 *   range: { start: string, end: string }|null,
 *   compareRange: { start: string, end: string }|null,
 *   current: { total: number|null, brandShare: number|null, segments: SplitSegment[] },
 *   compare: { total: number|null, brandShare: number|null, segments: SplitSegment[] }|null,
 *   deltaAbs: number|null,
 *   deltaPct: number|null,
 *   brandShareDeltaAbs: number|null,
 *   brandShareDeltaPct: number|null,
 *   filters: Record<string, unknown>
 * }} BrandSplitCardContext
 *
 * @typedef {{
 *   key: string,
 *   value: number,
 *   share: number,
 *   compareValue: number|null,
 *   compareShare: number|null,
 *   deltaAbs: number|null,
 *   deltaPct: number|null
 * }} BreakdownRow
 *
 * @typedef {{
 *   version: 1,
 *   kind: 'breakdown',
 *   title: string,
 *   metric: string,
 *   metricLabel: string,
 *   unit: 'count'|'percent'|'currency'|'number',
 *   dimension: string,
 *   source: string|null,
 *   compareMode: 'off'|'mom'|'yoy',
 *   range: { start: string, end: string }|null,
 *   compareRange: { start: string, end: string }|null,
 *   currentTotal: number|null,
 *   compareTotal: number|null,
 *   rows: BreakdownRow[],
 *   filters: Record<string, unknown>
 * }} BreakdownCardContext
 *
 * @typedef {TimeSeriesCardContext|BrandSplitCardContext|BreakdownCardContext} CardContext
 */

