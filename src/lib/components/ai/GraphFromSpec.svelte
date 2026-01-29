<script>
	import { METRIC_META } from '$lib/analytics/constants.js';
	import { normalizeMetricId } from '$lib/analytics/normalize.js';
	import {
		buildHorizontalBarOption,
		buildStackedSplitOption,
		buildTimeSeriesOption
	} from '$lib/analytics/echarts.js';
	import { formatMetricValue } from '$lib/analytics/format.js';
	import EChart from '$lib/components/charts/EChart.svelte';
	import DataTable from '$lib/components/ui/DataTable.svelte';
	import DashboardCard from '$lib/components/ui/DashboardCard.svelte';

	export let clientId = '';
	export let spec;

	let loading = false;
	let error = '';
	let data = null;
	let splitData = null;
	let multiSeries = null;

	function sumPoints(points) {
		if (!Array.isArray(points)) return 0;
		return points.reduce((s, p) => s + (Number(p?.value) || 0), 0);
	}

	function formatNumber(v) {
		return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(Number(v) || 0);
	}

	function buildPieOption({ title, seriesName, slices }) {
		const items = (slices || []).map((s) => ({ name: s.name, value: Number(s.value) || 0 }));
		const legendVertical = items.length > 4;

		return {
			color: ['#404b77', '#9aa4c7', '#d7c9b8', '#7b8bbf', '#b9c0db', '#e7dfd8'],
			tooltip: { trigger: 'item' },
			legend: legendVertical
				? { orient: 'vertical', left: 0, top: 'middle', itemGap: 10 }
				: { bottom: 0, left: 'center', itemGap: 10 },
			series: [
				{
					name: seriesName || title || '',
					type: 'pie',
					radius: ['42%', '70%'],
					center: legendVertical ? ['70%', '45%'] : ['50%', '45%'],
					avoidLabelOverlap: true,
					label: {
						show: true,
						formatter: (p) => `${p.name}: ${formatNumber(p.value)} (${p.percent}%)`
					},
					labelLine: { length: 14, length2: 10 },
					emphasis: { label: { show: true, fontWeight: 'bold' } },
					data: items
				}
			]
		};
	}

	function buildMultiLineOption({ title, series }) {
		const names = (series || []).map((s) => s.name);
		const dates = (series?.[0]?.points || []).map((p) => p.date);

		const twoAxes = (series || []).length === 2;
		const yAxis = twoAxes
			? [
					{ type: 'value', name: series[0]?.name || '', axisLabel: { color: '#6b7280' } },
					{ type: 'value', name: series[1]?.name || '', axisLabel: { color: '#6b7280' } }
				]
			: [{ type: 'value', axisLabel: { color: '#6b7280' } }];

		return {
			color: ['#404b77', '#9aa4c7', '#d7c9b8', '#7b8bbf'],
			tooltip: { trigger: 'axis' },
			legend: { top: 0, left: 'center', data: names },
			grid: { top: 40, left: 50, right: twoAxes ? 55 : 20, bottom: 20, containLabel: true },
			xAxis: { type: 'category', data: dates, axisLabel: { color: '#6b7280' } },
			yAxis,
			series: (series || []).map((s, idx) => ({
				name: s.name,
				type: 'line',
				smooth: true,
				showSymbol: false,
				yAxisIndex: twoAxes ? Math.min(idx, 1) : 0,
				data: (s.points || []).map((p) => p.value)
			}))
		};
	}

	function sourceLabelForMetric(metric) {
		const src = METRIC_META?.[metric]?.source;
		return src ? String(src).toUpperCase() : '';
	}

	function isValidBreakdownDimension(dimension) {
		return dimension === 'page' || dimension === 'query' || dimension === 'source';
	}

	async function load() {
		if (!clientId || !spec) return;
		loading = true;
		error = '';
		data = null;
		splitData = null;
		multiSeries = null;

		try {
			const metricId = normalizeMetricId(spec.metric);
			const range = spec.range || null;
			const start = range?.start || null;
			const end = range?.end || null;
			const compareMode = spec.compareMode || 'off';
			const granularity = spec.granularity || 'auto';

			if (spec.kind === 'kpi_split') {
				const metrics = Array.isArray(spec.metrics)
					? spec.metrics.map((m) => normalizeMetricId(m)).filter(Boolean).slice(0, 4)
					: [];
				if (metrics.length < 2) throw new Error('kpi_split requires `metrics` (2+ metric ids)');

				const requests = metrics.map((metric) => {
					const params = new URLSearchParams({ clientId, metric, compareMode: 'off', granularity });
					if (start) params.set('start', start);
					if (end) params.set('end', end);
					return fetch(`/api/analytics/time-series?${params.toString()}`).then(async (res) => {
						const json = await res.json().catch(() => null);
						if (!res.ok) throw new Error(json?.error || 'Request failed');
						return { metric, data: json };
					});
				});

				const results = await Promise.all(requests);
				splitData = results.map((r) => ({
					metric: r.metric,
					label: METRIC_META?.[r.metric]?.label || r.metric,
					unit: METRIC_META?.[r.metric]?.unit || 'number',
					source: METRIC_META?.[r.metric]?.source || null,
					value: r.data?.summary?.current ?? null
				}));
				return;
			}

			if (spec.kind === 'multi_time_series') {
				const metrics = Array.isArray(spec.metrics)
					? spec.metrics.map((m) => normalizeMetricId(m)).filter(Boolean).slice(0, 4)
					: [];
				if (metrics.length < 2) throw new Error('multi_time_series requires `metrics` (2+ metric ids)');

				const requests = metrics.map((metric) => {
					const params = new URLSearchParams({
						clientId,
						metric,
						compareMode,
						granularity
					});
					if (start) params.set('start', start);
					if (end) params.set('end', end);
					return fetch(`/api/analytics/time-series?${params.toString()}`).then(async (res) => {
						const json = await res.json().catch(() => null);
						if (!res.ok) throw new Error(json?.error || 'Request failed');
						return { metric, data: json };
					});
				});

				const results = await Promise.all(requests);
				multiSeries = results.map((r) => ({
					metric: r.metric,
					name: METRIC_META?.[r.metric]?.label || r.metric,
					unit: METRIC_META?.[r.metric]?.unit || 'number',
					source: METRIC_META?.[r.metric]?.source || null,
					points: r.data?.current?.points || []
				}));
				return;
			}

			if (spec.kind === 'time_series') {
				const params = new URLSearchParams({ clientId, metric: metricId, compareMode, granularity });
				if (start) params.set('start', start);
				if (end) params.set('end', end);
				const res = await fetch(`/api/analytics/time-series?${params.toString()}`);
				const json = await res.json();
				if (!res.ok) throw new Error(json?.error || 'Request failed');
				data = json;
				return;
			}

			if (spec.kind === 'brand_split') {
				const params = new URLSearchParams({ clientId, metric: metricId, compareMode, granularity });
				if (start) params.set('start', start);
				if (end) params.set('end', end);
				const res = await fetch(`/api/analytics/brand-split?${params.toString()}`);
				const json = await res.json();
				if (!res.ok) throw new Error(json?.error || 'Request failed');
				data = json;
				return;
			}

			if (spec.kind === 'breakdown') {
				const dimension = isValidBreakdownDimension(spec.dimension) ? spec.dimension : 'page';
				const params = new URLSearchParams({
					clientId,
					metric: metricId,
					dimension,
					limit: String(spec.limit || 10),
					compareMode
				});
				if (start) params.set('start', start);
				if (end) params.set('end', end);
				const res = await fetch(`/api/analytics/breakdown?${params.toString()}`);
				const json = await res.json();
				if (!res.ok) throw new Error(json?.error || 'Request failed');
				data = json;
				return;
			}

			throw new Error('Unsupported graph kind');
		} catch (e) {
			error = e?.message || 'Failed';
		} finally {
			loading = false;
		}
	}

	$: void load();
