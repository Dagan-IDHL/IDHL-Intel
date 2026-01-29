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
	import { buildTimeSeriesOption } from '$lib/analytics/echarts.js';
	import { formatMetricValue } from '$lib/analytics/format.js';
	import EChart from '$lib/components/charts/EChart.svelte';
	import CardGrid from '$lib/components/ui/CardGrid.svelte';
	import DashboardCard from '$lib/components/ui/DashboardCard.svelte';

	const DEFAULT_END = addDays(todayIsoUtc(), -1);
	const DEFAULT_START = addDays(DEFAULT_END, -27);

	const clientId = $derived($page.params.clientId);

	let start = $state(DEFAULT_START);
	let end = $state(DEFAULT_END);
	let compareMode = $state('mom');
	let granularity = $state('auto');
	let preset = $state('last_28_days');

	const cardMetrics = ['sessions', 'clicks', 'revenue', 'impressions', 'purchases'];

	let cards = $state(
		Object.fromEntries(cardMetrics.map((m) => [m, { loading: false, error: '', data: null }]))
	);

	function updateCard(metric, patch) {
		cards = { ...cards, [metric]: { ...cards[metric], ...patch } };
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

	$effect(() => {
		if (!clientId) return;

		// Ensure Svelte tracks these as dependencies (runes mode only tracks synchronous reads).
		const request = { clientId, start, end, compareMode, granularity };

		const controller = new AbortController();
		const timer = setTimeout(async () => {
			for (const metric of cardMetrics) updateCard(metric, { loading: true, error: '' });

			await Promise.all(
				cardMetrics.map(async (metric) => {
					try {
						const data = await loadMetric(metric, request, controller.signal);
						updateCard(metric, { data });
					} catch (e) {
						if (e?.name !== 'AbortError') updateCard(metric, { error: e?.message || 'Failed' });
					} finally {
						updateCard(metric, { loading: false });
					}
				})
			);
		}, 200);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});
</script>

<svelte:head>
	<title>Data</title>
</svelte:head>

<div class="space-y-5">
	<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
		<div class="flex flex-wrap items-end gap-3">
			<div class="min-w-[190px]">
				<label class="mb-1 block text-xs font-semibold tracking-wide text-gray-500 uppercase">
					Preset
				</label>
				<select
					class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
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
			</div>

			<div>
				<label class="mb-1 block text-xs font-semibold tracking-wide text-gray-500 uppercase">
					Start
				</label>
				<input
					type="date"
					class="rounded-lg border border-gray-300 px-3 py-2 text-sm"
					bind:value={start}
				/>
			</div>

			<div>
				<label class="mb-1 block text-xs font-semibold tracking-wide text-gray-500 uppercase">
					End
				</label>
				<input
					type="date"
					class="rounded-lg border border-gray-300 px-3 py-2 text-sm"
					bind:value={end}
				/>
			</div>

			<div class="min-w-[170px]">
				<label class="mb-1 block text-xs font-semibold tracking-wide text-gray-500 uppercase">
					Compare
				</label>
				<select
					class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
					bind:value={compareMode}
				>
					<option value="off">Off</option>
					<option value="mom">MoM</option>
					<option value="yoy">YoY</option>
				</select>
			</div>

			<div class="min-w-[170px]">
				<label class="mb-1 block text-xs font-semibold tracking-wide text-gray-500 uppercase">
					Granularity
				</label>
				<select
					class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
					bind:value={granularity}
				>
					<option value="auto">Auto</option>
					<option value="daily">Daily</option>
					<option value="weekly">Weekly</option>
					<option value="monthly">Monthly</option>
				</select>
			</div>
		</div>
	</div>

	<CardGrid cols={3}>
		{#each cardMetrics as metric (metric)}
			{@const state = cards[metric]}
			{@const data = state?.data}
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
				title={METRIC_META?.[metric]?.label || metric}
				sourceLabel={data?.current?.source ? data.current.source.toUpperCase() : ''}
				kpiValue={data ? formatMetricValue(metric, data.summary.current) : ''}
				compareMode={data?.compareMode || compareMode}
				deltaPct={data?.summary?.deltaPct ?? null}
				loading={state?.loading}
				error={state?.error}
			>
				<EChart {option} height={220} />
			</DashboardCard>
		{/each}
	</CardGrid>
</div>
