import { writable } from 'svelte/store';

const STORAGE_KEY_V2 = 'intel_report_layouts_v2';
const STORAGE_KEY_V1 = 'intel_report_layouts_v1';
const COLS = 4;

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

function clamp(n, min, max) {
	return Math.max(min, Math.min(max, n));
}

function normalizeItems(arr) {
	if (!Array.isArray(arr)) return [];

	const raw = arr
		.map((item) => {
			// v2 item
			if (item && typeof item === 'object' && item.id && item.spec) {
				const span = normalizeSpan(item.span);
				const row = normalizeRow(item.row);
				const col = normalizeCol(item.col, span);
				return { ...item, span, row, col };
			}

			// v1 items were stored as either {id, spec, span} OR just a spec object
			if (item && typeof item === 'object') {
				return {
					id: item.id && item.spec ? String(item.id) : uid(),
					spec: item.spec ? item.spec : item,
					span: normalizeSpan(item.span),
					row: 0,
					col: 0
				};
			}

			return null;
		})
		.filter(Boolean);

	return stabilizeLayout(raw);
}

function normalizeSpan(span) {
	const n = Number(span);
	if (!Number.isFinite(n)) return 2;
	return Math.max(1, Math.min(4, Math.round(n)));
}

function normalizeRow(row) {
	const n = Number(row);
	if (!Number.isFinite(n)) return 0;
	return Math.max(0, Math.round(n));
}

function normalizeCol(col, span) {
	const n = Number(col);
	if (!Number.isFinite(n)) return 0;
	const maxCol = Math.max(1, COLS - normalizeSpan(span) + 1);
	return clamp(Math.round(n), 0, maxCol);
}

function canFit(occupied, row, col, span) {
	if (row < 1) return false;
	const maxCol = COLS - span + 1;
	if (col < 1 || col > maxCol) return false;
	for (let c = col; c < col + span; c += 1) {
		if (occupied.has(`${row}:${c}`)) return false;
	}
	return true;
}

function occupy(occupied, row, col, span, id) {
	for (let c = col; c < col + span; c += 1) {
		occupied.set(`${row}:${c}`, id);
	}
}

function findNextFit(occupied, startRow, span, preferredCol) {
	let row = Math.max(1, Number(startRow) || 1);
	const maxCol = COLS - span + 1;
	if (maxCol < 1) return { row, col: 1 };

	while (row < 500) {
		const pref = clamp(Number(preferredCol) || 1, 1, maxCol);

		if (canFit(occupied, row, pref, span)) return { row, col: pref };

		for (let col = 1; col <= maxCol; col += 1) {
			if (col === pref) continue;
			if (canFit(occupied, row, col, span)) return { row, col };
		}

		row += 1;
	}

	return { row: Math.max(1, Number(startRow) || 1), col: 1 };
}

function stabilizeLayout(items, lockedId = null) {
	const list = Array.isArray(items) ? items : [];
	const normalized = list.map((it) => ({
		id: String(it.id || uid()),
		spec: it.spec,
		span: normalizeSpan(it.span),
		row: normalizeRow(it.row),
		col: normalizeCol(it.col, normalizeSpan(it.span))
	}));

	const locked = lockedId ? normalized.find((it) => it.id === lockedId) : null;
	const ordered = locked ? [locked, ...normalized.filter((it) => it.id !== lockedId)] : normalized;

	const occupied = new Map();
	const placed = [];
	for (const it of ordered) {
		const span = normalizeSpan(it.span);
		let row = normalizeRow(it.row);
		let col = normalizeCol(it.col, span);

		// Items without a location (v1 migration) get packed.
		if (!row || !col) {
			const next = findNextFit(occupied, 1, span, 1);
			row = next.row;
			col = next.col;
		}

		// Keep item where it is if possible; otherwise push it down.
		if (!canFit(occupied, row, col, span)) {
			const next = findNextFit(occupied, row, span, col);
			row = next.row;
			col = next.col;
		}

		occupy(occupied, row, col, span, it.id);
		placed.push({ ...it, span, row, col });
	}

	if (!locked) return placed;

	// Restore original ordering.
	const map = new Map(placed.map((it) => [it.id, it]));
	return normalized.map((it) => map.get(it.id) || it);
}

