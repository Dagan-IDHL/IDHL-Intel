<script>
	import { onMount } from 'svelte';
	import { addDays, todayIsoUtc } from '$lib/analytics/date.js';
	import { computeCompareRange, computeDelta } from '$lib/analytics/comparison.js';
	import DashboardCard from '$lib/components/ui/DashboardCard.svelte';
	import EChart from '$lib/components/charts/EChart.svelte';
	import { setReportItemSpec } from '$lib/stores/reportLayouts.js';
 
	export let clientId = '';
	export let itemId = '';
	export let spec = null;
	export let start = '';
	export let end = '';
	export let granularity = 'auto'; // auto | daily | weekly | monthly
	export let compareMode = 'off'; // off | mom | yoy
	export let preview = false;
 
	let loading = false;
	let error = '';
 
	let groups = [];
	let keywords = [];
	let rankings = {}; // optional local fallback (localStorage mode)
	let mockRankings = {}; // keywordId -> { [dateIso]: position }
 
	function clamp(n, min, max) {
		return Math.max(min, Math.min(max, n));
	}
 
	function formatInt(v) {
		const n = typeof v === 'number' ? v : Number(v);
		if (!Number.isFinite(n)) return '—';
		return new Intl.NumberFormat('en-GB').format(Math.round(n));
	}
 
	function formatPct(v) {
		const n = typeof v === 'number' ? v : Number(v);
		if (!Number.isFinite(n)) return '—';
		return new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 0 }).format(n);
	}
 
	function hash32(str) {
		const s = String(str || '');
		let h = 2166136261;
		for (let i = 0; i < s.length; i += 1) {
			h ^= s.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return h >>> 0;
	}
 
	function uniqueStable(list) {
		const out = [];
		const seen = new Set();
		for (const item of list || []) {
			const key = String(item);
			if (seen.has(key)) continue;
			seen.add(key);
			out.push(item);
		}
		return out;
	}
 
	function mulberry32(seed) {
		let a = seed >>> 0;
		return () => {
			a |= 0;
			a = (a + 0x6d2b79f5) | 0;
			let t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
 
	function daysBetweenInclusive(startIso, endIso) {
		const out = [];
		const startD = new Date(`${startIso}T00:00:00Z`);
		const endD = new Date(`${endIso}T00:00:00Z`);
		if (!Number.isFinite(startD.getTime()) || !Number.isFinite(endD.getTime())) return out;
		for (let d = startD; d <= endD; d = new Date(d.getTime() + 86400000)) {
			out.push(d.toISOString().slice(0, 10));
		}
		return out;
	}
 
	function weekKey(dateIso) {
		const d = new Date(`${dateIso}T00:00:00Z`);
		const day = (d.getUTCDay() + 6) % 7; // Monday=0
		const monday = new Date(d.getTime() - day * 86400000);
		return monday.toISOString().slice(0, 10);
	}
 
	function monthKey(dateIso) {
		return String(dateIso || '').slice(0, 7);
	}
 
	function aggregateByBucket(dates, bucket) {
		if (bucket === 'daily') return dates.map((d) => ({ key: d, dates: [d], label: d }));
		const map = new Map();
		for (const d of dates) {
			const k = bucket === 'weekly' ? weekKey(d) : monthKey(d);
			if (!map.has(k)) map.set(k, []);
			map.get(k).push(d);
		}
		return Array.from(map.entries())
			.sort((a, b) => String(a[0]).localeCompare(String(b[0])))
			.map(([k, ds]) => ({ key: k, dates: ds, label: k }));
	}
 
	function ctrForPosition(pos) {
		const p = typeof pos === 'number' ? pos : Number(pos);
		if (!Number.isFinite(p) || p <= 0) return 0;
		if (p === 1) return 0.28;
		if (p === 2) return 0.15;
		if (p === 3) return 0.1;
		if (p === 4) return 0.07;
		if (p === 5) return 0.05;
		if (p <= 10) return 0.02;
		if (p <= 20) return 0.005;
		if (p <= 50) return 0.0015;
		return 0.0005;
	}
 
	function basePositionFor(keywordId) {
		return 6 + (hash32(keywordId) % 70);
	}

	function positionFor(keywordId, dateIso) {
		// Prefer stored rankings if present (localStorage mode); otherwise deterministic fake series.
		const existing = rankings?.[keywordId];
		const stored = existing && typeof existing === 'object' ? existing?.[dateIso] : null;
		const storedNum = typeof stored === 'number' ? stored : Number(stored);
		if (Number.isFinite(storedNum)) return clamp(Math.round(storedNum), 1, 100);

		const mock = mockRankings?.[keywordId];
		const mockVal = mock && typeof mock === 'object' ? mock?.[dateIso] : null;
		const mockNum = typeof mockVal === 'number' ? mockVal : Number(mockVal);
		if (Number.isFinite(mockNum)) return clamp(Math.round(mockNum), 1, 100);

		// Fallback (should rarely be used): mild deterministic wobble.
		const base = basePositionFor(keywordId);
		const t = Math.floor(new Date(`${dateIso}T00:00:00Z`).getTime() / 86400000);
		const phase = (hash32(`${keywordId}:phase`) % 628) / 100; // ~0..6.28
		const wobble = Math.sin(t / 11 + phase) * 8 + Math.sin(t / 29 + phase) * 4;
		const rng = mulberry32(hash32(`${keywordId}:${dateIso}`));
		const noise = (rng() - 0.5) * 6;
		return clamp(Math.round(base + wobble + noise), 1, 100);
	}
 
	function mean(values) {
		const nums = values.filter((v) => Number.isFinite(v));
		if (!nums.length) return null;
		return nums.reduce((a, b) => a + b, 0) / nums.length;
	}
 
	function effectiveRange() {
		const today = todayIsoUtc();
		const yesterday = addDays(today, -1);
		const fallbackEnd = yesterday;
		const fallbackStart = addDays(fallbackEnd, -27);
		return {
			start: String(start || '').trim() || fallbackStart,
			end: String(end || '').trim() || fallbackEnd
		};
	}
 
	function bucketMode() {
		const g = String(granularity || 'auto');
		if (g === 'daily') return 'daily';
		if (g === 'weekly') return 'weekly';
		if (g === 'monthly') return 'monthly';
		const r = effectiveRange();
		const days = daysBetweenInclusive(r.start, r.end).length;
		if (days > 220) return 'monthly';
		if (days > 90) return 'weekly';
		return 'daily';
	}
 
	function selectedGroupId() {
		const id = String(spec?.groupId || 'all');
		return id || 'all';
	}
 
	function selectedMetric() {
		const v = String(spec?.variant || 'summary');
		if (v === 'avg_position') return 'avg_position';
		if (v === 'visibility') return 'visibility';
		const m = String(spec?.viewMetric || 'avg_position');
		if (m === 'traffic' || m === 'top10' || m === 'visibility') return m;
		return 'avg_position';
	}

	function updateSpec(patch) {
		if (!clientId || !itemId) return;
		const current = spec && typeof spec === 'object' ? spec : {};
		const next = { ...current, ...(patch && typeof patch === 'object' ? patch : {}) };
		setReportItemSpec(clientId, itemId, {
			...next,
			version: 1,
			kind: 'keyword_tracking',
			title: String(next?.title || 'Organic Keywords')
		});
	}
 
	const CHART_BLUE = '#2563eb';
	const CHART_BLUE_FILL = 'rgba(37,99,235,0.18)';

	function yBounds(values, { clampMin = null, clampMax = null } = {}) {
		const nums = (Array.isArray(values) ? values : []).filter((v) => Number.isFinite(v));
		if (!nums.length) return null;
		const minV = Math.min(...nums);
		const maxV = Math.max(...nums);
		const span = Math.max(1, maxV - minV);
		const pad = Math.max(2, Math.round(span * 0.25));
		let min = Math.floor(minV - pad);
		let max = Math.ceil(maxV + pad);
		if (clampMin != null) min = Math.max(clampMin, min);
		if (clampMax != null) max = Math.min(clampMax, max);
		if (min === max) {
			min = Math.max(clampMin ?? -Infinity, min - 2);
			max = Math.min(clampMax ?? Infinity, max + 2);
		}
		return { min, max };
	}

	function buildOption(labels, series, metric) {
		const bounds =
			metric === 'avg_position'
				? yBounds(series, { clampMin: 1, clampMax: 100 })
				: metric === 'traffic' || metric === 'visibility'
					? yBounds(series, { clampMin: 0 })
					: null;

		const base = {
			backgroundColor: '#ffffff',
			grid: { left: 56, right: 16, top: 18, bottom: 32 },
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'line', lineStyle: { color: 'rgba(37,99,235,0.25)' } }
			},
			xAxis: {
				type: 'category',
				data: labels,
				axisLabel: { color: '#7b8197' },
				axisLine: { lineStyle: { color: 'rgba(0,0,0,0.08)' } }
			},
			yAxis: {
				type: 'value',
				min: bounds?.min,
				max: bounds?.max,
				axisLabel: { color: '#7b8197' },
				splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
			}
		};
 
		if (metric === 'avg_position') {
			return {
				...base,
				yAxis: { ...base.yAxis, inverse: true },
				series: [
					{
						type: 'line',
						name: 'Average position',
						data: series.map((v) => (v == null ? null : Math.round(v))),
						smooth: true,
						showSymbol: false,
						lineStyle: { width: 2, color: CHART_BLUE },
						areaStyle: { color: CHART_BLUE_FILL, origin: 'end' }
					}
				]
			};
		}
 
		if (metric === 'top10') {
			return {
				...base,
				yAxis: {
					...base.yAxis,
					min: 0,
					max: 1,
					axisLabel: {
						color: '#7b8197',
						formatter: (v) =>
							new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 0 }).format(v)
					}
				},
				series: [
					{
						type: 'line',
						name: '% in Top 10',
						data: series.map((v) => (v == null ? null : v)),
						smooth: true,
						showSymbol: false,
						lineStyle: { width: 2, color: CHART_BLUE },
						areaStyle: { color: CHART_BLUE_FILL }
					}
				]
			};
		}
 
		const name =
			metric === 'traffic' ? 'Traffic forecast' : metric === 'visibility' ? 'Visibility' : 'Metric';
		return {
			...base,
			series: [
				{
					type: 'line',
					name,
					data: series.map((v) => (v == null ? null : Math.round(v))),
					smooth: true,
					showSymbol: false,
					lineStyle: { width: 2, color: CHART_BLUE },
					areaStyle: { color: CHART_BLUE_FILL }
				}
			]
		};
	}
 
	function readFromLocalStorage() {
		if (typeof window === 'undefined') return null;
		if (!clientId) return null;
		const key = `pi_kw_tracking_v1:${clientId}`;
		try {
			const raw = window.localStorage.getItem(key);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (!parsed || typeof parsed !== 'object') return null;
			return parsed;
		} catch {
			return null;
		}
	}
 
	async function loadKeywords() {
		if (typeof window === 'undefined') return;
		if (!clientId) return;
		loading = true;
		error = '';
 
		try {
			const [gRes, kRes] = await Promise.all([
				fetch(`/api/clients/${clientId}/keyword-groups`),
				fetch(`/api/clients/${clientId}/keywords`)
			]);
 
			if (gRes.ok && kRes.ok) {
				const gJson = await gRes.json().catch(() => null);
				const kJson = await kRes.json().catch(() => null);
				groups = Array.isArray(gJson?.items) ? gJson.items.map((g) => ({ id: g.id, name: g.name })) : [];
				keywords = Array.isArray(kJson?.items)
					? kJson.items.map((k) => ({
							id: k.id,
							keyword: k.keyword,
							groupId: k.groupId || '',
							volume: typeof k.volume === 'number' ? k.volume : Number(k.volume) || 0
						}))
					: [];
				rankings = {};
				return;
			}
 
			const fallback = readFromLocalStorage();
			if (fallback) {
				groups = Array.isArray(fallback?.groups) ? fallback.groups : [];
				keywords = Array.isArray(fallback?.keywords) ? fallback.keywords : [];
				rankings = fallback?.rankings && typeof fallback.rankings === 'object' ? fallback.rankings : {};
				return;
			}
 
			const gJson = await gRes.json().catch(() => null);
			const kJson = await kRes.json().catch(() => null);
			error =
				String(gJson?.error || '').trim() ||
				String(kJson?.error || '').trim() ||
				'Keyword tracking is not configured for this client yet.';
		} catch (e) {
			const fallback = readFromLocalStorage();
			if (fallback) {
				groups = Array.isArray(fallback?.groups) ? fallback.groups : [];
				keywords = Array.isArray(fallback?.keywords) ? fallback.keywords : [];
				rankings = fallback?.rankings && typeof fallback.rankings === 'object' ? fallback.rankings : {};
				return;
			}
			error = String(e?.message || 'Failed to load keyword data.');
		} finally {
			loading = false;
		}
	}
 
	onMount(loadKeywords);

	$: r = effectiveRange();
	$: datesDaily = daysBetweenInclusive(r.start, r.end);
	$: cm = String(compareMode || 'off');
	$: compareRange = cm === 'off' ? null : computeCompareRange(r, cm);
	$: compareDatesDaily = compareRange ? daysBetweenInclusive(compareRange.start, compareRange.end) : [];
	$: bucket = bucketMode();
	$: buckets = aggregateByBucket(datesDaily, bucket);
	$: labels = buckets.map((b) => b.label);

	$: groupId = selectedGroupId();
	$: metric = selectedMetric();
	$: variant = String(spec?.variant || 'summary');
	$: listLimit = clamp(Math.round(Number(spec?.limit) || 25), 5, 200);

	$: selectedKeywords =
		groupId === 'all' ? keywords : keywords.filter((k) => String(k.groupId || '') === groupId);

	function generateDeterministicSeries(days, keywordId) {
		const base = clamp(Math.round(basePositionFor(keywordId)), 1, 100);
		let p = base;
		/** @type {Record<string, number>} */
		const out = {};
		let i = 0;
		for (const d of days) {
			// Mean-reverting daily movement around a base position.
			// (Avoids getting stuck at 1/100 which makes the report charts look flat.)
			const rng = mulberry32(hash32(`kw_series:${keywordId}:${i}`));
			const drift = (rng() - 0.5) * 3;
			const jump = rng() < 0.03 ? (rng() - 0.5) * 18 : 0;
			const pull = (base - p) * 0.09;
			const noise = (rng() - 0.5) * 2;

			p = p + drift + jump + pull + noise;
			p = clamp(Math.round(p), 1, 100);
			out[d] = p;
			i += 1;
		}
		return out;
	}

	$: mockRankings = (() => {
		const allDays = uniqueStable([...datesDaily, ...compareDatesDaily]).sort((a, b) =>
			String(a).localeCompare(String(b))
		);
		if (!allDays.length) return {};
		const list = Array.isArray(selectedKeywords) ? selectedKeywords : [];
		if (!list.length) return {};
		const next = {};
		for (const kw of list) {
			// Only generate if we don't already have a stored series for this keyword.
			const existing = rankings?.[kw.id];
			if (existing && typeof existing === 'object' && !Array.isArray(existing)) continue;
			next[kw.id] = generateDeterministicSeries(allDays, kw.id);
		}
		return next;
	})();

	function computeSeriesForRange(range, bucketModeName, kwList) {
		const dates = daysBetweenInclusive(range.start, range.end);
		const bs = aggregateByBucket(dates, bucketModeName);

		const positions = [];
		const top10 = [];
		const traffic = [];
		const visibility = [];

		for (const b of bs) {
			const posByKeyword = [];
			let top10Count = 0;
			let trafficTotal = 0;
			let visibilityTotal = 0;

			for (const kw of kwList) {
				const perDay = b.dates.map((d) => positionFor(kw.id, d));
				const avgPos = mean(perDay);
				if (avgPos != null) posByKeyword.push(avgPos);

				const lastPos = positionFor(kw.id, b.dates[b.dates.length - 1]);
				if (lastPos <= 10) top10Count += 1;
				const contrib = (kw.volume || 0) * ctrForPosition(lastPos);
				trafficTotal += contrib;
				visibilityTotal += contrib;
			}

			positions.push(mean(posByKeyword));
			const denom = kwList.length || 1;
			top10.push(top10Count / denom);
			traffic.push(trafficTotal);
			visibility.push(visibilityTotal / 1000);
		}

		return { buckets: bs, positions, top10, traffic, visibility };
	}

	$: series = (() => {
		const kwList = Array.isArray(selectedKeywords) ? selectedKeywords : [];
		return computeSeriesForRange(r, bucket, kwList);
	})();

	$: compare = (() => {
		if (!compareRange) return null;
		const kwList = Array.isArray(selectedKeywords) ? selectedKeywords : [];
		return computeSeriesForRange(compareRange, bucket, kwList);
	})();
 
	$: latestIndex = Math.max(0, labels.length - 1);
	$: kpiAvgPos = (() => {
		const v = series.positions?.[latestIndex];
		if (v == null) return '—';
		return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(v);
	})();
	$: kpiTraffic = formatInt(series.traffic?.[latestIndex]);
	$: kpiTop10 = formatPct(series.top10?.[latestIndex]);
	$: kpiVisibility = (() => {
		const v = series.visibility?.[latestIndex];
		if (v == null) return '—';
		return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(v);
	})();

	$: headerKpiValue =
		variant === 'list'
			? new Intl.NumberFormat('en-GB').format(selectedKeywords.length || 0)
			: metric === 'traffic'
				? kpiTraffic
				: metric === 'top10'
					? kpiTop10
					: metric === 'visibility'
						? kpiVisibility
						: kpiAvgPos;

	$: headerCompareMode = variant === 'list' ? 'off' : String(compareMode || 'off');
	$: headerDeltaPct = (() => {
		if (!compare || headerCompareMode === 'off') return null;
		const curr =
			metric === 'traffic'
				? series.traffic?.[latestIndex]
				: metric === 'top10'
					? series.top10?.[latestIndex]
					: metric === 'visibility'
						? series.visibility?.[latestIndex]
						: series.positions?.[latestIndex];
		const prev =
			metric === 'traffic'
				? compare.traffic?.[latestIndex]
				: metric === 'top10'
					? compare.top10?.[latestIndex]
					: metric === 'visibility'
						? compare.visibility?.[latestIndex]
						: compare.positions?.[latestIndex];
		if (curr == null || prev == null) return null;

		// For avg position, lower is better: invert delta so improvements are positive.
		if (metric === 'avg_position') {
			if (prev === 0) return null;
			return (prev - curr) / prev;
		}

		return computeDelta(curr, prev).deltaPct;
	})();

	$: headerDeltaAbsLabel = (() => {
		if (!compare || headerCompareMode === 'off') return '';
		if (metric !== 'avg_position') return '';
		const curr = series.positions?.[latestIndex];
		const prev = compare.positions?.[latestIndex];
		if (curr == null || prev == null) return '';
		const diff = prev - curr; // positive = improved
		const sign = diff > 0 ? '+' : diff < 0 ? '' : '';
		return `Δ ${sign}${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(diff)} positions`;
	})();
 
	$: chartSeries =
		metric === 'traffic'
			? series.traffic
			: metric === 'top10'
				? series.top10
				: metric === 'visibility'
					? series.visibility
					: series.positions;

	$: compareSeries =
		compare && metric === 'traffic'
			? compare.traffic
			: compare && metric === 'top10'
				? compare.top10
				: compare && metric === 'visibility'
					? compare.visibility
					: compare && metric === 'avg_position'
						? compare.positions
						: null;

	$: option = (() => {
		const base = buildOption(labels, chartSeries || [], metric);
		if (!compareSeries || compareSeries.length === 0) return base;
		const compareData = compareSeries.slice(0, labels.length);
		const dashed = {
			...(base.series?.[0] || {}),
			name: 'Previous period',
			data: compareData.map((v) =>
				metric === 'top10'
					? v
					: v == null
						? null
						: metric === 'avg_position'
							? Math.round(v)
							: Math.round(v)
			),
			lineStyle: { ...(base.series?.[0]?.lineStyle || {}), type: 'dashed', opacity: 0.7 },
			areaStyle: null
		};
		return { ...base, series: [base.series?.[0], dashed].filter(Boolean) };
	})();
 
	$: latestDate = datesDaily[datesDaily.length - 1] || r.end;
	$: keywordRows = (() => {
		const list = Array.isArray(selectedKeywords) ? selectedKeywords : [];
		const sorted = [...list].sort((a, b) => (b.volume || 0) - (a.volume || 0));
		const limit = variant === 'list' ? listLimit : 8;
		return sorted.slice(0, limit).map((k) => ({
			id: k.id,
			keyword: k.keyword,
			volume: k.volume || 0,
			position: positionFor(k.id, latestDate)
		}));
	})();
