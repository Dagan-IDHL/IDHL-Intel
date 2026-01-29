<script>
	import { METRIC_META } from '$lib/analytics/constants.js';
	import {
		addDays,
		addMonths,
		endOfMonth,
		startOfMonth,
		todayIsoUtc
	} from '$lib/analytics/date.js';
	import { buildTimeSeriesOption } from '$lib/analytics/echarts.js';
	import { formatDeltaPct, formatMetricValue } from '$lib/analytics/format.js';
	import EChart from '$lib/components/charts/EChart.svelte';
	import CardGrid from '$lib/components/ui/CardGrid.svelte';
	import DashboardCard from '$lib/components/ui/DashboardCard.svelte';
	import DataTable from '$lib/components/ui/DataTable.svelte';

	const DEFAULT_END = addDays(todayIsoUtc(), -1);
	const DEFAULT_START = addDays(DEFAULT_END, -27);

	let clientId = $state('mock-client');
	let metric = $state('sessions');
	let start = $state(DEFAULT_START);
	let end = $state(DEFAULT_END);
	let compareMode = $state('off');
	let granularity = $state('auto');
	let preset = $state('last_28_days');

	let loading = $state(false);
	let error = $state('');
	let data = $state(null);

	function applyPreset(key) {
		const today = todayIsoUtc();
		const yesterday = addDays(today, -1);

		if (key === 'last_28_days') {
			start = addDays(yesterday, -27);
			end = yesterday;
			granularity = 'daily';
			return;
		}

		if (key === 'last_month') {
			const lastMonthStart = startOfMonth(addMonths(startOfMonth(today), -1));
			start = lastMonthStart;
			end = endOfMonth(lastMonthStart);
			granularity = 'daily';
			return;
		}

		if (key === 'last_quarter') {
			const [yy, mm] = startOfMonth(today).split('-').map(Number);
			const qStartMonth = Math.floor((mm - 1) / 3) * 3 + 1;
			const thisQuarterStart = `${yy}-${String(qStartMonth).padStart(2, '0')}-01`;
			const lastQuarterStart = startOfMonth(addMonths(thisQuarterStart, -3));
			start = lastQuarterStart;
			end = endOfMonth(addMonths(lastQuarterStart, 2));
			granularity = 'weekly';
			return;
		}

		if (key === 'last_6_months' || key === 'last_12_months' || key === 'last_16_months') {
			const months = key === 'last_6_months' ? 6 : key === 'last_12_months' ? 12 : 16;
			const endOfPrevMonth = endOfMonth(addMonths(startOfMonth(today), -1));
			start = startOfMonth(addMonths(startOfMonth(endOfPrevMonth), -(months - 1)));
			end = endOfPrevMonth;
			granularity = 'monthly';
			return;
		}

		if (key === 'this_month') {
			start = startOfMonth(today);
			end = yesterday;
			granularity = 'daily';
		}
	}

	const chartOption = $derived.by(() => {
		if (!data) return {};
		return buildTimeSeriesOption({
			metric,
			currentPoints: data.current?.points || [],
			comparePoints: data.compare?.points || [],
			compareMode: data.compareMode || 'off',
			granularity: data.current?.granularity || granularity
		});
	});

	const recentRows = $derived.by(() => {
		if (!data?.current?.points) return [];
		const points = data.current.points.slice(-10).reverse();
		return points.map((p) => ({
			date: p.date,
			value: formatMetricValue(metric, p.value)
		}));
	});

	const compareRows = $derived.by(() => {
		if (!data?.compare?.points) return [];
		const points = data.compare.points.slice(-10).reverse();
		return points.map((p) => ({
			date: p.date,
			value: formatMetricValue(metric, p.value)
		}));
	});

	$effect(() => {
		const meta = METRIC_META[metric];
		if (!meta) return;
		if (!start || !end) return;

		// Ensure Svelte tracks these as dependencies (runes mode only tracks synchronous reads).
		const request = { clientId, metric, start, end, compareMode, granularity };

		loading = true;
		error = '';

		const controller = new AbortController();
		const timer = setTimeout(async () => {
			try {
				const params = new URLSearchParams({
					clientId: request.clientId,
					metric: request.metric,
					start: request.start,
					end: request.end,
					compareMode: request.compareMode,
					granularity: request.granularity
				});

				const res = await fetch(`/api/analytics/time-series?${params.toString()}`, {
					signal: controller.signal
				});
				const json = await res.json();
				if (!res.ok) throw new Error(json?.error || 'Request failed');
				data = json;
			} catch (e) {
				if (e?.name !== 'AbortError') error = e?.message || 'Failed to load analytics';
			} finally {
				loading = false;
			}
		}, 250);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});
