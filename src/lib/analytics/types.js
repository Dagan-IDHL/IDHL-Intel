/**
 * @typedef {'mock'|'gsc'|'ga4'} AnalyticsSource
 * @typedef {'off'|'mom'|'yoy'} CompareMode
 * @typedef {'auto'|'daily'|'weekly'|'monthly'} Granularity
 *
 * @typedef {Object} DateRange
 * @property {string} start - ISO date string (YYYY-MM-DD)
 * @property {string} end - ISO date string (YYYY-MM-DD)
 *
 * @typedef {Object} TimeSeriesPoint
 * @property {string} date - ISO date string (YYYY-MM-DD) representing bucket start
 * @property {number} value
 *
 * @typedef {Object} TimeSeries
 * @property {string} metric
 * @property {AnalyticsSource} source
 * @property {Granularity} granularity
 * @property {DateRange} range
 * @property {TimeSeriesPoint[]} points
 *
 * @typedef {Object} ComparisonSummary
 * @property {number} current
 * @property {number|null} compare
 * @property {number|null} deltaAbs
 * @property {number|null} deltaPct
 *
 * @typedef {Object} TimeSeriesResponse
 * @property {string} clientId
 * @property {TimeSeries} current
 * @property {TimeSeries|null} compare
 * @property {CompareMode} compareMode
 * @property {DateRange|null} compareRange
 * @property {ComparisonSummary} summary
 */

export {};