</script>
 
<DashboardCard
	title={spec?.title || 'Organic Keywords'}
	icon="search"
	loading={loading}
	error={error}
	kpiValue={headerKpiValue}
	compareMode={headerCompareMode}
	deltaPct={headerDeltaPct}
	deltaAbsLabel={headerDeltaAbsLabel}
>
	<svelte:fragment slot="actions">
		<slot name="actions" />
	</svelte:fragment>
 
	{#if !error}
		<div class="space-y-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="text-xs font-semibold text-gray-600">
					{#if groupId === 'all'}All keywords{:else}Group: {groups.find((g) => g.id === groupId)?.name || '—'}{/if}
					<span class="mx-2 text-gray-300">•</span>
					<span class="text-gray-500">{r.start} → {r.end}</span>
				</div>
 
				{#if !preview && groups.length > 1}
					<select
						class="h-9 rounded-lg border border-[var(--pi-border)] bg-white px-3 pr-9 text-sm font-semibold text-gray-800 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--pi-focus)]"
						value={groupId}
						on:change={(e) => updateSpec({ groupId: e.currentTarget.value })}
					>
						<option value="all">All groups</option>
						{#each groups as g (g.id)}
							<option value={g.id}>{g.name}</option>
						{/each}
					</select>
				{/if}
			</div>
 
			{#if variant === 'summary'}
				<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
					<button
						type="button"
						class="rounded-xl border border-[var(--pi-border)] bg-white p-3 text-left shadow-sm ring-1 ring-black/0 transition hover:bg-[var(--pi-surface-2)]"
						class:ring-2={metric === 'avg_position'}
						class:ring-[var(--pi-focus)]={metric === 'avg_position'}
						disabled={preview}
						on:click={() => updateSpec({ viewMetric: 'avg_position' })}
					>
						<div class="text-[11px] font-semibold text-gray-500">Average position</div>
						<div class="mt-1 text-lg font-bold text-gray-900">{kpiAvgPos}</div>
					</button>
					<button
						type="button"
						class="rounded-xl border border-[var(--pi-border)] bg-white p-3 text-left shadow-sm ring-1 ring-black/0 transition hover:bg-[var(--pi-surface-2)]"
						class:ring-2={metric === 'traffic'}
						class:ring-[var(--pi-focus)]={metric === 'traffic'}
						disabled={preview}
						on:click={() => updateSpec({ viewMetric: 'traffic' })}
					>
						<div class="text-[11px] font-semibold text-gray-500">Traffic forecast</div>
						<div class="mt-1 text-lg font-bold text-gray-900">{kpiTraffic}</div>
					</button>
					<button
						type="button"
						class="rounded-xl border border-[var(--pi-border)] bg-white p-3 text-left shadow-sm ring-1 ring-black/0 transition hover:bg-[var(--pi-surface-2)]"
						class:ring-2={metric === 'top10'}
						class:ring-[var(--pi-focus)]={metric === 'top10'}
						disabled={preview}
						on:click={() => updateSpec({ viewMetric: 'top10' })}
					>
						<div class="text-[11px] font-semibold text-gray-500">% in Top 10</div>
						<div class="mt-1 text-lg font-bold text-gray-900">{kpiTop10}</div>
					</button>
					<button
						type="button"
						class="rounded-xl border border-[var(--pi-border)] bg-white p-3 text-left shadow-sm ring-1 ring-black/0 transition hover:bg-[var(--pi-surface-2)]"
						class:ring-2={metric === 'visibility'}
						class:ring-[var(--pi-focus)]={metric === 'visibility'}
						disabled={preview}
						on:click={() => updateSpec({ viewMetric: 'visibility' })}
					>
						<div class="text-[11px] font-semibold text-gray-500">Visibility</div>
						<div class="mt-1 text-lg font-bold text-gray-900">{kpiVisibility}</div>
					</button>
				</div>
			{:else if variant === 'avg_position'}
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<div
						class="rounded-xl border border-[var(--pi-border)] bg-white p-3 text-left shadow-sm"
					>
						<div class="text-[11px] font-semibold text-gray-500">Average position</div>
						<div class="mt-1 text-lg font-bold text-gray-900">{kpiAvgPos}</div>
					</div>
				</div>
			{:else if variant === 'visibility'}
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<div
						class="rounded-xl border border-[var(--pi-border)] bg-white p-3 text-left shadow-sm"
					>
						<div class="text-[11px] font-semibold text-gray-500">Visibility</div>
						<div class="mt-1 text-lg font-bold text-gray-900">{kpiVisibility}</div>
					</div>
				</div>
			{/if}
 
			{#if selectedKeywords.length === 0}
				<div
					class="rounded-xl border border-dashed border-gray-300 bg-[var(--pi-surface-2)] p-8 text-center text-sm text-gray-600"
				>
					No keywords found for this client yet.
				</div>
			{:else}
				{#if variant !== 'list' && variant !== 'summary'}
					<div class="rounded-xl border border-[var(--pi-border)] bg-white p-2 shadow-sm">
						<EChart {option} height={260} />
					</div>
				{/if}

				{#if variant === 'list'}
					<div class="overflow-hidden rounded-xl border border-[var(--pi-border)] bg-white shadow-sm">
						<div class="border-b border-gray-100 px-4 py-2 text-xs font-semibold text-gray-600">
							Keywords
							<span class="ml-2 font-normal text-gray-500">({selectedKeywords.length})</span>
						</div>
						<table class="w-full text-sm">
							<thead class="bg-[var(--pi-surface-2)] text-[11px] font-semibold text-gray-600">
								<tr>
									<th class="px-4 py-2 text-left">Keyword</th>
									<th class="px-2 py-2 text-right">Volume</th>
									<th class="px-4 py-2 text-right">Pos</th>
								</tr>
							</thead>
							<tbody>
								{#each keywordRows as row (row.id)}
									<tr class="border-t border-gray-100">
										<td class="px-4 py-2 font-semibold text-gray-900">{row.keyword}</td>
										<td class="px-2 py-2 text-right text-gray-700">{formatInt(row.volume)}</td>
										<td class="px-4 py-2 text-right font-semibold text-gray-900">{row.position}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</DashboardCard>
