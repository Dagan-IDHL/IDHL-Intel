import { json } from '@sveltejs/kit';
import { COMPARE_MODES, GRANULARITIES, METRIC_META } from '$lib/analytics/constants.js';
import { todayIsoUtc, addDays } from '$lib/analytics/date.js';
import { normalizeMetricId } from '$lib/analytics/normalize.js';
import { getBrandSplit } from '$lib/analytics/provider.js';

function isValidEnumValue(enumObj, v) {
	return Object.values(enumObj).includes(v);
}

export function GET({ url }) {
	const clientId = url.searchParams.get('clientId') || 'mock-client';
	const metric = normalizeMetricId(url.searchParams.get('metric') || 'clicks');

	if (!METRIC_META[metric]) {
		return json({ error: `Unknown metric: ${metric}` }, { status: 400 });
	}

	const end = url.searchParams.get('end') || addDays(todayIsoUtc(), -1);
	const start = url.searchParams.get('start') || addDays(end, -27);

	const compareMode = url.searchParams.get('compareMode') || COMPARE_MODES.OFF;
	if (!isValidEnumValue(COMPARE_MODES, compareMode)) {
		return json({ error: `Invalid compareMode: ${compareMode}` }, { status: 400 });
	}

	const granularity = url.searchParams.get('granularity') || GRANULARITIES.AUTO;
	if (!isValidEnumValue(GRANULARITIES, granularity)) {
		return json({ error: `Invalid granularity: ${granularity}` }, { status: 400 });
	}

	try {
		const data = getBrandSplit({
			clientId,
			metric,
			range: { start, end },
			compareMode,
			granularity
		});
		return json(data);
	} catch (e) {
		return json({ error: e?.message || 'Unknown error' }, { status: 500 });
	}
}