</script>

<div class="space-y-4">
	<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
		<div class="flex flex-wrap items-end gap-3">
			<div class="min-w-[180px]">
				<label class="mb-1 block text-xs font-semibold tracking-wide text-gray-500 uppercase"
					>Preset</label
				>
				<select
					class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
					bind:value={preset}
					on:change={(e) => applyPreset(e.currentTarget.value)}
				>
					<option value="last_28_days">Last 28 days</option>
					<option value="last_month">Last month</option>
					<option value="last_quarter">Last quarter</option>
					<option value="last_6_months">Last 6 months</option>
					<option value="last_12_months">Last 12 months</option>
					<option value="last_16_months">Last 16 months</option>
					<option value="this_month">This month to date</option>
				</select>
			</div>

			<div>
				<label class="mb-1 block text-xs font-semibold tracking-wide text-gray-500 uppercase"
					>Start</label
				>
				<input
					type="date"
					class="rounded-lg border border-gray-300 px-3 py-2 text-sm"
					bind:value={start}
				/>
			</div>

			<div>
				<label class="mb-1 block text-xs font-semibold tracking-wide text-gray-500 uppercase"
					>End</label
				>
				<input
					type="date"
					class="rounded-lg border border-gray-300 px-3 py-2 text-sm"
					bind:value={end}
				/>
			</div>

			<div class="min-w-[220px]">
				<label class="mb-1 block text-xs font-semibold tracking-wide text-gray-500 uppercase"
					>Metric</label
				>
				<select
					class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
					bind:value={metric}
				>
					{#each Object.entries(METRIC_META) as [key, meta]}
						<option value={key}>{meta.label}</option>
					{/each}
				</select>
			</div>

			<div class="min-w-[170px]">
				<label class="mb-1 block text-xs font-semibold tracking-wide text-gray-500 uppercase"
					>Compare</label
				>
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
				<label class="mb-1 block text-xs font-semibold tracking-wide text-gray-500 uppercase"
					>Granularity</label
				>
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

			<div class="ml-auto flex items-center gap-2 text-sm">
				{#if loading}
					<div class="inline-flex items-center gap-2 text-gray-600">
						<span class="inline-block h-2 w-2 animate-pulse rounded-full bg-gray-400"></span>
						Loading…
					</div>
				{:else if error}
					<div class="text-red-600">{error}</div>
				{:else if data}
					<div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
						<span class="font-semibold text-gray-900"
							>{formatMetricValue(metric, data.summary.current)}</span
						>
						{#if data.compareMode !== 'off'}
							<span class="ml-2 text-gray-600">({formatDeltaPct(data.summary.deltaPct)})</span>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<CardGrid cols={2}>
		<DashboardCard
			title={METRIC_META[metric].label}
			sourceLabel={data?.current?.source ? data.current.source.toUpperCase() : ''}
			kpiValue={data ? formatMetricValue(metric, data.summary.current) : ''}
			compareMode={data?.compareMode || 'off'}
			deltaPct={data?.summary?.deltaPct ?? null}
			deltaAbsLabel={data?.compareMode && data.compareMode !== 'off'
				? `vs ${data.compareMode.toUpperCase()}`
				: ''}
			{loading}
			{error}
		>
			<EChart option={chartOption} height={260} />
		</DashboardCard>

		<DashboardCard
			title="Recent Points"
			sourceLabel={data?.current?.source ? data.current.source.toUpperCase() : ''}
			kpiValue=""
			compareMode="off"
			{loading}
			{error}
		>
			<div class="space-y-3">
				<div>
					<div class="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
						Current
					</div>
					<DataTable
						columns={[
							{ key: 'date', label: 'Date' },
							{ key: 'value', label: 'Value', align: 'right' }
						]}
						rows={recentRows}
					/>
				</div>

				{#if data && data.compareMode !== 'off'}
					<div>
						<div class="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
							{data.compareMode === 'yoy' ? 'YoY' : 'MoM'}
						</div>
						<DataTable
							columns={[
								{ key: 'date', label: 'Date' },
								{ key: 'value', label: 'Value', align: 'right' }
							]}
							rows={compareRows}
							emptyLabel="No compare data"
						/>
					</div>
				{/if}
			</div>
		</DashboardCard>
	</CardGrid>
</div>
