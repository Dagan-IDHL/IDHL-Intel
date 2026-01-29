import { writable } from 'svelte/store';

/**
 * Global (client-scoped) context for the bottom-right chatbot.
 * Pages should keep this updated with current filters + a small summary of loaded data.
 */
export const dashboardContext = writable({
	clientId: null,
	filters: { start: null, end: null, preset: null, compareMode: 'off', granularity: 'auto' },
	kpis: {},
	timeSeries: {},
	breakdowns: {},
	brandSplit: null,
	updatedAt: 0
});
