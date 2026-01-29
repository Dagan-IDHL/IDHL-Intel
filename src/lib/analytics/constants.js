export const ANALYTICS_SOURCES = /** @type {const} */ ({
	MOCK: 'mock',
	GSC: 'gsc',
	GA4: 'ga4'
});

export const COMPARE_MODES = /** @type {const} */ ({
	OFF: 'off',
	MOM: 'mom',
	YOY: 'yoy'
});

export const GRANULARITIES = /** @type {const} */ ({
	AUTO: 'auto',
	DAILY: 'daily',
	WEEKLY: 'weekly',
	MONTHLY: 'monthly'
});

export const METRICS = /** @type {const} */ ({
	CLICKS: 'clicks',
	IMPRESSIONS: 'impressions',
	CTR: 'ctr',
	POSITION: 'position',
	SESSIONS: 'sessions',
	ENGAGED_SESSIONS: 'engagedSessions',
	BOUNCE_RATE: 'bounceRate',
	PURCHASES: 'purchases',
	REVENUE: 'revenue',
	AVERAGE_PURCHASE_VALUE: 'averagePurchaseValue'
});

export const DIMENSIONS = /** @type {const} */ ({
	PAGE: 'page',
	QUERY: 'query',
	SOURCE: 'source'
});

export const METRIC_META = /** @type {const} */ ({
	[METRICS.CLICKS]: {
		unit: 'count',
		aggregate: 'sum',
		label: 'Clicks',
		source: ANALYTICS_SOURCES.GSC
	},
	[METRICS.IMPRESSIONS]: {
		unit: 'count',
		aggregate: 'sum',
		label: 'Impressions',
		source: ANALYTICS_SOURCES.GSC
	},
	[METRICS.CTR]: { unit: 'percent', aggregate: 'avg', label: 'CTR', source: ANALYTICS_SOURCES.GSC },
	[METRICS.POSITION]: {
		unit: 'number',
		aggregate: 'avg',
		label: 'Avg Position',
		source: ANALYTICS_SOURCES.GSC
	},
	[METRICS.SESSIONS]: {
		unit: 'count',
		aggregate: 'sum',
		label: 'Sessions',
		source: ANALYTICS_SOURCES.GA4
	},
	[METRICS.ENGAGED_SESSIONS]: {
		unit: 'count',
		aggregate: 'sum',
		label: 'Engaged Sessions',
		source: ANALYTICS_SOURCES.GA4
	},
	[METRICS.BOUNCE_RATE]: {
		unit: 'percent',
		aggregate: 'avg',
		label: 'Bounce Rate',
		source: ANALYTICS_SOURCES.GA4
	},
	[METRICS.PURCHASES]: {
		unit: 'count',
		aggregate: 'sum',
		label: 'Purchases',
		source: ANALYTICS_SOURCES.GA4
	},
	[METRICS.REVENUE]: {
		unit: 'currency',
		aggregate: 'sum',
		label: 'Revenue',
		source: ANALYTICS_SOURCES.GA4
	},
	[METRICS.AVERAGE_PURCHASE_VALUE]: {
		unit: 'currency',
		aggregate: 'avg',
		label: 'Avg Purchase Value',
		source: ANALYTICS_SOURCES.GA4
	}
});
