import { json } from '@sveltejs/kit';
import { COMPARE_MODES, DIMENSIONS, METRIC_META } from '$lib/analytics/constants.js';
import { todayIsoUtc, addDays } from '$lib/analytics/date.js';
import { normalizeMetricId } from '$lib/analytics/normalize.js';
import { getBreakdown } from '$lib/analytics/provider.js';

function isValidEnumValue(enumObj, v) {
	return Object.values(enumObj).includes(v);
}

const ALLOWED_DIMENSIONS = new Set([DIMENSIONS.PAGE, DIMENSIONS.QUERY, DIMENSIONS.SOURCE]);

export function GET({ url }) {
	const clientId = url.searchParams.get('clientId') || 'mock-client';
	const metric = normalizeMetricId(url.searchParams.get('metric') || 'sessions');
	const dimension = url.searchParams.get('dimension') || DIMENSIONS.PAGE;

	if (!METRIC_META[metric]) {
		return json({ error: `Unknown metric: ${metric}` }, { status: 400 });
	}
	if (!ALLOWED_DIMENSIONS.has(dimension)) {
		return json({ error: `Invalid dimension: ${dimension}` }, { status: 400 });
	}

	const end = url.searchParams.get('end') || addDays(todayIsoUtc(), -1);
	const start = url.searchParams.get('start') || addDays(end, -27);

	const compareMode = url.searchParams.get('compareMode') || COMPARE_MODES.OFF;
	if (!isValidEnumValue(COMPARE_MODES, compareMode)) {
		return json({ error: `Invalid compareMode: ${compareMode}` }, { status: 400 });
	}

	const limitRaw = url.searchParams.get('limit') || '10';
	const limit = Math.min(50, Math.max(1, Number(limitRaw) || 10));

	try {
		const data = getBreakdown({
			clientId,
			metric,
			dimension,
			range: { start, end },
			compareMode,
			limit
		});
		return json(data);
	} catch (e) {
		return json({ error: e?.message || 'Unknown error' }, { status: 500 });
	}
}
