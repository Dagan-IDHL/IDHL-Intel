import { GRANULARITIES, METRIC_META } from './constants.js';
import { computeCompareRange, computeDelta } from './comparison.js';
import { daysInclusive, iterateBuckets, iterateMonthBuckets } from './date.js';
import { seededRandom } from './seededRandom.js';

/**
 * @param {import('./types.js').DateRange} range
 * @param {import('./types.js').Granularity} granularity
 */
function resolveGranularity(range, granularity) {
	if (granularity && granularity !== GRANULARITIES.AUTO) return granularity;
	const len = daysInclusive(range.start, range.end);
	return len <= 90
		? GRANULARITIES.DAILY
		: len <= 365
			? GRANULARITIES.WEEKLY
			: GRANULARITIES.MONTHLY;
}

/**
 * @param {string} metric
 */
function baseForMetric(metric) {
	switch (metric) {
		case 'sessions':
			return { base: 1200, volatility: 180 };
		case 'engagedSessions':
			return { base: 820, volatility: 140 };
		case 'bounceRate':
			return { base: 0.46, volatility: 0.06 };
		case 'purchases':
			return { base: 18, volatility: 6 };
		case 'revenue':
			return { base: 920, volatility: 260 };
		case 'clicks':
			return { base: 520, volatility: 120 };
		case 'impressions':
			return { base: 22000, volatility: 5000 };
		case 'ctr':
			return { base: 0.028, volatility: 0.006 };
		case 'position':
			return { base: 18, volatility: 2.5 };
		default:
			return { base: 100, volatility: 25 };
	}
}

/**
 * @param {number} v
 * @param {string} metric
 */
function clampMetric(v, metric) {
	if (metric === 'ctr' || metric === 'bounceRate') return Math.min(0.99, Math.max(0.001, v));
	if (metric === 'position') return Math.min(60, Math.max(1, v));
	return Math.max(0, v);
}

/**
 * @param {Object} args
 * @param {string} args.clientId
 * @param {string} args.metric
 * @param {import('./types.js').DateRange} args.range
 * @param {import('./types.js').Granularity} args.granularity
 * @param {string} args.source
 */
function generateSeries({ clientId, metric, range, granularity, source }) {
	const resolved = resolveGranularity(range, granularity);
	const stepDays = resolved === GRANULARITIES.WEEKLY ? 7 : 1;
	const rand = seededRandom(
		`${clientId}:${source}:${metric}:${range.start}:${range.end}:${resolved}`
	);
	const { base, volatility } = baseForMetric(metric);

	let i = 0;
	const points = [];

	const bucketIterator =
		resolved === GRANULARITIES.MONTHLY
			? iterateMonthBuckets(range.start, range.end)
			: iterateBuckets(range.start, range.end, stepDays);

	for (const bucketStart of bucketIterator) {
		const seasonality =
			resolved === GRANULARITIES.MONTHLY
				? Math.sin((i / 12) * Math.PI * 2) * 0.08
				: Math.sin((i / 7) * Math.PI * 2) * 0.06;
		const longWave = Math.sin(i / 18) * 0.04;
		const noise = (rand() - 0.5) * 2;

		let value = base * (1 + seasonality + longWave) + noise * volatility;

		// Sparse anomaly injection so AI has something to talk about later.
		if (rand() < 0.04) value *= rand() < 0.5 ? 0.72 : 1.28;

		value = clampMetric(value, metric);

		// Keep integers for count-like metrics.
		const unit = METRIC_META?.[metric]?.unit;
		if (unit === 'count') value = Math.round(value);
		if (unit === 'currency') value = Math.round(value * 100) / 100;
		if (unit === 'number') value = Math.round(value * 10) / 10;
		if (unit === 'percent') value = Math.round(value * 10000) / 10000;

		points.push({ date: bucketStart, value });
		i++;
	}

	return { points, granularity: resolved };
}

/**
 * @param {string} metric
 * @param {import('./types.js').TimeSeriesPoint[]} points
 */
function aggregate(metric, points) {
	const meta = METRIC_META?.[metric];
	const values = points.map((p) => p.value);
	if (values.length === 0) return 0;

	if (meta?.aggregate === 'avg') {
		return values.reduce((a, b) => a + b, 0) / values.length;
	}

	return values.reduce((a, b) => a + b, 0);
}

/**
 * Mock provider: deterministic analytics for UI/dev.
 * @param {Object} args
 * @param {string} args.clientId
 * @param {string} args.metric
 * @param {import('./types.js').DateRange} args.range
 * @param {import('./types.js').CompareMode} args.compareMode
 * @param {import('./types.js').Granularity} args.granularity
 */
export function getMockTimeSeries({ clientId, metric, range, compareMode, granularity }) {
	const meta = METRIC_META?.[metric];
	const source = meta?.source ?? 'mock';

	const currentGen = generateSeries({ clientId, metric, range, granularity, source });
	const currentTotal = aggregate(metric, currentGen.points);

	const compareRange = computeCompareRange(range, compareMode);
	if (!compareRange) {
		return {
			clientId,
			compareMode,
			compareRange: null,
			current: {
				metric,
				source,
				granularity: currentGen.granularity,
				range,
				points: currentGen.points
			},
			compare: null,
			summary: { current: currentTotal, compare: null, deltaAbs: null, deltaPct: null }
		};
	}

	const compareGen = generateSeries({
		clientId,
		metric,
		range: compareRange,
		granularity: currentGen.granularity,
		source
	});
	const compareTotal = aggregate(metric, compareGen.points);
	const { deltaAbs, deltaPct } = computeDelta(currentTotal, compareTotal);

	return {
		clientId,
		compareMode,
		compareRange,
		current: {
			metric,
			source,
			granularity: currentGen.granularity,
			range,
			points: currentGen.points
		},
		compare: {
			metric,
			source,
			granularity: currentGen.granularity,
			range: compareRange,
			points: compareGen.points
		},
		summary: { current: currentTotal, compare: compareTotal, deltaAbs, deltaPct }
	};
}
