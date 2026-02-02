import { GRANULARITIES, METRIC_META } from './constants.js';
import { computeCompareRange, computeDelta } from './comparison.js';
import { daysInclusive, iterateBuckets, iterateMonthBuckets } from './date.js';
import { seededRandom } from './seededRandom.js';

function roundCurrency(v) {
	return Math.round((Number(v) || 0) * 100) / 100;
}

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
 * Derived metric: Average purchase value (AOV) = revenue / purchases.
 * @param {Object} args
 * @param {string} args.clientId
 * @param {import('./types.js').DateRange} args.range
 * @param {import('./types.js').CompareMode} args.compareMode
 * @param {import('./types.js').Granularity} args.granularity
 */
function getMockAveragePurchaseValue({ clientId, range, compareMode, granularity }) {
	const source = 'ga4';
	const resolved = resolveGranularity(range, granularity);

	const revenueSeries = generateSeries({
		clientId,
		metric: 'revenue',
		range,
		granularity: resolved,
		source
	});
	const purchasesSeries = generateSeries({
		clientId,
		metric: 'purchases',
		range,
		granularity: resolved,
		source
	});

	const purchasesByDate = new Map((purchasesSeries.points || []).map((p) => [p.date, p.value]));
	const points = (revenueSeries.points || []).map((p) => {
		const denom = Number(purchasesByDate.get(p.date) || 0);
		const v = denom > 0 ? Number(p.value || 0) / denom : 0;
		return { date: p.date, value: roundCurrency(v) };
	});

	const revenueTotal = aggregate('revenue', revenueSeries.points);
	const purchasesTotal = aggregate('purchases', purchasesSeries.points);
	const currentAov = purchasesTotal > 0 ? revenueTotal / purchasesTotal : 0;

	const compareRange = computeCompareRange(range, compareMode);
	if (!compareRange) {
		return {
			clientId,
			compareMode,
			compareRange: null,
			current: {
				metric: 'averagePurchaseValue',
				source,
				granularity: resolved,
				range,
				points
			},
			compare: null,
			summary: { current: roundCurrency(currentAov), compare: null, deltaAbs: null, deltaPct: null }
		};
	}

	const compareRevenue = generateSeries({
		clientId,
		metric: 'revenue',
		range: compareRange,
		granularity: resolved,
		source
	});
	const comparePurchases = generateSeries({
		clientId,
		metric: 'purchases',
		range: compareRange,
		granularity: resolved,
		source
	});
	const comparePurchasesByDate = new Map(
		(comparePurchases.points || []).map((p) => [p.date, p.value])
	);
	const comparePoints = (compareRevenue.points || []).map((p) => {
		const denom = Number(comparePurchasesByDate.get(p.date) || 0);
		const v = denom > 0 ? Number(p.value || 0) / denom : 0;
		return { date: p.date, value: roundCurrency(v) };
	});

	const compareRevenueTotal = aggregate('revenue', compareRevenue.points);
	const comparePurchasesTotal = aggregate('purchases', comparePurchases.points);
	const compareAov = comparePurchasesTotal > 0 ? compareRevenueTotal / comparePurchasesTotal : 0;
	const { deltaAbs, deltaPct } = computeDelta(currentAov, compareAov);

	return {
		clientId,
		compareMode,
		compareRange,
		current: {
			metric: 'averagePurchaseValue',
			source,
			granularity: resolved,
			range,
			points
		},
		compare: {
			metric: 'averagePurchaseValue',
			source,
			granularity: resolved,
			range: compareRange,
			points: comparePoints
		},
		summary: {
			current: roundCurrency(currentAov),
			compare: roundCurrency(compareAov),
			deltaAbs: deltaAbs == null ? null : roundCurrency(deltaAbs),
			deltaPct
		}
	};
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
	if (metric === 'averagePurchaseValue') {
		return getMockAveragePurchaseValue({ clientId, range, compareMode, granularity });
	}

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

/**
 * @param {string} dimension
 */
function defaultDimensionCandidates(dimension) {
	if (dimension === 'page') {
		return [
			'/',
			'/pricing',
			'/about',
			'/contact',
			'/blog/how-to-audit-seo',
			'/blog/technical-seo-checklist',
			'/blog/content-strategy-guide',
			'/blog/link-building-basics',
			'/services/seo',
			'/services/ppc',
			'/services/content',
			'/case-studies',
			'/case-studies/client-a',
			'/case-studies/client-b',
			'/resources/free-tools'
		];
	}

	if (dimension === 'query') {
		return [
			'brand name',
			'brand + pricing',
			'brand reviews',
			'best seo agency',
			'seo audit template',
			'technical seo checklist',
			'content marketing strategy',
			'how to improve ctr',
			'link building outreach',
			'ga4 engaged sessions',
			'gsc impressions low',
			'keyword research tool',
			'seo reporting dashboard',
			'competitor analysis seo',
			'local seo tips'
		];
	}

	if (dimension === 'source') {
		return [
			'google / organic',
			'direct / (none)',
			'google / cpc',
			'bing / organic',
			'linkedin.com / referral',
			'facebook.com / referral',
			'newsletter / email',
			'partner-site.com / referral',
			'youtube.com / referral',
			'instagram.com / referral'
		];
	}

	return ['unknown'];
}

/**
 * @param {Object} args
 * @param {string} args.clientId
 * @param {string} args.metric
 * @param {string} args.dimension
 * @param {import('./types.js').DateRange} args.range
 * @param {import('./types.js').CompareMode} args.compareMode
 * @param {number=} args.limit
 */
export function getMockBreakdown({ clientId, metric, dimension, range, compareMode, limit = 10 }) {
	const meta = METRIC_META?.[metric];
	const source = meta?.source ?? 'mock';
	const unit = meta?.unit ?? 'number';

	const currentGen = generateSeries({ clientId, metric, range, granularity: 'auto', source });
	const currentTotal = aggregate(metric, currentGen.points);

	const candidates = defaultDimensionCandidates(dimension);
	const rand = seededRandom(
		`${clientId}:${source}:breakdown:${metric}:${dimension}:${range.start}:${range.end}`
	);

	const weighted = candidates.map((key) => ({ key, w: rand() + 0.05 }));
	weighted.sort((a, b) => b.w - a.w);
	const top = weighted.slice(0, Math.min(limit, weighted.length));

	const wSum = top.reduce((s, r) => s + r.w, 0) || 1;
	const rows = top.map((r) => ({
		key: r.key,
		value: 0,
		share: 0
	}));

	let running = 0;
	for (let i = 0; i < rows.length; i += 1) {
		const share = top[i].w / wSum;
		let v = currentTotal * share;
		if (unit === 'count') v = Math.round(v);
		if (unit === 'currency') v = Math.round(v * 100) / 100;
		if (unit === 'percent') v = Math.round(v * 10000) / 10000;
		rows[i].value = v;
		running += v;
	}

	// Ensure totals line up for count-like metrics.
	if (unit === 'count' && rows.length > 0) {
		const diff = Math.round(currentTotal - running);
		rows[rows.length - 1].value = Math.max(0, rows[rows.length - 1].value + diff);
	}

	for (const r of rows) {
		r.share = currentTotal > 0 ? r.value / currentTotal : 0;
	}

	const compareRange = computeCompareRange(range, compareMode);
	if (!compareRange) {
		return {
			clientId,
			metric,
			dimension,
			compareMode,
			compareRange: null,
			current: { metric, dimension, source, range, rows, total: currentTotal },
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

	// Reuse the same candidate ordering, but shift weights a touch so rows change subtly.
	const randCompare = seededRandom(
		`${clientId}:${source}:breakdown:${metric}:${dimension}:${compareRange.start}:${compareRange.end}`
	);
	const compareRows = rows.map((r, idx) => {
		const wiggle = 1 + (randCompare() - 0.5) * 0.12;
		const baseShare = top[idx]?.w / wSum;
		return { key: r.key, value: compareTotal * baseShare * wiggle, share: 0 };
	});

	let compareRunning = 0;
	for (let i = 0; i < compareRows.length; i += 1) {
		let v = compareRows[i].value;
		if (unit === 'count') v = Math.round(v);
		if (unit === 'currency') v = Math.round(v * 100) / 100;
		if (unit === 'percent') v = Math.round(v * 10000) / 10000;
		compareRows[i].value = v;
		compareRunning += v;
	}
	if (unit === 'count' && compareRows.length > 0) {
		const diff = Math.round(compareTotal - compareRunning);
		compareRows[compareRows.length - 1].value = Math.max(
			0,
			compareRows[compareRows.length - 1].value + diff
		);
	}
	for (const r of compareRows) {
		r.share = compareTotal > 0 ? r.value / compareTotal : 0;
	}

	return {
		clientId,
		metric,
		dimension,
		compareMode,
		compareRange,
		current: { metric, dimension, source, range, rows, total: currentTotal },
		compare: {
			metric,
			dimension,
			source,
			range: compareRange,
			rows: compareRows,
			total: compareTotal
		},
		summary: { current: currentTotal, compare: compareTotal, deltaAbs, deltaPct }
	};
}

/**
 * @param {Object} args
 * @param {string} args.clientId
 * @param {string} args.metric
 * @param {import('./types.js').DateRange} args.range
 * @param {import('./types.js').CompareMode} args.compareMode
 * @param {import('./types.js').Granularity} args.granularity
 */
export function getMockBrandSplit({ clientId, metric, range, compareMode, granularity }) {
	const meta = METRIC_META?.[metric];
	const source = meta?.source ?? 'mock';
	const unit = meta?.unit ?? 'number';

	const currentGen = generateSeries({ clientId, metric, range, granularity, source });

	const rand = seededRandom(
		`${clientId}:${source}:brandSplit:${metric}:${range.start}:${range.end}:${currentGen.granularity}`
	);

	const brandPoints = [];
	const nonBrandPoints = [];
	for (let i = 0; i < currentGen.points.length; i += 1) {
		const p = currentGen.points[i];
		const ratio = Math.min(
			0.65,
			Math.max(0.15, 0.38 + Math.sin(i / 9) * 0.05 + (rand() - 0.5) * 0.04)
		);
		let brand = p.value * ratio;
		let nonBrand = p.value - brand;

		if (unit === 'count') {
			brand = Math.round(brand);
			nonBrand = Math.max(0, Math.round(p.value) - brand);
		}
		if (unit === 'currency') {
			brand = Math.round(brand * 100) / 100;
			nonBrand = Math.round(nonBrand * 100) / 100;
		}
		if (unit === 'percent') {
			brand = Math.round(brand * 10000) / 10000;
			nonBrand = Math.round(nonBrand * 10000) / 10000;
		}

		brandPoints.push({ date: p.date, value: brand });
		nonBrandPoints.push({ date: p.date, value: nonBrand });
	}

	const currentTotal = aggregate(metric, currentGen.points);
	const currentBrandTotal = aggregate(metric, brandPoints);
	const currentBrandShare = currentTotal > 0 ? currentBrandTotal / currentTotal : 0;

	const compareRange = computeCompareRange(range, compareMode);
	if (!compareRange) {
		return {
			clientId,
			metric,
			compareMode,
			compareRange: null,
			current: {
				metric,
				source,
				granularity: currentGen.granularity,
				range,
				segments: [
					{ key: 'brand', label: 'Brand', points: brandPoints },
					{ key: 'nonBrand', label: 'Non-brand', points: nonBrandPoints }
				]
			},
			compare: null,
			summary: {
				current: currentTotal,
				compare: null,
				deltaAbs: null,
				deltaPct: null,
				currentBrandShare,
				compareBrandShare: null,
				brandShareDeltaAbs: null,
				brandShareDeltaPct: null
			}
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

	const randCompare = seededRandom(
		`${clientId}:${source}:brandSplit:${metric}:${compareRange.start}:${compareRange.end}:${currentGen.granularity}`
	);
	const compareBrandPoints = [];
	const compareNonBrandPoints = [];
	for (let i = 0; i < compareGen.points.length; i += 1) {
		const p = compareGen.points[i];
		const ratio = Math.min(
			0.65,
			Math.max(0.15, 0.38 + Math.sin(i / 10) * 0.05 + (randCompare() - 0.5) * 0.04)
		);
		let brand = p.value * ratio;
		let nonBrand = p.value - brand;

		if (unit === 'count') {
			brand = Math.round(brand);
			nonBrand = Math.max(0, Math.round(p.value) - brand);
		}
		if (unit === 'currency') {
			brand = Math.round(brand * 100) / 100;
			nonBrand = Math.round(nonBrand * 100) / 100;
		}
		if (unit === 'percent') {
			brand = Math.round(brand * 10000) / 10000;
			nonBrand = Math.round(nonBrand * 10000) / 10000;
		}

		compareBrandPoints.push({ date: p.date, value: brand });
		compareNonBrandPoints.push({ date: p.date, value: nonBrand });
	}

	const compareBrandTotal = aggregate(metric, compareBrandPoints);
	const compareBrandShare = compareTotal > 0 ? compareBrandTotal / compareTotal : 0;
	const { deltaAbs: brandShareDeltaAbs, deltaPct: brandShareDeltaPct } = computeDelta(
		currentBrandShare,
		compareBrandShare
	);

	return {
		clientId,
		metric,
		compareMode,
		compareRange,
		current: {
			metric,
			source,
			granularity: currentGen.granularity,
			range,
			segments: [
				{ key: 'brand', label: 'Brand', points: brandPoints },
				{ key: 'nonBrand', label: 'Non-brand', points: nonBrandPoints }
			]
		},
		compare: {
			metric,
			source,
			granularity: currentGen.granularity,
			range: compareRange,
			segments: [
				{ key: 'brand', label: 'Brand', points: compareBrandPoints },
				{ key: 'nonBrand', label: 'Non-brand', points: compareNonBrandPoints }
			]
		},
		summary: {
			current: currentTotal,
			compare: compareTotal,
			deltaAbs,
			deltaPct,
			currentBrandShare,
			compareBrandShare,
			brandShareDeltaAbs,
			brandShareDeltaPct
		}
	};
}