function loadInitial() {
	if (typeof window === 'undefined') return {};

	// Prefer v2; fall back to v1 and migrate.
	const rawV2 = window.localStorage.getItem(STORAGE_KEY_V2);
	const rawV1 = window.localStorage.getItem(STORAGE_KEY_V1);
	const raw = rawV2 || rawV1;
	const parsed = raw ? safeParse(raw) : null;
	if (!parsed || typeof parsed !== 'object') return {};

	/** @type {Record<string, any>} */
	const next = {};
	for (const [clientId, value] of Object.entries(parsed)) {
		const items = normalizeItems(value?.items || value || []);
		const meta =
			value && typeof value === 'object' && !Array.isArray(value)
				? {
						title: String(value.title || 'Report').slice(0, 60),
						items
					}
				: { title: 'Report', items };
		next[clientId] = meta;
	}
	return next;
}

export const reportLayoutsByClient = writable(loadInitial());

const hydratedClients = new Set();
const skipSaveOnce = new Set();
const saveTimers = new Map();
const lastSaved = new Map();

function serializeMeta(meta) {
	return JSON.stringify({
		title: String(meta?.title || 'Report').slice(0, 60),
		items: normalizeItems(meta?.items || [])
	});
}

async function saveToServer(clientId, meta) {
	if (!clientId || typeof fetch === 'undefined') return;

	const json = serializeMeta(meta);
	if (lastSaved.get(clientId) === json) return;

	try {
		const payload = JSON.parse(json);
		const res = await fetch(`/api/clients/${clientId}/report-layout`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		if (res.ok) lastSaved.set(clientId, json);
	} catch {
		// ignore network errors
	}
}

function scheduleSave(clientId, meta) {
	if (!clientId || !hydratedClients.has(clientId)) return;
	if (skipSaveOnce.has(clientId)) {
		skipSaveOnce.delete(clientId);
		lastSaved.set(clientId, serializeMeta(meta));
		return;
	}

	const existing = saveTimers.get(clientId);
	if (existing) clearTimeout(existing);
	saveTimers.set(
		clientId,
		setTimeout(() => {
			saveTimers.delete(clientId);
			saveToServer(clientId, meta);
		}, 650)
	);
}

if (typeof window !== 'undefined') {
	reportLayoutsByClient.subscribe((value) => {
		for (const clientId of hydratedClients) {
			const meta = value?.[clientId];
			if (!meta) continue;
			scheduleSave(clientId, meta);
		}
	});
}

export function hydrateReportLayout(clientId, meta) {
	if (!clientId) return;
	hydratedClients.add(clientId);
	skipSaveOnce.add(clientId);
	reportLayoutsByClient.update((m) => ({
		...m,
		[clientId]: {
			title: String(meta?.title || 'Report').slice(0, 60),
			items: normalizeItems(meta?.items || [])
		}
	}));
}

export function ensureReport(clientId) {
	if (!clientId) return;
	reportLayoutsByClient.update((m) => {
		if (m[clientId]) return m;
		return { ...m, [clientId]: { title: 'Report', items: [] } };
	});
}

export function setReportTitle(clientId, title) {
	if (!clientId) return;
	reportLayoutsByClient.update((m) => ({
		...m,
		[clientId]: {
			...(m[clientId] || { title: 'Report', items: [] }),
			title: String(title || 'Report')
		}
	}));
}

export function addReportItem(clientId, spec, span = 2) {
	if (!clientId || !spec) return;
	const nextSpan = normalizeSpan(span);
	reportLayoutsByClient.update((m) => {
		const current = m[clientId] || { title: 'Report', items: [] };
		const items = normalizeItems(current.items);

		const occupied = new Map();
		for (const it of items) occupy(occupied, it.row, it.col, it.span, it.id);
		const nextPos = findNextFit(occupied, 1, nextSpan, 1);

		const nextItems = [
			...items,
			{ id: uid(), spec, span: nextSpan, row: nextPos.row, col: nextPos.col }
		];
		return { ...m, [clientId]: { ...current, items: nextItems } };
	});
}

export function addReportItemAt(clientId, spec, span = 2, row = 1, col = 1) {
	if (!clientId || !spec) return;
	const nextSpan = normalizeSpan(span);
	reportLayoutsByClient.update((m) => {
		const current = m[clientId] || { title: 'Report', items: [] };
		const items = normalizeItems(current.items);

		const id = uid();
		const nextRow = Math.max(1, Math.round(Number(row) || 1));
		const nextCol = clamp(Math.round(Number(col) || 1), 1, Math.max(1, COLS - nextSpan + 1));

		const nextItems = [...items, { id, spec, span: nextSpan, row: nextRow, col: nextCol }];
		return { ...m, [clientId]: { ...current, items: stabilizeLayout(nextItems, id) } };
	});
}

export function removeReportItem(clientId, id) {
	if (!clientId || !id) return;
	reportLayoutsByClient.update((m) => {
		const current = m[clientId] || { title: 'Report', items: [] };
		const items = normalizeItems(current.items).filter((it) => it.id !== id);
		return { ...m, [clientId]: { ...current, items } };
	});
}

export function reorderReportItems(clientId, fromId, toId) {
	if (!clientId || !fromId || !toId || fromId === toId) return;
	reportLayoutsByClient.update((m) => {
		const current = m[clientId] || { title: 'Report', items: [] };
		const items = normalizeItems(current.items);
		const fromIdx = items.findIndex((i) => i.id === fromId);
		const toIdx = items.findIndex((i) => i.id === toId);
		if (fromIdx < 0 || toIdx < 0) return m;
		const next = [...items];
		const [moved] = next.splice(fromIdx, 1);
		next.splice(toIdx, 0, moved);
		// Reordering alone shouldn't "backfill"; keep row/col as-is.
		return { ...m, [clientId]: { ...current, items: next } };
	});
}

export function setReportItemSpan(clientId, id, span) {
	if (!clientId || !id) return;
	const nextSpan = normalizeSpan(span);
	reportLayoutsByClient.update((m) => {
		const current = m[clientId] || { title: 'Report', items: [] };
		const items = normalizeItems(current.items).map((it) =>
			it.id === id ? { ...it, span: nextSpan } : it
		);
		const nextItems = stabilizeLayout(items, id);
		return { ...m, [clientId]: { ...current, items: nextItems } };
	});
}

export function setReportItemSpec(clientId, id, spec) {
	if (!clientId || !id) return;
	reportLayoutsByClient.update((m) => {
		const current = m[clientId] || { title: 'Report', items: [] };
		const items = normalizeItems(current.items).map((it) => (it.id === id ? { ...it, spec } : it));
		return { ...m, [clientId]: { ...current, items } };
	});
}

export function placeReportItem(clientId, id, row, col) {
	if (!clientId || !id) return;
	reportLayoutsByClient.update((m) => {
		const current = m[clientId] || { title: 'Report', items: [] };
		const items = normalizeItems(current.items);
		const idx = items.findIndex((it) => it.id === id);
		if (idx < 0) return m;

		const locked = items[idx];
		const nextSpan = normalizeSpan(locked.span);
		const nextRow = Math.max(1, Math.round(Number(row) || 1));
		const nextCol = clamp(Math.round(Number(col) || 1), 1, Math.max(1, COLS - nextSpan + 1));
		const nextItems = [...items];
		nextItems[idx] = { ...locked, row: nextRow, col: nextCol, span: nextSpan };

		return { ...m, [clientId]: { ...current, items: stabilizeLayout(nextItems, id) } };
	});
}