</script>

<DashboardCard
	title={spec?.title || 'Custom graph'}
	sourceLabel={spec?.kind === 'kpi_split' || spec?.kind === 'multi_time_series' ? '' : sourceLabelForMetric(spec?.metric)}
	kpiValue={
		spec?.kind === 'kpi_split' || spec?.kind === 'multi_time_series'
			? ''
			: data?.summary?.current != null
				? formatMetricValue(spec.metric, data.summary.current)
				: ''
	}
	compareMode={data?.compareMode || spec?.compareMode || 'off'}
	deltaPct={data?.summary?.deltaPct ?? null}
	{loading}
	{error}
>
	<svelte:fragment slot="actions">
		<slot name="actions" />
	</svelte:fragment>

	{#if spec?.kind === 'kpi_split'}
		{#if spec?.chartType !== 'pie'}
			<div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
				kpi_split currently supports pie charts only.
			</div>
		{:else}
			<EChart
				option={buildPieOption({
					title: spec?.title || 'Split',
					seriesName: 'Split',
					slices: (splitData || []).map((s) => ({ name: s.label, value: s.value || 0 }))
				})}
				height={320}
			/>
		{/if}
	{:else if spec?.kind === 'multi_time_series'}
		{#if spec?.chartType !== 'line'}
			<div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
				multi_time_series currently supports line charts only.
			</div>
		{:else}
			<EChart
				option={buildMultiLineOption({ title: spec?.title || 'Comparison', series: multiSeries || [] })}
				height={300}
			/>
		{/if}
	{:else if spec?.kind === 'time_series'}
		{#if spec?.chartType === 'pie'}
			<div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
				Pie charts aren’t supported for time series yet.
			</div>
		{:else}
			<EChart
				option={buildTimeSeriesOption({
					metric: spec.metric,
					currentPoints: data?.current?.points || [],
					comparePoints: data?.compare?.points || [],
					compareMode: data?.compareMode || 'off',
					granularity: data?.current?.granularity || spec?.granularity || 'auto'
				})}
				height={240}
			/>
		{/if}
	{:else if spec?.kind === 'brand_split'}
		{#if spec?.chartType === 'pie'}
			{@const brand = (data?.current?.segments || []).find((s) => s.key === 'brand') || null}
			{@const nonBrand = (data?.current?.segments || []).find((s) => s.key === 'nonBrand') || null}
			{@const brandTotal = sumPoints(brand?.points)}
			{@const nonBrandTotal = sumPoints(nonBrand?.points)}
			<EChart
				option={buildPieOption({
					title: spec?.title || 'Brand vs Non-brand',
					seriesName: 'Split',
					slices: [
						{ name: brand?.label || 'Brand', value: brandTotal },
						{ name: nonBrand?.label || 'Non-brand', value: nonBrandTotal }
					]
				})}
				height={320}
			/>
		{:else}
			<EChart
				option={buildStackedSplitOption({
					metric: spec.metric,
					currentSegments: data?.current?.segments || [],
					granularity: data?.current?.granularity || spec?.granularity || 'auto'
				})}
				height={260}
			/>
		{/if}
	{:else if spec?.kind === 'breakdown'}
		{#if spec?.chartType === 'table'}
			<DataTable
				columns={[
					{ key: 'key', label: String(spec.dimension || 'Key'), align: 'left' },
					{ key: 'valueLabel', label: METRIC_META?.[spec.metric]?.label || spec.metric, align: 'right' }
				]}
				rows={(data?.current?.rows || []).map((r) => ({
					key: r.key,
					valueLabel: formatMetricValue(spec.metric, r.value)
				}))}
			/>
		{:else if spec?.chartType === 'pie'}
			<EChart
				option={buildPieOption({
					title: spec?.title || 'Breakdown',
					seriesName: String(spec.dimension || 'Breakdown'),
					slices: (data?.current?.rows || []).slice(0, Math.min(10, Number(spec?.limit) || 10)).map((r) => ({
						name: r.key,
						value: r.value
					}))
				})}
				height={320}
			/>
		{:else}
			<EChart
				option={buildHorizontalBarOption({
					metric: spec.metric,
					rows: data?.current?.rows || []
				})}
				height={260}
			/>
		{/if}
	{/if}
</DashboardCard>
