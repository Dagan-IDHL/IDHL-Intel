import { json } from '@sveltejs/kit';
import { METRIC_META } from '$lib/analytics/constants.js';

export function GET() {
	return json({
		metrics: Object.entries(METRIC_META).map(([key, meta]) => ({
			key,
			...meta
		}))
	});
}
