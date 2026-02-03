import { writable } from 'svelte/store';

function safeParse(text) {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

function uid() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
		return crypto.randomUUID();
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
	const raw = window.localStorage.getItem('intel_custom_graphs_v1');
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

export function setCustomGraphs(clientId, graphs) {
	if (!clientId) return;
	customGraphsByClient.update((m) => ({ ...m, [clientId]: normalizeClientGraphs(graphs) }));
}

export async function loadCustomGraphs(clientId) {
	if (!clientId || typeof fetch === 'undefined') return;
	try {
		const res = await fetch(`/api/clients/${clientId}/custom-graphs`);
		const data = await res.json().catch(() => ({}));
		if (!res.ok) return;
		setCustomGraphs(clientId, data.items || []);
	} catch {
		// ignore network errors (mock/local fallback still shows existing state)
	}
}

export async function addCustomGraph(clientId, graphSpec) {
	if (!clientId || !graphSpec || typeof fetch === 'undefined') return;
	try {
		const res = await fetch(`/api/clients/${clientId}/custom-graphs`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ spec: graphSpec })
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) return;

		customGraphsByClient.update((m) => {
			const existing = normalizeClientGraphs(m[clientId]);
			return { ...m, [clientId]: [...existing, { id: data.id, spec: data.spec }] };
		});
	} catch {
		// ignore
	}
}

export async function removeCustomGraph(clientId, id) {
	if (!clientId || !id || typeof fetch === 'undefined') return;
	try {
		await fetch(`/api/clients/${clientId}/custom-graphs/${id}`, { method: 'DELETE' });
	} catch {
		// ignore
	}
	customGraphsByClient.update((m) => {
		const existing = normalizeClientGraphs(m[clientId]);
		const next = existing.filter((g) => g.id !== id);
		return { ...m, [clientId]: next };
	});
}
