import { METRIC_META } from './constants.js';

/**
 * @param {string} metric
 * @param {number} value
 */
export function formatMetricValue(metric, value) {
	const meta = METRIC_META?.[metric];
	const unit = meta?.unit ?? 'number';

	if (value == null || Number.isNaN(value)) return '—';

	if (unit === 'currency') {
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: 'GBP',
			maximumFractionDigits: 0
		}).format(value);
	}

	if (unit === 'percent') {
		return new Intl.NumberFormat('en-GB', {
			style: 'percent',
			maximumFractionDigits: 1
		}).format(value);
	}

	if (unit === 'count') {
		return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(value);
	}

	return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(value);
}

/**
 * @param {number|null} deltaPct
 */
export function formatDeltaPct(deltaPct) {
	if (deltaPct == null || Number.isNaN(deltaPct)) return '—';
	return new Intl.NumberFormat('en-GB', {
		style: 'percent',
		maximumFractionDigits: 1,
		signDisplay: 'always'
	}).format(deltaPct);
}
