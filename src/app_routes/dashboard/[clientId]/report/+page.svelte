<script>
	import { page } from '$app/stores';
	import {
		addDays,
		addMonths,
		endOfMonth,
		startOfMonth,
		todayIsoUtc
	} from '$lib/analytics/date.js';
	import GraphFromSpec from '$lib/components/ai/GraphFromSpec.svelte';
	import { customGraphsByClient } from '$lib/stores/customAnalysisGraphs.js';
	import {
		addReportItemAt,
		addReportItem,
		ensureReport,
		removeReportItem,
		placeReportItem,
		reportLayoutsByClient,
		setReportItemSpec,
		setReportItemSpan,
		setReportTitle
	} from '$lib/stores/reportLayouts.js';
	import DashboardCard from '$lib/components/ui/DashboardCard.svelte';

	const DEFAULT_END = addDays(todayIsoUtc(), -1);
	const DEFAULT_START = addDays(DEFAULT_END, -27);

	const clientId = $derived($page.params.clientId);

	let reportTitle = $state('Report');
	let items = $state([]);
	let customGraphs = $state([]);

	// Report-wide filters (applied to all cards for now).
	let preset = $state('last_28_days');
	let start = $state(DEFAULT_START);
	let end = $state(DEFAULT_END);
	let compareMode = $state('off');
	let granularity = $state('auto');

	let preview = $state(false);
	let addOpen = $state(false);
	let addTab = $state('standard'); // 'standard' | 'custom' | 'commentary'
	let addTargetRow = $state(0);
	let addTargetCol = $state(0);
	let addTargetSpan = $state(2);

	let dragId = $state('');
	let dropRow = $state(0);
	let dropCol = $state(0);
	let gridEl = $state(null);
	let resizingId = $state('');
	let resizeStartX = $state(0);
	let resizeStartSpan = $state(2);
	let resizePreviewSpan = $state(2);
	let resizePointerId = $state(null);
	let resizeStartCol = $state(1);
	let suppressDrag = $state(false);

	const STANDARD_CARDS = [
		{
			title: 'Sessions',
			spec: {
				version: 1,
				kind: 'time_series',
				title: 'Sessions',
				metric: 'sessions',
				metrics: null,
				dimension: null,
				chartType: 'line',
				range: null,
				compareMode: 'off',
				granularity: 'auto',
				limit: null
			}
		},
		{
			title: 'Engaged Sessions',
			spec: {
				version: 1,
				kind: 'time_series',
				title: 'Engaged Sessions',
				metric: 'engagedSessions',
				metrics: null,
				dimension: null,
				chartType: 'line',
				range: null,
				compareMode: 'off',
				granularity: 'auto',
				limit: null
			}
		},
		{
			title: 'Bounce Rate',
			spec: {
				version: 1,
				kind: 'time_series',
				title: 'Bounce Rate',
				metric: 'bounceRate',
				metrics: null,
				dimension: null,
				chartType: 'line',
				range: null,
				compareMode: 'off',
				granularity: 'auto',
				limit: null
			}
		},
		{
			title: 'Clicks',
			spec: {
				version: 1,
				kind: 'time_series',
				title: 'Clicks',
				metric: 'clicks',
				metrics: null,
				dimension: null,
				chartType: 'line',
				range: null,
				compareMode: 'off',
				granularity: 'auto',
				limit: null
			}
		},
		{
			title: 'Impressions',
			spec: {
				version: 1,
				kind: 'time_series',
				title: 'Impressions',
				metric: 'impressions',
				metrics: null,
				dimension: null,
				chartType: 'line',
				range: null,
				compareMode: 'off',
				granularity: 'auto',
				limit: null
			}
		},
		{
			title: 'CTR',
			spec: {
				version: 1,
				kind: 'time_series',
				title: 'CTR',
				metric: 'ctr',
				metrics: null,
				dimension: null,
				chartType: 'line',
				range: null,
				compareMode: 'off',
				granularity: 'auto',
				limit: null
			}
		},
		{
			title: 'Purchases',
			spec: {
				version: 1,
				kind: 'time_series',
				title: 'Purchases',
				metric: 'purchases',
				metrics: null,
				dimension: null,
				chartType: 'line',
				range: null,
				compareMode: 'off',
				granularity: 'auto',
				limit: null
			}
		},
		{
			title: 'Revenue',
			spec: {
				version: 1,
				kind: 'time_series',
				title: 'Revenue',
				metric: 'revenue',
				metrics: null,
				dimension: null,
				chartType: 'line',
				range: null,
				compareMode: 'off',
				granularity: 'auto',
				limit: null
			}
		},
		{
			title: 'Avg Purchase Value',
			spec: {
				version: 1,
				kind: 'time_series',
				title: 'Avg Purchase Value',
				metric: 'averagePurchaseValue',
				metrics: null,
				dimension: null,
				chartType: 'line',
				range: null,
				compareMode: 'off',
				granularity: 'auto',
				limit: null
			}
		},
		{
			title: 'Brand vs Non-brand (Clicks)',
			spec: {
				version: 1,
				kind: 'brand_split',
				title: 'Brand vs Non-brand (Clicks)',
				metric: 'clicks',
				metrics: null,
				dimension: null,
				chartType: 'stacked_area',
				range: null,
				compareMode: 'off',
				granularity: 'auto',
				limit: null
			}
		},
		{
			title: 'Top Pages (Sessions)',
			spec: {
				version: 1,
				kind: 'breakdown',
				title: 'Top Pages',
				metric: 'sessions',
				metrics: null,
				dimension: 'page',
				chartType: 'table',
				range: null,
				compareMode: 'off',
				granularity: 'auto',
				limit: 10
			}
		},
		{
			title: 'Top Queries (Clicks)',
			spec: {
				version: 1,
				kind: 'breakdown',
				title: 'Top Queries',
				metric: 'clicks',
				metrics: null,
				dimension: 'query',
				chartType: 'table',
				range: null,
				compareMode: 'off',
				granularity: 'auto',
				limit: 10
			}
		},
		{
			title: 'Referral Sources (Sessions)',
			spec: {
				version: 1,
				kind: 'breakdown',
				title: 'Referral Sources',
				metric: 'sessions',
				metrics: null,
				dimension: 'source',
				chartType: 'bar',
				range: null,
				compareMode: 'off',
				granularity: 'auto',
				limit: 10
			}
		}
	];

	const COMMENTARY_CARD = {
		version: 1,
		kind: 'commentary',
		title: 'Commentary',
		text: ''
	};

	const COLS = 4;

	const draggedItem = $derived(items.find((it) => it.id === dragId) || null);
	const dragSpan = $derived(Math.max(1, Math.min(4, Number(draggedItem?.span) || 2)));
	const maxRow = $derived(
		Math.max(
			1,
			...items.map((it) => {
				const n = Number(it?.row);
				return Number.isFinite(n) && n > 0 ? Math.round(n) : 1;
			})
		)
	);
	const dropRows = $derived(Math.max(6, maxRow + 3));
	const addRows = $derived(Math.max(3, maxRow + 2));

	function occupiedCells(list, excludeId) {
		const set = new Set();
		for (const it of list || []) {
			if (excludeId && it?.id === excludeId) continue;
			const row = Math.max(1, Math.round(Number(it?.row) || 1));
			const col = Math.max(1, Math.round(Number(it?.col) || 1));
			const span = Math.max(1, Math.min(4, Math.round(Number(it?.span) || 2)));
			for (let c = col; c < col + span; c += 1) set.add(`${row}:${c}`);
		}
		return set;
	}

	const occupied = $derived(occupiedCells(items, dragId));
	const occupiedAll = $derived(occupiedCells(items, null));

	function slotFits(row, col, span) {
		const s = Math.max(1, Math.min(4, Math.round(Number(span) || 1)));
		const r = Math.max(1, Math.round(Number(row) || 1));
		const c0 = Math.max(1, Math.round(Number(col) || 1));
		if (c0 > COLS - s + 1) return false;
		for (let c = c0; c < c0 + s; c += 1) {
			if (occupied.has(`${r}:${c}`)) return false;
		}
		return true;
	}

	function suggestSpanForSlot(row, col) {
		const r = Math.max(1, Math.round(Number(row) || 1));
		const c0 = Math.max(1, Math.round(Number(col) || 1));
		let space = 0;
		for (let c = c0; c <= COLS; c += 1) {
			if (occupiedAll.has(`${r}:${c}`)) break;
			space += 1;
		}
		return Math.max(1, Math.min(2, space));
	}

	function setPreset(next) {
		preset = next;

		const today = todayIsoUtc();
		const yesterday = addDays(today, -1);

		if (next === 'last_month') {
			const lastMonthStart = startOfMonth(addMonths(startOfMonth(today), -1));
			start = lastMonthStart;
			end = endOfMonth(lastMonthStart);
			granularity = 'daily';
			return;
		}

		if (next === 'last_quarter') {
			const { y, m } = (() => {
				const [yy, mm] = startOfMonth(today).split('-').map(Number);
				return { y: yy, m: mm };
			})();
			const qStartMonth = Math.floor((m - 1) / 3) * 3 + 1;
			const thisQuarterStart = `${y}-${String(qStartMonth).padStart(2, '0')}-01`;
			const lastQuarterStart = startOfMonth(addMonths(thisQuarterStart, -3));
			const lastQuarterEnd = endOfMonth(addMonths(lastQuarterStart, 2));
			start = lastQuarterStart;
			end = lastQuarterEnd;
			granularity = 'weekly';
			return;
		}

		if (next === 'last_6_months' || next === 'last_12_months' || next === 'last_16_months') {
			const months = next === 'last_6_months' ? 6 : next === 'last_12_months' ? 12 : 16;
			const endOfPrevMonth = endOfMonth(addMonths(startOfMonth(today), -1));
			const startMonth = startOfMonth(addMonths(startOfMonth(endOfPrevMonth), -(months - 1)));
			start = startMonth;
			end = endOfPrevMonth;
			granularity = 'monthly';
			return;
		}

		if (next === 'last_28_days') {
			start = addDays(yesterday, -27);
			end = yesterday;
			granularity = 'daily';
			return;
		}
	}

	function withReportFilters(spec) {
		if (!spec || typeof spec !== 'object') return spec;
		if (spec.kind === 'commentary') return spec;
		const range = { start, end };

		// kpi_split is a simple split; compare doesn't apply (yet).
		if (spec.kind === 'kpi_split') {
			return { ...spec, range, compareMode: 'off', granularity };
		}

		return { ...spec, range, compareMode, granularity };
	}

	function openAdd(tab, row = 0, col = 0) {
		addTab = tab || 'standard';
		addTargetRow = Number(row) || 0;
		addTargetCol = Number(col) || 0;
		addTargetSpan =
			addTargetRow && addTargetCol ? suggestSpanForSlot(addTargetRow, addTargetCol) : 2;
		addOpen = true;
	}

	function closeAdd() {
		addOpen = false;
		addTargetRow = 0;
		addTargetCol = 0;
		addTargetSpan = 2;
	}

	function addStandardCard(spec) {
		if (addTargetRow && addTargetCol) {
			addReportItemAt(clientId, spec, addTargetSpan, addTargetRow, addTargetCol);
		} else {
			addReportItem(clientId, spec);
		}
		closeAdd();
	}

	function addCustomCard(spec) {
		if (addTargetRow && addTargetCol) {
			addReportItemAt(clientId, spec, addTargetSpan, addTargetRow, addTargetCol);
		} else {
			addReportItem(clientId, spec);
		}
		closeAdd();
	}

	function addCommentaryCard() {
		if (addTargetRow && addTargetCol) {
			addReportItemAt(clientId, { ...COMMENTARY_CARD }, 1, addTargetRow, addTargetCol);
		} else {
			addReportItem(clientId, { ...COMMENTARY_CARD }, 1);
		}
		closeAdd();
	}

	function onDragStart(id, e) {
		dragId = id;
		dropRow = 0;
		dropCol = 0;
		try {
			e.dataTransfer.setData('text/plain', id);
			e.dataTransfer.effectAllowed = 'move';
		} catch {
			// ignore
		}
	}

	function onDragEnd() {
		dragId = '';
		dropRow = 0;
		dropCol = 0;
	}

	function onSlotOver(row, col, e) {
		e.preventDefault();
		dropRow = row;
		dropCol = col;
	}

	function onDropSlot(row, col, e) {
		e.preventDefault();
		const from = dragId || e.dataTransfer?.getData('text/plain') || '';
		if (from) placeReportItem(clientId, from, row, col);
		onDragEnd();
	}

	function colWidthPx() {
		const rect = gridEl?.getBoundingClientRect?.();
		if (!rect?.width) return 160;
		const gap = gridGapPx();
		return (rect.width - gap * 3) / 4;
	}

	function gridGapPx() {
		try {
			const cs = getComputedStyle(gridEl);
			const gap = parseFloat(cs.columnGap || cs.gap || '16');
			return Number.isFinite(gap) ? gap : 16;
		} catch {
			return 16;
		}
	}

	function colStepPx() {
		return colWidthPx() + gridGapPx();
	}

	function startResize(id, span, e) {
		if (preview) return;
		e.preventDefault();
		suppressDrag = true;
		resizingId = id;
		resizeStartX = e.clientX || 0;
		resizeStartSpan = Number(span) || 2;
		resizePreviewSpan = resizeStartSpan;
		resizePointerId = e.pointerId ?? null;

		const current = items.find((it) => it.id === id);
		resizeStartCol = Math.max(1, Math.min(4, Math.round(Number(current?.col) || 1)));

		try {
			document.body.style.cursor = 'ew-resize';
			document.body.style.userSelect = 'none';
		} catch {
			// ignore
		}
		try {
			e.currentTarget?.setPointerCapture?.(e.pointerId);
		} catch {
			// ignore
		}
	}

	function moveResize(id, e) {
		if (preview) return;
		if (!resizingId || resizingId !== id) return;
		const dx = (e.clientX || 0) - resizeStartX;
		const next = Math.max(1, Math.min(4, Math.round(resizeStartSpan + dx / colStepPx())));
		resizePreviewSpan = next;
		setReportItemSpan(clientId, id, next);
	}

	function endResize(id) {
		if (resizingId === id) {
			resizingId = '';
			resizePointerId = null;
			resizeStartCol = 1;
			resizePreviewSpan = 2;
			suppressDrag = false;
			try {
				document.body.style.cursor = '';
				document.body.style.userSelect = '';
			} catch {
				// ignore
			}
		}
	}

	function updateCommentary(id, nextText) {
		const current = items.find((it) => it.id === id);
		if (!current) return;
		setReportItemSpec(clientId, id, {
			...(current.spec || {}),
			kind: 'commentary',
			text: String(nextText || '')
		});
	}

	$effect(() => {
		if (!clientId) return;
		ensureReport(clientId);

		const id = clientId;
		const unsubReport = reportLayoutsByClient.subscribe((m) => {
			const meta = m?.[id] || { title: 'Report', items: [] };
			reportTitle = meta.title || 'Report';
			items = Array.isArray(meta.items) ? meta.items : [];
		});

		const unsubCustom = customGraphsByClient.subscribe((m) => {
			customGraphs = Array.isArray(m?.[id]) ? m[id] : [];
		});

		return () => {
			unsubReport();
			unsubCustom();
		};
	});
