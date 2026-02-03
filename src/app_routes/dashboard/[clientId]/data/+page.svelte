<script>
	import { page } from '$app/stores';
	import { METRIC_META } from '$lib/analytics/constants.js';
	import {
		addDays,
		addMonths,
		endOfMonth,
		startOfMonth,
		todayIsoUtc
	} from '$lib/analytics/date.js';
	import { computeDelta } from '$lib/analytics/comparison.js';
	import {
		buildHorizontalBarOption,
		buildStackedSplitOption,
		buildTimeSeriesOption
	} from '$lib/analytics/echarts.js';
	import { formatDeltaPct, formatMetricValue } from '$lib/analytics/format.js';
	import CardAssistant from '$lib/components/ai/CardAssistant.svelte';
	import EChart from '$lib/components/charts/EChart.svelte';
	import CardGrid from '$lib/components/ui/CardGrid.svelte';
	import DataTable from '$lib/components/ui/DataTable.svelte';
	import DashboardCard from '$lib/components/ui/DashboardCard.svelte';
	import { dashboardContext } from '$lib/stores/dashboardContext.js';

	const DEFAULT_END = addDays(todayIsoUtc(), -1);
	const DEFAULT_START = addDays(DEFAULT_END, -27);

	const clientId = $derived($page.params.clientId);

	let start = $state(DEFAULT_START);
	let end = $state(DEFAULT_END);
	let compareMode = $state('mom');
	let granularity = $state('auto');
	let preset = $state('last_28_days');
	let prefsSeeded = $state(false);
	let prefsSaveTimer = null;

	$effect(() => {
		if (prefsSeeded) return;
		const p = $page.data?.prefs || {};
		if (typeof p?.preset === 'string') preset = p.preset;
		if (typeof p?.compareMode === 'string') compareMode = p.compareMode;
		if (typeof p?.granularity === 'string') granularity = p.granularity;
		prefsSeeded = true;
	});

	$effect(() => {
		if (!prefsSeeded) return;
		if (prefsSaveTimer) clearTimeout(prefsSaveTimer);
		prefsSaveTimer = setTimeout(async () => {
			try {
				await fetch('/api/me/preferences', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ prefs: { preset, compareMode, granularity } })
				});
			} catch {
				// ignore
			}
		}, 900);
	});

	const cardMetrics = [
		'sessions',
		'engagedSessions',
		'bounceRate',
		'clicks',
		'impressions',
		'ctr',
		'purchases',
		'revenue'
	];

	const cardIcons = {
		sessions: 'activity',
		engagedSessions: 'activity',
		bounceRate: 'trendDown',
		clicks: 'click',
		impressions: 'eye',
		ctr: 'percent',
		purchases: 'cart',
		revenue: 'dollar'
	};

	let cards = $state(
		Object.fromEntries(cardMetrics.map((m) => [m, { loading: false, error: '', data: null }]))
	);

	let brandSplit = $state({ loading: false, error: '', data: null });
	let breakdowns = $state({
		topPages: { loading: false, error: '', data: null },
		topQueries: { loading: false, error: '', data: null },
		referralSources: { loading: false, error: '', data: null }
	});

	function updateCard(metric, patch) {
		cards = { ...cards, [metric]: { ...cards[metric], ...patch } };
	}

	function updateBrandSplit(patch) {
		brandSplit = { ...brandSplit, ...patch };
	}

	function updateBreakdown(key, patch) {
		breakdowns = { ...breakdowns, [key]: { ...breakdowns[key], ...patch } };
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

		// Default: leave current start/end.
	}

	async function loadMetric(metric, request, signal) {
		const params = new URLSearchParams({
			clientId: request.clientId,
			metric,
			start: request.start,
			end: request.end,
			compareMode: request.compareMode,
			granularity: request.granularity
		});

		const res = await fetch(`/api/analytics/time-series?${params.toString()}`, { signal });
		const json = await res.json();
		if (!res.ok) throw new Error(json?.error || 'Request failed');
		return json;
	}

	async function loadBrandSplit(metric, request, signal) {
		const params = new URLSearchParams({
			clientId: request.clientId,
			metric,
			start: request.start,
			end: request.end,
			compareMode: request.compareMode,
			granularity: request.granularity
		});

		const res = await fetch(`/api/analytics/brand-split?${params.toString()}`, { signal });
		const json = await res.json();
		if (!res.ok) throw new Error(json?.error || 'Request failed');
		return json;
	}

	async function loadBreakdown({ metric, dimension, limit }, request, signal) {
		const params = new URLSearchParams({
			clientId: request.clientId,
			metric,
			dimension,
			limit: String(limit || 10),
			start: request.start,
			end: request.end,
			compareMode: request.compareMode
		});

		const res = await fetch(`/api/analytics/breakdown?${params.toString()}`, { signal });
		const json = await res.json();
		if (!res.ok) throw new Error(json?.error || 'Request failed');
		return json;
	}

	function formatShare(v) {
		if (v == null || Number.isNaN(v)) return '—';
		return new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 1 }).format(v);
	}

	function mergeBreakdownRows(currentRows, compareRows) {
		const compareByKey = new Map((compareRows || []).map((r) => [r.key, r]));
		return (currentRows || []).map((r) => {
			const c = compareByKey.get(r.key);
			const { deltaAbs, deltaPct } =
				c?.value != null ? computeDelta(r.value, c.value) : { deltaAbs: null, deltaPct: null };
			return {
				key: r.key,
				value: r.value,
				share: r.share,
				compareValue: c?.value ?? null,
				compareShare: c?.share ?? null,
				deltaAbs,
				deltaPct
			};
		});
	}

	function mergedRowsForBreakdown(data) {
		if (!data) return [];
		return mergeBreakdownRows(data.current?.rows || [], data.compare?.rows || []);
	}

	function trimPoints(points, max = 24) {
		if (!Array.isArray(points)) return [];
		if (points.length <= max) return points;
		return points.slice(points.length - max);
	}

	function buildTimeSeriesContext(metric, data) {
		if (!data) return null;
		const meta = METRIC_META?.[metric] || {};
		return {
			version: 1,
			kind: 'time_series',
			metric,
			metricLabel: meta.label || metric,
			unit: meta.unit || 'number',
			source: data.current?.source || null,
			compareMode: data.compareMode || 'off',
			range: data.current?.range || null,
			compareRange: data.compareRange || null,
			current: {
				total: data.summary?.current ?? null,
				granularity: data.current?.granularity || null,
				points: trimPoints(data.current?.points || [])
			},
			compare: data.compare
				? {
						total: data.summary?.compare ?? null,
						granularity: data.compare?.granularity || null,
						points: trimPoints(data.compare?.points || [])
					}
				: null,
			deltaAbs: data.summary?.deltaAbs ?? null,
			deltaPct: data.summary?.deltaPct ?? null,
			filters: { start, end, preset, granularity, compareMode }
		};
	}

	function buildBrandSplitContext(title, data) {
		if (!data) return null;
		return {
			version: 1,
			kind: 'brand_split',
			title,
			metric: data.metric,
			metricLabel: METRIC_META?.[data.metric]?.label || data.metric,
			unit: METRIC_META?.[data.metric]?.unit || 'number',
			source: data.current?.source || null,
			compareMode: data.compareMode || 'off',
			range: data.current?.range || null,
			compareRange: data.compareRange || null,
			current: {
				total: data.summary?.current ?? null,
				brandShare: data.summary?.currentBrandShare ?? null,
				segments: (data.current?.segments || []).map((s) => ({
					key: s.key,
					label: s.label,
					points: trimPoints(s.points || [])
				}))
			},
			compare: data.compare
				? {
						total: data.summary?.compare ?? null,
						brandShare: data.summary?.compareBrandShare ?? null,
						segments: (data.compare?.segments || []).map((s) => ({
							key: s.key,
							label: s.label,
							points: trimPoints(s.points || [])
						}))
					}
				: null,
			deltaAbs: data.summary?.deltaAbs ?? null,
			deltaPct: data.summary?.deltaPct ?? null,
			brandShareDeltaAbs: data.summary?.brandShareDeltaAbs ?? null,
			brandShareDeltaPct: data.summary?.brandShareDeltaPct ?? null,
			filters: { start, end, preset, granularity, compareMode }
		};
	}

	function buildBreakdownContext({ title, metric, dimension, data, mergedRows }) {
		if (!data) return null;
		const meta = METRIC_META?.[metric] || {};
		return {
			version: 1,
			kind: 'breakdown',
			title,
			metric,
			metricLabel: meta.label || metric,
			unit: meta.unit || 'number',
			dimension,
			source: data.current?.source || null,
			compareMode: data.compareMode || 'off',
			range: data.current?.range || null,
			compareRange: data.compareRange || null,
			currentTotal: data.current?.total ?? null,
			compareTotal: data.compare?.total ?? null,
			rows: (mergedRows || []).slice(0, 12).map((r) => ({
				key: r.key,
				value: r.value,
				share: r.share,
				compareValue: r.compareValue,
				compareShare: r.compareShare,
				deltaAbs: r.deltaAbs,
				deltaPct: r.deltaPct
			})),
			filters: { start, end, preset, compareMode }
		};
	}

	$effect(() => {
		if (!clientId) return;

		// Ensure Svelte tracks these as dependencies (runes mode only tracks synchronous reads).
		const request = { clientId, start, end, compareMode, granularity };

		const controller = new AbortController();
		const timer = setTimeout(async () => {
			for (const metric of cardMetrics) updateCard(metric, { loading: true, error: '' });
			updateBrandSplit({ loading: true, error: '' });
			updateBreakdown('topPages', { loading: true, error: '' });
			updateBreakdown('topQueries', { loading: true, error: '' });
			updateBreakdown('referralSources', { loading: true, error: '' });

			await Promise.all([
				...cardMetrics.map(async (metric) => {
					try {
						const data = await loadMetric(metric, request, controller.signal);
						updateCard(metric, { data });
					} catch (e) {
						if (e?.name !== 'AbortError') updateCard(metric, { error: e?.message || 'Failed' });
					} finally {
						updateCard(metric, { loading: false });
					}
				}),
				(async () => {
					try {
						const data = await loadBrandSplit('clicks', request, controller.signal);
						updateBrandSplit({ data });
					} catch (e) {
						if (e?.name !== 'AbortError') updateBrandSplit({ error: e?.message || 'Failed' });
					} finally {
						updateBrandSplit({ loading: false });
					}
				})(),
				(async () => {
					try {
						const data = await loadBreakdown(
							{ metric: 'sessions', dimension: 'page', limit: 8 },
							request,
							controller.signal
						);
						updateBreakdown('topPages', { data });
					} catch (e) {
						if (e?.name !== 'AbortError')
							updateBreakdown('topPages', { error: e?.message || 'Failed' });
					} finally {
						updateBreakdown('topPages', { loading: false });
					}
				})(),
				(async () => {
					try {
						const data = await loadBreakdown(
							{ metric: 'clicks', dimension: 'query', limit: 10 },
							request,
							controller.signal
						);
						updateBreakdown('topQueries', { data });
					} catch (e) {
						if (e?.name !== 'AbortError')
							updateBreakdown('topQueries', { error: e?.message || 'Failed' });
					} finally {
						updateBreakdown('topQueries', { loading: false });
					}
				})(),
				(async () => {
					try {
						const data = await loadBreakdown(
							{ metric: 'sessions', dimension: 'source', limit: 8 },
							request,
							controller.signal
						);
						updateBreakdown('referralSources', { data });
					} catch (e) {
						if (e?.name !== 'AbortError')
							updateBreakdown('referralSources', { error: e?.message || 'Failed' });
					} finally {
						updateBreakdown('referralSources', { loading: false });
					}
				})()
			]);
		}, 200);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});

	$effect(() => {
		if (!clientId) return;

		const kpis = Object.fromEntries(
			cardMetrics.map((metric) => {
				const data = cards?.[metric]?.data || null;
				return [
					metric,
					data
						? {
								label: METRIC_META?.[metric]?.label || metric,
								unit: METRIC_META?.[metric]?.unit || 'number',
								source: data.current?.source || null,
								current: data.summary?.current ?? null,
								compare: data.summary?.compare ?? null,
								deltaAbs: data.summary?.deltaAbs ?? null,
								deltaPct: data.summary?.deltaPct ?? null
							}
						: null
				];
			})
		);

		const timeSeries = Object.fromEntries(
			cardMetrics.map((metric) => {
				const data = cards?.[metric]?.data || null;
				return [
					metric,
					data
						? {
								label: METRIC_META?.[metric]?.label || metric,
								unit: METRIC_META?.[metric]?.unit || 'number',
								source: data.current?.source || null,
								granularity: data.current?.granularity || null,
								range: data.current?.range || null,
								compareMode: data.compareMode || 'off',
								compareRange: data.compareRange || null,
								points: trimPoints(data.current?.points || []),
								comparePoints: trimPoints(data.compare?.points || [])
							}
						: null
				];
			})
		);

		const breakdownTop = (rows, metric) =>
			(rows || [])
				.slice(0, 5)
				.map((r) => ({ key: r.key, value: r.value, unit: METRIC_META?.[metric]?.unit }));

		dashboardContext.set({
			clientId,
			filters: { start, end, preset, compareMode, granularity },
			kpis,
			timeSeries,
			breakdowns: {
				topPages: breakdowns.topPages.data
					? breakdownTop(breakdowns.topPages.data.current?.rows, 'sessions')
					: [],
				topQueries: breakdowns.topQueries.data
					? breakdownTop(breakdowns.topQueries.data.current?.rows, 'clicks')
					: [],
				referralSources: breakdowns.referralSources.data
					? breakdownTop(breakdowns.referralSources.data.current?.rows, 'sessions')
					: []
			},
			brandSplit: brandSplit.data
				? {
						metric: brandSplit.data.metric,
						current: brandSplit.data.summary?.current ?? null,
						currentBrandShare: brandSplit.data.summary?.currentBrandShare ?? null,
						deltaPct: brandSplit.data.summary?.deltaPct ?? null
					}
				: null,
			updatedAt: Date.now()
		});
	});
