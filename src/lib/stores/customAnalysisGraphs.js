import { writable } from 'svelte/store';

const STORAGE_KEY = 'intel_custom_graphs_v1';

function safeParse(text) {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

function uid() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeClientGraphs(arr) {
	if (!Array.isArray(arr)) return [];
	return arr
		.map((item) => {
			// New shape: { id, spec }
			if (item && typeof item === 'object' && item.id && item.spec) return item;
			// Old shape: spec only
			if (item && typeof item === 'object') return { id: uid(), spec: item };
			return null;
		})
		.filter(Boolean);
}

function loadInitial() {
	if (typeof window === 'undefined') return {};
	const raw = window.localStorage.getItem(STORAGE_KEY);
	const parsed = raw ? safeParse(raw) : null;
	if (!parsed || typeof parsed !== 'object') return {};

	// Migrate to stable-id shape: { [clientId]: [{ id, spec }] }
	/** @type {Record<string, any[]>} */
	const next = {};
	for (const [clientId, arr] of Object.entries(parsed)) {
		next[clientId] = normalizeClientGraphs(arr);
	}
	return next;
}

/** @type {import('svelte/store').Writable<Record<string, any[]>>} */
export const customGraphsByClient = writable(loadInitial());

if (typeof window !== 'undefined') {
	customGraphsByClient.subscribe((value) => {
		try {
			// Always persist in normalized shape.
			const next = {};
			for (const [clientId, arr] of Object.entries(value || {})) {
				next[clientId] = normalizeClientGraphs(arr);
			}
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		} catch {
			// ignore storage quota / privacy errors
		}
	});
}

export function addCustomGraph(clientId, graphSpec) {
	if (!clientId) return;
	customGraphsByClient.update((m) => {
		const existing = normalizeClientGraphs(m[clientId]);
		const item = { id: uid(), spec: graphSpec };
		return { ...m, [clientId]: [...existing, item] };
	});
}

export function removeCustomGraph(clientId, indexOrId) {
	if (!clientId) return;
	customGraphsByClient.update((m) => {
		const existing = normalizeClientGraphs(m[clientId]);
		const next =
			typeof indexOrId === 'string'
				? existing.filter((g) => g.id !== indexOrId)
				: existing.filter((_, i) => i !== indexOrId);
		return { ...m, [clientId]: next };
	});
}