</script>

<svelte:window
	on:pointermove={(e) => {
		if (!resizingId) return;
		// If we captured a pointer id, ignore other pointers.
		if (resizePointerId != null && e.pointerId != null && e.pointerId !== resizePointerId) return;
		moveResize(resizingId, e);
	}}
	on:pointerup={() => {
		if (!resizingId) return;
		endResize(resizingId);
	}}
	on:pointercancel={() => {
		if (!resizingId) return;
		endResize(resizingId);
	}}
/>

<svelte:head>
	<title>Report</title>
</svelte:head>

<div class="space-y-5">
	<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="min-w-[240px]">
				<label class="mb-1 block text-xs font-semibold tracking-wide text-gray-500 uppercase">
					Report title
				</label>
				<input
					class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
					bind:value={reportTitle}
					on:blur={() => setReportTitle(clientId, reportTitle)}
				/>
				<div class="mt-1 text-xs text-gray-500">Phase 6: mock report builder UI.</div>
			</div>

			<div class="flex flex-wrap items-center gap-2">
				<button
					type="button"
					class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
					on:click={() => (preview = !preview)}
				>
					{preview ? 'Exit Preview' : 'Preview'}
				</button>
				<button
					type="button"
					class="rounded-lg bg-[var(--pi-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color-mix(in_oklch,var(--pi-primary)_92%,black)]"
					on:click={() => openAdd('standard')}
				>
					Add card
				</button>
				<button
					type="button"
					class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 opacity-60"
					disabled
					title="Coming soon"
				>
					Export PDF
				</button>
			</div>
		</div>

		<div class="mt-4 flex flex-wrap items-end gap-3">
			<div class="flex flex-wrap items-end gap-3">
				<div class="min-w-[210px]">
					<label
						class="mb-1 block text-[11px] font-semibold tracking-wide text-[var(--pi-muted)] uppercase"
					>
						Preset
					</label>
					<div class="relative">
						<select
							class="w-full appearance-none rounded-xl border border-[var(--pi-border)] bg-white px-3 py-2 pr-10 text-sm font-semibold text-gray-900 shadow-sm focus:border-transparent focus:ring-2 focus:ring-[var(--pi-focus)]"
							bind:value={preset}
							on:change={(e) => setPreset(e.currentTarget.value)}
						>
							<option value="last_28_days">Last 28 days</option>
							<option value="last_month">Last month</option>
							<option value="last_quarter">Last quarter</option>
							<option value="last_6_months">Last 6 months</option>
							<option value="last_12_months">Last 12 months</option>
							<option value="last_16_months">Last 16 months</option>
						</select>
						<span
							class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--pi-muted)]"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
								class="h-4 w-4"
							>
								<path
									fill-rule="evenodd"
									d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.24 4.5a.75.75 0 0 1-1.08 0l-4.24-4.5a.75.75 0 0 1 .02-1.06Z"
									clip-rule="evenodd"
								/>
							</svg>
						</span>
					</div>
				</div>

				<div>
					<label
						class="mb-1 block text-[11px] font-semibold tracking-wide text-[var(--pi-muted)] uppercase"
					>
						Start
					</label>
					<div class="relative">
						<span
							class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--pi-muted)]"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="h-4 w-4"
							>
								<path d="M8 2v4" />
								<path d="M16 2v4" />
								<path d="M3 10h18" />
								<path d="M4 6h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
							</svg>
						</span>
						<input
							type="date"
							class="w-[170px] rounded-xl border border-[var(--pi-border)] bg-white px-3 py-2 pl-9 text-sm font-semibold text-gray-900 shadow-sm focus:border-transparent focus:ring-2 focus:ring-[var(--pi-focus)]"
							bind:value={start}
						/>
					</div>
				</div>

				<div>
					<label
						class="mb-1 block text-[11px] font-semibold tracking-wide text-[var(--pi-muted)] uppercase"
					>
						End
					</label>
					<div class="relative">
						<span
							class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--pi-muted)]"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="h-4 w-4"
							>
								<path d="M8 2v4" />
								<path d="M16 2v4" />
								<path d="M3 10h18" />
								<path d="M4 6h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
							</svg>
						</span>
						<input
							type="date"
							class="w-[170px] rounded-xl border border-[var(--pi-border)] bg-white px-3 py-2 pl-9 text-sm font-semibold text-gray-900 shadow-sm focus:border-transparent focus:ring-2 focus:ring-[var(--pi-focus)]"
							bind:value={end}
						/>
					</div>
				</div>
			</div>
			<div class="flex flex-wrap items-end gap-3 sm:ml-auto">
				<div class="min-w-[190px]">
					<label
						class="mb-1 block text-[11px] font-semibold tracking-wide text-[var(--pi-muted)] uppercase"
					>
						Compare
					</label>
					<div
						class="inline-flex w-full rounded-xl bg-[var(--pi-surface-2)] p-1 ring-1 ring-[var(--pi-border)]"
					>
						<button
							type="button"
							class="flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
							class:bg-white={compareMode === 'off'}
							class:shadow-sm={compareMode === 'off'}
							class:text-gray-900={compareMode === 'off'}
							class:text-[var(--pi-muted)]={compareMode !== 'off'}
							class:hover:text-gray-900={compareMode !== 'off'}
							on:click={() => (compareMode = 'off')}
						>
							Off
						</button>
						<button
							type="button"
							class="flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
							class:bg-white={compareMode === 'mom'}
							class:shadow-sm={compareMode === 'mom'}
							class:text-gray-900={compareMode === 'mom'}
							class:text-[var(--pi-muted)]={compareMode !== 'mom'}
							class:hover:text-gray-900={compareMode !== 'mom'}
							on:click={() => (compareMode = 'mom')}
						>
							MoM
						</button>
						<button
							type="button"
							class="flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
							class:bg-white={compareMode === 'yoy'}
							class:shadow-sm={compareMode === 'yoy'}
							class:text-gray-900={compareMode === 'yoy'}
							class:text-[var(--pi-muted)]={compareMode !== 'yoy'}
							class:hover:text-gray-900={compareMode !== 'yoy'}
							on:click={() => (compareMode = 'yoy')}
						>
							YoY
						</button>
					</div>
				</div>

				<div class="min-w-[260px]">
					<label
						class="mb-1 block text-[11px] font-semibold tracking-wide text-[var(--pi-muted)] uppercase"
					>
						Granularity
					</label>
					<div
						class="inline-flex w-full rounded-xl bg-[var(--pi-surface-2)] p-1 ring-1 ring-[var(--pi-border)]"
					>
						<button
							type="button"
							class="flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
							class:bg-white={granularity === 'auto'}
							class:shadow-sm={granularity === 'auto'}
							class:text-gray-900={granularity === 'auto'}
							class:text-[var(--pi-muted)]={granularity !== 'auto'}
							class:hover:text-gray-900={granularity !== 'auto'}
							on:click={() => (granularity = 'auto')}
						>
							Auto
						</button>
						<button
							type="button"
							class="flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
							class:bg-white={granularity === 'daily'}
							class:shadow-sm={granularity === 'daily'}
							class:text-gray-900={granularity === 'daily'}
							class:text-[var(--pi-muted)]={granularity !== 'daily'}
							class:hover:text-gray-900={granularity !== 'daily'}
							on:click={() => (granularity = 'daily')}
						>
							Daily
						</button>
						<button
							type="button"
							class="flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
							class:bg-white={granularity === 'weekly'}
							class:shadow-sm={granularity === 'weekly'}
							class:text-gray-900={granularity === 'weekly'}
							class:text-[var(--pi-muted)]={granularity !== 'weekly'}
							class:hover:text-gray-900={granularity !== 'weekly'}
							on:click={() => (granularity = 'weekly')}
						>
							Weekly
						</button>
						<button
							type="button"
							class="flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
							class:bg-white={granularity === 'monthly'}
							class:shadow-sm={granularity === 'monthly'}
							class:text-gray-900={granularity === 'monthly'}
							class:text-[var(--pi-muted)]={granularity !== 'monthly'}
							class:hover:text-gray-900={granularity !== 'monthly'}
							on:click={() => (granularity = 'monthly')}
						>
							Monthly
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div
		bind:this={gridEl}
		class="relative grid grid-cols-4 gap-4"
		style="grid-auto-flow: row; grid-auto-rows: minmax(180px, auto);"
	>
		{#if resizingId}
			<!-- Faint 4-column overlay while resizing -->
			<div class="pointer-events-none absolute inset-0 grid grid-cols-4 gap-4 opacity-40">
				{#each Array(4) as _, i (i)}
					{@const col = i + 1}
					{@const isOn =
						col >= resizeStartCol && col < resizeStartCol + Math.max(1, resizePreviewSpan || 1)}
					<div
						class={`rounded-lg border border-dashed ${isOn ? 'border-[color-mix(in_oklch,var(--pi-primary)_60%,transparent)] bg-[color-mix(in_oklch,var(--pi-primary)_12%,transparent)]' : 'border-[color-mix(in_oklch,var(--pi-primary)_40%,transparent)] bg-[color-mix(in_oklch,var(--pi-primary)_6%,transparent)]'}`}
					/>
				{/each}
			</div>
		{/if}

		{#if dragId && !preview && !resizingId}
			<!-- Drop slots: only show where the dragged card can fit cleanly (no overlap). -->
			{#each Array(dropRows) as _, r (r)}
				{@const row = r + 1}
				{#each Array(COLS) as _, c (`${r}-${c}`)}
					{@const col = c + 1}
					{@const canDrop = slotFits(row, col, dragSpan)}
					{#if canDrop}
						<div
							class={`rounded-xl border border-dashed transition-colors ${
								dropRow === row && dropCol === col
									? 'border-[var(--pi-primary)] bg-[color-mix(in_oklch,var(--pi-primary)_10%,transparent)]'
									: 'border-gray-400 bg-white'
							}`}
							style={`grid-column: ${col} / span 1; grid-row: ${row};`}
							on:dragover={(e) => onSlotOver(row, col, e)}
							on:dragenter={(e) => onSlotOver(row, col, e)}
							on:drop={(e) => onDropSlot(row, col, e)}
						/>
					{/if}
				{/each}
			{/each}
		{/if}

		{#if !preview && !dragId && !resizingId}
			{#each Array(addRows) as _, r (r)}
				{@const row = r + 1}
				{#each Array(COLS) as _, c (`add-${r}-${c}`)}
					{@const col = c + 1}
					{#if !occupiedAll.has(`${row}:${col}`)}
						<button
							type="button"
							class="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-gray-400 bg-white text-sm font-semibold text-gray-700 hover:cursor-pointer hover:bg-gray-50"
							style={`grid-column: ${col} / span 1; grid-row: ${row};`}
							on:click={() => openAdd('standard', row, col)}
						>
							+ Add card
						</button>
					{/if}
				{/each}
			{/each}
		{/if}

		{#each items as it (it.id)}
			<div
				draggable={!preview && !resizingId && !suppressDrag}
				on:dragstart={(e) => {
					if (suppressDrag || resizingId) {
						e.preventDefault();
						return;
					}
					onDragStart(it.id, e);
				}}
				on:dragend={onDragEnd}
				class="group relative h-full rounded-xl transition-shadow hover:shadow-md"
				class:cursor-grab={!preview && !resizingId}
				class:active:cursor-grabbing={!preview && !resizingId}
				data-report-item-id={it.id}
				style={`grid-column: ${it.col || 1} / span ${it.span || 2}; grid-row: ${it.row || 1};`}
			>
				{#if it.spec?.kind === 'commentary'}
					<DashboardCard title={it.spec?.title || 'Commentary'} icon="file">
						<svelte:fragment slot="actions">
							{#if !preview}
								<button
									type="button"
									class="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
									on:click={() => removeReportItem(clientId, it.id)}
								>
									Remove
								</button>
							{/if}
						</svelte:fragment>

						{#if preview}
							<div class="text-sm whitespace-pre-wrap text-gray-800">{it.spec?.text || ''}</div>
						{:else}
							<textarea
								class="min-h-[180px] w-full resize-none rounded-lg border border-[var(--pi-border)] bg-white px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-[var(--pi-focus)]"
								placeholder="Write commentary…"
								value={it.spec?.text || ''}
								on:input={(e) => updateCommentary(it.id, e.currentTarget.value)}
							/>
						{/if}
					</DashboardCard>
				{:else}
					<GraphFromSpec {clientId} spec={withReportFilters(it.spec)}>
						<svelte:fragment slot="actions">
							{#if !preview}
								<button
									type="button"
									class="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
									on:click={() => removeReportItem(clientId, it.id)}
								>
									Remove
								</button>
							{/if}
						</svelte:fragment>
					</GraphFromSpec>
				{/if}

				{#if !preview}
					<div
						class="absolute top-1/2 right-0 z-10 hidden translate-x-1/2 -translate-y-1/2 items-center justify-center group-hover:flex"
						title="Drag to resize"
					>
						<button
							type="button"
							class="p-2"
							on:pointerdown|stopPropagation={(e) => startResize(it.id, it.span || 2, e)}
							on:click|stopPropagation={() => {}}
							aria-label="Resize card"
						>
							<span
								class="block h-2.5 w-2.5 cursor-ew-resize rounded-full bg-[var(--pi-primary)] shadow-sm"
							/>
						</button>
					</div>
				{/if}
			</div>
		{/each}

		{#if !preview && !dragId}
			<button
				type="button"
				class="col-span-4 flex min-h-[64px] items-center justify-center rounded-xl border border-dashed border-gray-400 bg-white text-sm font-semibold text-gray-700 hover:cursor-pointer hover:bg-gray-50"
				on:click={() => openAdd('standard')}
			>
				+ Add card
			</button>
		{/if}
	</div>
</div>

{#if addOpen && !preview}
	<div class="fixed inset-0 z-40" on:click={closeAdd} />
	<section
		class="fixed top-1/2 left-1/2 z-50 w-[780px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
		on:click|stopPropagation={() => {}}
	>
		<header class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
			<div class="min-w-0">
				<div class="text-sm font-semibold text-gray-900">Add card</div>
				<div class="text-xs text-gray-500">Choose a standard card or add a custom graph.</div>
			</div>
			<button
				type="button"
				class="rounded-md p-1 text-gray-500 hover:bg-gray-100"
				on:click={closeAdd}
			>
				×
			</button>
		</header>

		<div class="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
			<button
				type="button"
				class="rounded-lg px-3 py-2 text-sm font-semibold"
				class:bg-[var(--pi-primary)]={addTab === 'standard'}
				class:text-white={addTab === 'standard'}
				class:bg-gray-100={addTab !== 'standard'}
				class:text-gray-700={addTab !== 'standard'}
				on:click={() => (addTab = 'standard')}
			>
				Standard
			</button>
			<button
				type="button"
				class="rounded-lg px-3 py-2 text-sm font-semibold"
				class:bg-[var(--pi-primary)]={addTab === 'custom'}
				class:text-white={addTab === 'custom'}
				class:bg-gray-100={addTab !== 'custom'}
				class:text-gray-700={addTab !== 'custom'}
				on:click={() => (addTab = 'custom')}
			>
				Custom Analysis
			</button>
			<button
				type="button"
				class="rounded-lg px-3 py-2 text-sm font-semibold"
				class:bg-[var(--pi-primary)]={addTab === 'commentary'}
				class:text-white={addTab === 'commentary'}
				class:bg-gray-100={addTab !== 'commentary'}
				class:text-gray-700={addTab !== 'commentary'}
				on:click={() => (addTab = 'commentary')}
			>
				Commentary
			</button>
		</div>

		<div class="max-h-[60vh] overflow-auto p-5">
			{#if addTab === 'standard'}
				<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
					{#each STANDARD_CARDS as c (c.title)}
						<button
							type="button"
							class="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 text-left hover:bg-gray-50"
							on:click={() => addStandardCard(c.spec)}
						>
							<div class="text-sm font-semibold text-gray-900">{c.title}</div>
							<div class="mt-1 text-xs text-gray-600">Add to report</div>
						</button>
					{/each}
				</div>
			{:else if addTab === 'custom'}
				{#if customGraphs.length === 0}
					<div
						class="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-600"
					>
						No custom graphs found for this client yet. Use the chatbot or Custom Analysis tab to
						create some.
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
						{#each customGraphs as g (g.id)}
							<button
								type="button"
								class="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 text-left hover:bg-gray-50"
								on:click={() => addCustomCard(g.spec)}
							>
								<div class="text-sm font-semibold text-gray-900">
									{g.spec?.title || 'Custom graph'}
								</div>
								<div class="mt-1 text-xs text-gray-600">Add to report</div>
							</button>
						{/each}
					</div>
				{/if}
			{:else}
				<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
					<button
						type="button"
						class="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 text-left hover:bg-gray-50"
						on:click={addCommentaryCard}
					>
						<div class="text-sm font-semibold text-gray-900">Commentary</div>
						<div class="mt-1 text-xs text-gray-600">Add a free-text block to your report.</div>
					</button>
				</div>
			{/if}
		</div>
	</section>
{/if}