</script>

<svelte:head>
	<title>Data</title>
</svelte:head>

<div class="space-y-5">
	<div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
		<div class="flex flex-wrap items-end gap-3">
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

	<CardGrid cols={3}>
		{#each cardMetrics as metric (metric)}
			{@const state = cards[metric]}
			{@const data = state?.data}
			{@const aiContext = buildTimeSeriesContext(metric, data)}
			{@const option = data
				? buildTimeSeriesOption({
						metric,
						currentPoints: data.current?.points || [],
						comparePoints: data.compare?.points || [],
						compareMode: data.compareMode || 'off',
						granularity: data.current?.granularity || granularity
					})
				: {}}
			<DashboardCard
				icon={cardIcons[metric] || ''}
				title={METRIC_META?.[metric]?.label || metric}
				sourceLabel={data?.current?.source ? data.current.source.toUpperCase() : ''}
				kpiValue={data ? formatMetricValue(metric, data.summary.current) : ''}
				compareMode={data?.compareMode || compareMode}
				deltaPct={data?.summary?.deltaPct ?? null}
				loading={state?.loading}
				error={state?.error}
			>
				<CardAssistant
					slot="actions"
					title={METRIC_META?.[metric]?.label || metric}
					context={aiContext}
					disabled={!aiContext || state?.loading || !!state?.error}
				/>
				<EChart {option} height={220} />
			</DashboardCard>
		{/each}
	</CardGrid>

	<CardGrid cols={2}>
		<div class="md:col-span-2">
			<DashboardCard
				icon="percent"
				title="Brand vs Non-brand (Clicks)"
				sourceLabel="GSC"
				kpiValue={brandSplit.data
					? formatMetricValue('clicks', brandSplit.data.summary?.current)
					: ''}
				compareMode={brandSplit.data?.compareMode || compareMode}
				deltaPct={brandSplit.data?.summary?.deltaPct ?? null}
				loading={brandSplit.loading}
				error={brandSplit.error}
				deltaAbsLabel={brandSplit.data?.summary?.currentBrandShare != null
					? `Brand share: ${formatShare(brandSplit.data.summary.currentBrandShare)}`
					: ''}
			>
				<CardAssistant
					slot="actions"
					title="Brand vs Non-brand (Clicks)"
					context={buildBrandSplitContext('Brand vs Non-brand (Clicks)', brandSplit.data)}
					disabled={!brandSplit.data || brandSplit.loading || !!brandSplit.error}
				/>
				<EChart
					option={brandSplit.data
						? buildStackedSplitOption({
								metric: brandSplit.data.metric,
								currentSegments: brandSplit.data.current?.segments || [],
								granularity: brandSplit.data.current?.granularity || granularity
							})
						: {}}
					height={260}
				/>
			</DashboardCard>
		</div>

		<div>
			<DashboardCard
				icon="users"
				title="Referral Sources"
				sourceLabel="GA4"
				kpiValue={breakdowns.referralSources.data
					? formatMetricValue('sessions', breakdowns.referralSources.data.summary?.current)
					: ''}
				compareMode={breakdowns.referralSources.data?.compareMode || compareMode}
				deltaPct={breakdowns.referralSources.data?.summary?.deltaPct ?? null}
				loading={breakdowns.referralSources.loading}
				error={breakdowns.referralSources.error}
			>
				<CardAssistant
					slot="actions"
					title="Referral Sources"
					context={breakdowns.referralSources.data
						? buildBreakdownContext({
								title: 'Referral Sources',
								metric: 'sessions',
								dimension: 'source',
								data: breakdowns.referralSources.data,
								mergedRows: mergedRowsForBreakdown(breakdowns.referralSources.data)
							})
						: null}
					disabled={!breakdowns.referralSources.data ||
						breakdowns.referralSources.loading ||
						!!breakdowns.referralSources.error}
				/>
				<EChart
					option={breakdowns.referralSources.data
						? buildHorizontalBarOption({
								metric: 'sessions',
								rows: breakdowns.referralSources.data.current?.rows || []
							})
						: {}}
					height={260}
				/>
			</DashboardCard>
		</div>

		<div>
			<DashboardCard
				icon="file"
				title="Top Pages"
				sourceLabel="GA4"
				kpiValue={breakdowns.topPages.data
					? formatMetricValue('sessions', breakdowns.topPages.data.summary?.current)
					: ''}
				compareMode={breakdowns.topPages.data?.compareMode || compareMode}
				deltaPct={breakdowns.topPages.data?.summary?.deltaPct ?? null}
				loading={breakdowns.topPages.loading}
				error={breakdowns.topPages.error}
			>
				<CardAssistant
					slot="actions"
					title="Top Pages"
					context={breakdowns.topPages.data
						? buildBreakdownContext({
								title: 'Top Pages',
								metric: 'sessions',
								dimension: 'page',
								data: breakdowns.topPages.data,
								mergedRows: mergedRowsForBreakdown(breakdowns.topPages.data)
							})
						: null}
					disabled={!breakdowns.topPages.data ||
						breakdowns.topPages.loading ||
						!!breakdowns.topPages.error}
				/>
				<DataTable
					columns={[
						{ key: 'key', label: 'Page', align: 'left' },
						{ key: 'valueLabel', label: 'Sessions', align: 'right' },
						{ key: 'shareLabel', label: 'Share', align: 'right' },
						...(compareMode !== 'off' ? [{ key: 'deltaLabel', label: 'Δ', align: 'right' }] : [])
					]}
					rows={mergedRowsForBreakdown(breakdowns.topPages.data).map((r) => ({
						key: r.key,
						valueLabel: formatMetricValue('sessions', r.value),
						shareLabel: formatShare(r.share),
						deltaLabel: compareMode === 'off' ? '' : formatDeltaPct(r.deltaPct)
					}))}
				/>
			</DashboardCard>
		</div>

		<div>
			<DashboardCard
				icon="search"
				title="Top Queries"
				sourceLabel="GSC"
				kpiValue={breakdowns.topQueries.data
					? formatMetricValue('clicks', breakdowns.topQueries.data.summary?.current)
					: ''}
				compareMode={breakdowns.topQueries.data?.compareMode || compareMode}
				deltaPct={breakdowns.topQueries.data?.summary?.deltaPct ?? null}
				loading={breakdowns.topQueries.loading}
				error={breakdowns.topQueries.error}
			>
				<CardAssistant
					slot="actions"
					title="Top Queries"
					context={breakdowns.topQueries.data
						? buildBreakdownContext({
								title: 'Top Queries',
								metric: 'clicks',
								dimension: 'query',
								data: breakdowns.topQueries.data,
								mergedRows: mergedRowsForBreakdown(breakdowns.topQueries.data)
							})
						: null}
					disabled={!breakdowns.topQueries.data ||
						breakdowns.topQueries.loading ||
						!!breakdowns.topQueries.error}
				/>
				<DataTable
					columns={[
						{ key: 'key', label: 'Query', align: 'left' },
						{ key: 'valueLabel', label: 'Clicks', align: 'right' },
						{ key: 'shareLabel', label: 'Share', align: 'right' },
						...(compareMode !== 'off' ? [{ key: 'deltaLabel', label: 'Δ', align: 'right' }] : [])
					]}
					rows={mergedRowsForBreakdown(breakdowns.topQueries.data).map((r) => ({
						key: r.key,
						valueLabel: formatMetricValue('clicks', r.value),
						shareLabel: formatShare(r.share),
						deltaLabel: compareMode === 'off' ? '' : formatDeltaPct(r.deltaPct)
					}))}
				/>
			</DashboardCard>
		</div>
	</CardGrid>
</div>
