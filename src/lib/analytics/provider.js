import { ANALYTICS_SOURCES } from './constants.js';
import { getMockTimeSeries } from './mockProvider.js';

/**
 * Source-agnostic analytics provider facade.
 * In Phase 1 we only support mock data.
 *
 * @param {Object} args
 * @param {string} args.clientId
 * @param {string} args.metric
 * @param {import('./types.js').DateRange} args.range
 * @param {import('./types.js').CompareMode} args.compareMode
 * @param {import('./types.js').Granularity} args.granularity
 * @param {import('./types.js').AnalyticsSource=} args.sourceOverride
 * @returns {import('./types.js').TimeSeriesResponse}
 */
export function getTimeSeries(args) {
	if (args.sourceOverride && args.sourceOverride !== ANALYTICS_SOURCES.MOCK) {
		throw new Error('Only mock analytics are available in Phase 1.');
	}

	return getMockTimeSeries(args);
}
