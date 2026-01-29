import { METRIC_META } from './constants.js';

const METRIC_ALIASES = {
	average_purchase_value: 'averagePurchaseValue',
	avg_purchase_value: 'averagePurchaseValue',
	aov: 'averagePurchaseValue',
	averagepurchasevalue: 'averagePurchaseValue',
	engaged_sessions: 'engagedSessions',
	engagedsessions: 'engagedSessions',
	bounce_rate: 'bounceRate',
	bouncerate: 'bounceRate',
	avg_position: 'position',
	average_position: 'position'
};

/**
 * Normalizes metric ids from user/AI input.
 * - Accepts camelCase ids (preferred)
 * - Accepts snake_case aliases (from LLMs)
 *
 * @param {string|null|undefined} raw
 */
export function normalizeMetricId(raw) {
	const v = String(raw || '').trim();
	if (!v) return v;
	if (METRIC_META[v]) return v;

	const key = v.toLowerCase().replace(/[\s-]+/g, '_');
	const alias = METRIC_ALIASES[key];
	if (alias && METRIC_META[alias]) return alias;

	const camel = key.replace(/_([a-z0-9])/g, (_, c) => String(c).toUpperCase());
	if (METRIC_META[camel]) return camel;

	return v;
}

