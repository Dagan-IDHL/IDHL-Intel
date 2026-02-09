<script>
	import { page } from '$app/stores';
	import { untrack } from 'svelte';
	import {
		addDays,
		addMonths,
		endOfMonth,
		startOfMonth,
		todayIsoUtc
	} from '$lib/analytics/date.js';
	import EChart from '$lib/components/charts/EChart.svelte';
	import CardGrid from '$lib/components/ui/CardGrid.svelte';
	import DashboardCard from '$lib/components/ui/DashboardCard.svelte';

	const clientId = $derived($page.params.clientId);
	const storageKey = $derived(clientId ? `pi_kw_tracking_v1:${clientId}` : '');

	let groups = $state([]);
	let keywords = $state([]);
	let rankings = $state({}); // keywordId -> { [dateIso]: position }
	let expandedGroups = $state({});

	let rangePreset = $state('last_6_months'); // last_7_days | last_28_days | last_3_months | last_6_months | last_12_months
	let groupBy = $state('daily'); // daily | weekly | monthly
	let selectedGroupId = $state('all'); // all | <groupId>
	let rankFilter = $state('all'); // all | top3 | top5 | top10 | unranked
	let selectedKeywordIds = $state([]);

	let activeMetric = $state('avg_position'); // avg_position | traffic | top10 | visibility

	let showAddModal = $state(false);
	let addKeywordsText = $state('');
	let addGroupId = $state('');
	let newGroupName = $state('');
	let addError = $state('');
	let savingKeywords = $state(false);

	let showAiKeywordGen = $state(false);
	let aiTopic = $state('');
	let aiIntent = $state('Informational'); // Informational | Commercial | Transactional | LLM
	let aiGenerating = $state(false);
	let aiGenError = $state('');

	let persistenceMode = $state('local'); // local | pb
	let pbLoading = $state(false);
	let pbLoaded = $state(false);
	let pbTried = $state(false);
	let pbError = $state('');

	let persistTimer = null;
	let loadedStorageKey = '';

	let selectedKeywordsShowAverage = $state(false);

	function uid(prefix = 'id') {
		return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
	}

	function clamp(n, min, max) {
		return Math.max(min, Math.min(max, n));
	}

	function parseInputs(text) {
		const raw = String(text || '');
		return raw
			.split(/[\r\n]+/g)
			.map((v) => v.trim())
			.filter(Boolean);
	}

	function uniqueStable(list) {
		const out = [];
		const seen = new Set();
		for (const item of list) {
			const key = String(item);
			if (seen.has(key)) continue;
			seen.add(key);
			out.push(item);
		}
		return out;
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

	function getPresetRange(preset) {
		const today = todayIsoUtc();
		const yesterday = addDays(today, -1);

		if (preset === 'last_7_days') {
			return { start: addDays(yesterday, -6), end: yesterday };
		}

		if (preset === 'last_28_days') {
			return { start: addDays(yesterday, -27), end: yesterday };
		}

		if (preset === 'last_3_months' || preset === 'last_6_months' || preset === 'last_12_months') {
			const months = preset === 'last_3_months' ? 3 : preset === 'last_6_months' ? 6 : 12;
			const endOfPrevMonth = endOfMonth(addMonths(startOfMonth(today), -1));
			const startMonth = startOfMonth(addMonths(startOfMonth(endOfPrevMonth), -(months - 1)));
			return { start: startMonth, end: endOfPrevMonth };
		}

		return { start: addDays(yesterday, -27), end: yesterday };
	}

	function daysBetweenInclusive(startIso, endIso) {
		const out = [];
		const start = new Date(`${startIso}T00:00:00Z`);
		const end = new Date(`${endIso}T00:00:00Z`);
		if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return out;
		for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) {
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

	function getLatestPosition(keywordId, dateIso) {
		const series = rankings?.[keywordId] || null;
		if (!series || typeof series !== 'object') return null;
		const v = series?.[dateIso];
		const n = typeof v === 'number' ? v : Number(v);
		return Number.isFinite(n) ? n : null;
	}

	function ensureExpanded(groupId) {
		if (expandedGroups[groupId] === undefined)
			expandedGroups = { ...expandedGroups, [groupId]: true };
	}

	function seedIfEmpty() {
		if (groups.length || keywords.length) return;
		const ungroupedId = uid('grp');
		groups = [{ id: ungroupedId, name: 'Ungrouped' }];
		addGroupId = ungroupedId;
		expandedGroups = { [ungroupedId]: true };
	}

	async function loadFromPocketBase() {
		if (!clientId) return false;
		if (typeof window === 'undefined') return false;
		if (pbLoaded || pbLoading) return pbLoaded;

		pbLoading = true;
		pbError = '';
		try {
			const [gRes, kRes] = await Promise.all([
				fetch(`/api/clients/${clientId}/keyword-groups`),
				fetch(`/api/clients/${clientId}/keywords`)
			]);

			if (!gRes.ok || !kRes.ok) {
				const gJson = await gRes.json().catch(() => null);
				const kJson = await kRes.json().catch(() => null);
				pbError =
					String(gJson?.error || '').trim() ||
					String(kJson?.error || '').trim() ||
					'PocketBase keyword collections are not available yet.';
				return false;
			}

			const gJson = await gRes.json().catch(() => null);
			const kJson = await kRes.json().catch(() => null);

			let nextGroups = Array.isArray(gJson?.items) ? gJson.items : [];
			let nextKeywords = Array.isArray(kJson?.items) ? kJson.items : [];

			if (nextGroups.length === 0) {
				const created = await fetch(`/api/clients/${clientId}/keyword-groups`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ name: 'Ungrouped' })
				});
				if (created.ok) {
					const cg = await created.json().catch(() => null);
					if (cg?.id) nextGroups = [{ id: cg.id, name: cg.name || 'Ungrouped' }];
				}
			}

			const fallbackGroupId = nextGroups[0]?.id || '';
			nextKeywords = nextKeywords.map((k) => ({ ...k, groupId: k?.groupId || fallbackGroupId }));

			groups = nextGroups.map((g) => ({ id: g.id, name: g.name }));
			keywords = nextKeywords.map((k) => ({
				id: k.id,
				keyword: k.keyword,
				groupId: k.groupId,
				volume: typeof k.volume === 'number' ? k.volume : Number(k.volume) || undefined
			}));
			expandedGroups = Object.fromEntries(groups.map((g) => [g.id, true]));
			addGroupId = groups[0]?.id || '';

			persistenceMode = 'pb';
			pbLoaded = true;
			return true;
		} catch (e) {
			pbError = String(e?.message || 'Failed to load keywords from PocketBase.');
			return false;
		} finally {
			pbLoading = false;
		}
	}

	function loadFromStorage(key) {
		if (!key) return;
		if (typeof localStorage === 'undefined') return;
		try {
			const raw = localStorage.getItem(key);
			if (!raw) {
				seedIfEmpty();
				return;
			}
			const parsed = JSON.parse(raw);
			groups = Array.isArray(parsed?.groups) ? parsed.groups : [];
			keywords = Array.isArray(parsed?.keywords) ? parsed.keywords : [];
			rankings = parsed?.rankings && typeof parsed.rankings === 'object' ? parsed.rankings : {};
			expandedGroups =
				parsed?.expandedGroups && typeof parsed.expandedGroups === 'object'
					? parsed.expandedGroups
					: {};
			addGroupId = groups[0]?.id || '';
			seedIfEmpty();
		} catch {
			seedIfEmpty();
		}
	}

	function persistToStorage(key) {
		if (!key) return;
		if (typeof localStorage === 'undefined') return;
		if (persistTimer) clearTimeout(persistTimer);
		persistTimer = setTimeout(() => {
			try {
				localStorage.setItem(
					key,
					JSON.stringify({ version: 1, groups, keywords, rankings, expandedGroups })
				);
			} catch {
				// ignore
			}
		}, 250);
	}

	$effect(() => {
		if (!clientId) return;
		if (typeof window === 'undefined') return;
		if (persistenceMode !== 'local') return;
		if (pbLoaded || pbLoading || pbTried) return;

		untrack(() => {
			pbTried = true;
			loadFromPocketBase().catch(() => {});
		});
	});

	$effect(() => {
		if (persistenceMode !== 'local') return;
		const key = storageKey;
		if (!key) return;
		if (loadedStorageKey === key) return;
		if (pbLoading) return;

		untrack(() => loadFromStorage(key));
		loadedStorageKey = key;
	});

	$effect(() => {
		if (persistenceMode !== 'local') return;
		const key = storageKey;
		if (!key) return;
		if (loadedStorageKey !== key) return;
		persistToStorage(key);
	});

	$effect(() => {
		const start = rangeStart;
		const end = rangeEnd;
		const ids = keywords.map((k) => k.id);
		if (!ids.length) return;

		untrack(() => {
			let changed = false;
			let next = rankings;
			for (const id of ids) {
				const existing = rankings?.[id];
				const ensured = ensureRankingCoverageForKeyword(id, start, end, existing);
				if (!ensured.changed) continue;
				if (next === rankings) next = { ...rankings };
				next[id] = ensured.series;
				changed = true;
			}
			if (changed) rankings = next;
		});
	});

	function generateFakeRankingSeries({ start, end, basePosition }) {
		const days = daysBetweenInclusive(start, end);
		let p = clamp(Math.round(basePosition), 1, 100);
		const series = {};
		for (const d of days) {
			const drift = (Math.random() - 0.5) * 3;
			const jump = Math.random() < 0.03 ? (Math.random() - 0.5) * 18 : 0;
			p = clamp(Math.round(p + drift + jump), 1, 100);
			series[d] = p;
		}
		return series;
	}

	function basePositionFor(keywordId) {
		const s = String(keywordId || '');
		let h = 0;
		for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
		return 6 + (h % 70);
	}

	function ensureRankingCoverageForKeyword(keywordId, startIso, endIso, existingSeries) {
		const existingRaw = existingSeries ?? rankings?.[keywordId];
		const existing =
			existingRaw && typeof existingRaw === 'object' && !Array.isArray(existingRaw) ? existingRaw : null;

		const days = daysBetweenInclusive(startIso, endIso);
		if (!days.length) return { changed: false, series: existing || null };

		if (!existing) {
			return {
				changed: true,
				series: generateFakeRankingSeries({
					start: startIso,
					end: endIso,
					basePosition: basePositionFor(keywordId)
				})
			};
		}

		let changed = false;
		const next = { ...existing };
		let p = next[days[0]];
		if (!Number.isFinite(p)) p = clamp(Math.round(basePositionFor(keywordId)), 1, 100);

		for (const d of days) {
			const v = next[d];
			if (Number.isFinite(v)) {
				p = v;
				continue;
			}
			const drift = (Math.random() - 0.5) * 3;
			const jump = Math.random() < 0.03 ? (Math.random() - 0.5) * 18 : 0;
			p = clamp(Math.round(p + drift + jump), 1, 100);
			next[d] = p;
			changed = true;
		}

		return { changed, series: next };
	}

	function openAdd() {
		seedIfEmpty();
		addError = '';
		addKeywordsText = '';
		newGroupName = '';
		addGroupId = groups[0]?.id || '';
		showAddModal = true;
	}

	function closeAdd() {
		showAddModal = false;
		addError = '';
		showAiKeywordGen = false;
		aiGenError = '';
	}

	async function createGroup(name) {
		const trimmed = String(name || '').trim();
		if (!trimmed) return '';
		if (persistenceMode === 'pb' && clientId) {
			const res = await fetch(`/api/clients/${clientId}/keyword-groups`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: trimmed })
			});
			const data = await res.json().catch(() => null);
			if (!res.ok) {
				addError = String(data?.error || 'Failed to create group.');
				return '';
			}
			const id = String(data?.id || '').trim();
			if (!id) return '';
			groups = [...groups, { id, name: String(data?.name || trimmed) }];
			ensureExpanded(id);
			return id;
		}

		const id = uid('grp');
		groups = [...groups, { id, name: trimmed }];
		ensureExpanded(id);
		return id;
	}

	async function addKeywords() {
		addError = '';
		if (savingKeywords) return;
		savingKeywords = true;
		try {
		const raw = uniqueStable(parseInputs(addKeywordsText));
		if (!raw.length) {
			addError = 'Add at least one keyword.';
			return;
		}

		let groupId = addGroupId;
		if (newGroupName.trim()) groupId = await createGroup(newGroupName);
		if (!groupId) {
			addError = 'Choose a group (or create one).';
			return;
		}

		if (persistenceMode === 'pb' && clientId) {
			const items = raw
				.map((term) => {
					const t = String(term).trim();
					if (!t) return null;
					const volume = clamp(Math.round(200 + Math.random() * 20000), 10, 100000);
					return { keyword: t, volume };
				})
				.filter(Boolean);

			const res = await fetch(`/api/clients/${clientId}/keywords`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ groupId, items })
			});
			const data = await res.json().catch(() => null);
			if (!res.ok) {
				addError = String(data?.error || 'Failed to save keywords.');
				return;
			}

			const created = Array.isArray(data?.items) ? data.items : [];
			if (created.length === 0) {
				addError = 'All of those keywords already exist.';
				return;
			}

			keywords = [
				...keywords,
				...created.map((k) => ({
					id: k.id,
					keyword: k.keyword,
					groupId: k.groupId || groupId,
					volume: typeof k.volume === 'number' ? k.volume : Number(k.volume) || undefined
				}))
			];
			expandedGroups = { ...expandedGroups, [groupId]: true };
			closeAdd();
			return;
		}

		const existingTerms = new Set(keywords.map((k) => String(k.keyword).toLowerCase().trim()));
		const nextKeywords = [];
		const nextRankings = { ...rankings };
		const historyEnd = addDays(todayIsoUtc(), -1);
		const historyStart = addDays(historyEnd, -499);

		for (const term of raw) {
			const t = String(term).trim();
			const k = t.toLowerCase();
			if (!t || existingTerms.has(k)) continue;
			existingTerms.add(k);
			const id = uid('kw');
			const volume = clamp(Math.round(200 + Math.random() * 20000), 10, 100000);
			nextKeywords.push({ id, keyword: t, groupId, volume });
			nextRankings[id] = generateFakeRankingSeries({
				start: historyStart,
				end: historyEnd,
				basePosition: basePositionFor(id)
			});
		}

		if (!nextKeywords.length) {
			addError = 'All of those keywords already exist.';
			return;
		}

		keywords = [...keywords, ...nextKeywords];
		rankings = nextRankings;
		expandedGroups = { ...expandedGroups, [groupId]: true };
		closeAdd();
		} finally {
			savingKeywords = false;
		}
	}

	async function generateKeywordsWithAI() {
		aiGenError = '';
		const topic = String(aiTopic || '').trim();
		if (!topic) {
			aiGenError = 'Add a topic to generate keywords.';
			return;
		}

		aiGenerating = true;
		try {
			const res = await fetch('/api/ai/keywords', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ topic, intent: aiIntent, count: 25 })
			});
			const data = await res.json().catch(() => null);
			if (!res.ok) {
				aiGenError = String(data?.error || 'Failed to generate keywords.');
				return;
			}
			const kws = Array.isArray(data?.keywords) ? data.keywords : [];
			if (!kws.length) {
				aiGenError = 'No keywords returned.';
				return;
			}
			const text = kws.map((k) => String(k || '').trim()).filter(Boolean).join('\n');
			addKeywordsText = addKeywordsText.trim() ? `${addKeywordsText.trim()}\n${text}\n` : `${text}\n`;
			showAiKeywordGen = false;
		} catch (e) {
			aiGenError = String(e?.message || 'Failed to generate keywords.');
		} finally {
			aiGenerating = false;
		}
	}

	function setKeywordGroup(keywordId, groupId) {
		keywords = keywords.map((k) => (k.id === keywordId ? { ...k, groupId } : k));
		ensureExpanded(groupId);

		if (persistenceMode === 'pb' && clientId) {
			fetch(`/api/clients/${clientId}/keywords/${keywordId}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ groupId })
			}).catch(() => {});
		}
	}

	function toggleKeywordSelected(keywordId) {
		if (selectedKeywordIds.includes(keywordId)) {
			selectedKeywordIds = selectedKeywordIds.filter((id) => id !== keywordId);
		} else {
			selectedKeywordIds = [...selectedKeywordIds, keywordId];
		}
	}

	function clearSelectedKeywords() {
		selectedKeywordIds = [];
	}

	const range = $derived.by(() => getPresetRange(rangePreset));
	const rangeStart = $derived.by(() => range.start);
	const rangeEnd = $derived.by(() => range.end);
	const datesDaily = $derived.by(() => daysBetweenInclusive(rangeStart, rangeEnd));

	const filteredKeywords = $derived.by(() => {
		const ks =
			selectedGroupId === 'all'
				? keywords
				: keywords.filter((k) => k.groupId === selectedGroupId);
		const latest = datesDaily[datesDaily.length - 1];
		if (!latest) return ks;
		const matchRank = (pos) => {
			if (rankFilter === 'all') return true;
			if (rankFilter === 'unranked') return pos == null || pos > 100;
			if (rankFilter === 'top3') return pos != null && pos <= 3;
			if (rankFilter === 'top5') return pos != null && pos <= 5;
			if (rankFilter === 'top10') return pos != null && pos <= 10;
			return true;
		};
		return ks.filter((k) => matchRank(getLatestPosition(k.id, latest)));
	});

	const groupsWithKeywords = $derived.by(() => {
		const byGroup = new Map(groups.map((g) => [g.id, { ...g, keywords: [] }]));
		for (const k of keywords) {
			const g = byGroup.get(k.groupId);
			if (g) g.keywords.push(k);
		}
		return Array.from(byGroup.values()).filter((g) => g.keywords.length > 0 || g.name === 'Ungrouped');
	});

	const filteredKeywordCount = $derived.by(() =>
		Array.isArray(filteredKeywords) ? filteredKeywords.length : 0
	);

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

	const buckets = $derived.by(() => aggregateByBucket(datesDaily, groupBy));
	const chartLabels = $derived.by(() => buckets.map((b) => b.label));

	function mean(values) {
		const nums = values.filter((v) => Number.isFinite(v));
		if (!nums.length) return null;
		return nums.reduce((a, b) => a + b, 0) / nums.length;
	}

	const CHART_BLUE = '#2563eb';
	const CHART_BLUE_FILL = 'rgba(37,99,235,0.18)';

	function buildSeriesFor(bucketDates) {
		const kwList = Array.isArray(filteredKeywords) ? filteredKeywords : [];
		const positions = [];
		const top3 = [];
		const top5 = [];
		const top10 = [];
		const traffic = [];
		const visibility = [];

		for (const b of bucketDates) {
			const posByKeyword = [];
			let top3Count = 0;
			let top5Count = 0;
			let top10Count = 0;
			let trafficTotal = 0;
			let visibilityTotal = 0;

			for (const kw of kwList) {
				const perDay = b.dates
					.map((d) => getLatestPosition(kw.id, d))
					.map((v) => (v == null ? 100 : v));
				const avgPos = mean(perDay);
				if (avgPos != null) posByKeyword.push(avgPos);

				const lastPosRaw = getLatestPosition(kw.id, b.dates[b.dates.length - 1]);
				const lastPos = lastPosRaw == null ? 100 : lastPosRaw;
				if (lastPos <= 3) top3Count += 1;
				if (lastPos <= 5) top5Count += 1;
				if (lastPos <= 10) top10Count += 1;
				const contrib = (kw.volume || 0) * ctrForPosition(lastPos);
				trafficTotal += contrib;
				visibilityTotal += contrib;
			}

			positions.push(mean(posByKeyword));
			const denom = kwList.length || 1;
			top3.push(top3Count / denom);
			top5.push(top5Count / denom);
			top10.push(top10Count / denom);
			traffic.push(trafficTotal);
			// Sistrix-style proxy index: weighted CTR * volume, scaled down for readability.
			visibility.push(visibilityTotal / 1000);
		}

		return { positions, top3, top5, top10, traffic, visibility };
	}

	const series = $derived.by(() => buildSeriesFor(buckets));
	const latestIndex = $derived.by(() => Math.max(0, chartLabels.length - 1));

	const kpiAvgPos = $derived.by(() => {
		const v = series.positions[latestIndex];
		if (v == null) return '—';
		return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(v);
	});
	const kpiTraffic = $derived.by(() => formatInt(series.traffic[latestIndex]));
	const kpiTop10 = $derived.by(() => formatPct(series.top10[latestIndex]));
	const kpiVisibility = $derived.by(() => {
		const v = series.visibility?.[latestIndex];
		if (v == null) return '—';
		return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(v);
	});

	function buildAvgPositionOption() {
		return {
			backgroundColor: '#ffffff',
			grid: { left: 48, right: 16, top: 18, bottom: 32 },
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'line', lineStyle: { color: 'rgba(37,99,235,0.25)' } }
			},
			xAxis: {
				type: 'category',
				data: chartLabels,
				axisLabel: { color: '#7b8197' },
				axisLine: { lineStyle: { color: 'rgba(0,0,0,0.08)' } }
			},
			yAxis: {
				type: 'value',
				inverse: true,
				axisLabel: { color: '#7b8197' },
				splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
			},
			series: [
				{
					type: 'line',
					name: 'Average position',
					data: series.positions.map((v) => (v == null ? null : Math.round(v))),
					smooth: true,
					showSymbol: false,
					lineStyle: { width: 2, color: CHART_BLUE },
					// yAxis is inverse; fill should go "down" to the bottom baseline (like other charts)
					areaStyle: { color: CHART_BLUE_FILL, origin: 'end' }
				}
			]
		};
	}

	function buildTrafficOption() {
		return {
			backgroundColor: '#ffffff',
			grid: { left: 48, right: 16, top: 18, bottom: 32 },
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'line', lineStyle: { color: 'rgba(37,99,235,0.25)' } }
			},
			xAxis: {
				type: 'category',
				data: chartLabels,
				axisLabel: { color: '#7b8197' },
				axisLine: { lineStyle: { color: 'rgba(0,0,0,0.08)' } }
			},
			yAxis: {
				type: 'value',
				axisLabel: { color: '#7b8197' },
				splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
			},
			series: [
				{
					type: 'line',
					name: 'Traffic forecast',
					data: series.traffic.map((v) => (v == null ? null : Math.round(v))),
					smooth: true,
					showSymbol: false,
					lineStyle: { width: 2, color: CHART_BLUE },
					areaStyle: { color: CHART_BLUE_FILL }
				}
			]
		};
	}

	function buildTop10Option() {
		return {
			backgroundColor: '#ffffff',
			grid: { left: 48, right: 16, top: 18, bottom: 32 },
			tooltip: { trigger: 'axis' },
			xAxis: {
				type: 'category',
				data: chartLabels,
				axisLabel: { color: '#7b8197' },
				axisLine: { lineStyle: { color: 'rgba(0,0,0,0.08)' } }
			},
			yAxis: {
				type: 'value',
				min: 0,
				max: 1,
				axisLabel: {
					color: '#7b8197',
					formatter: (v) => `${Math.round(Number(v) * 100)}%`
				},
				splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
			},
			series: [
				{
					type: 'line',
					name: '% in Top 10',
					data: series.top10,
					smooth: true,
					showSymbol: false,
					lineStyle: { width: 2, color: '#16a34a' },
					areaStyle: { color: 'rgba(22,163,74,0.10)' }
				}
			]
		};
	}

	function buildVisibilityOption() {
		return {
			backgroundColor: '#ffffff',
			grid: { left: 48, right: 16, top: 18, bottom: 32 },
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'line', lineStyle: { color: 'rgba(37,99,235,0.25)' } }
			},
			xAxis: {
				type: 'category',
				data: chartLabels,
				axisLabel: { color: '#7b8197' },
				axisLine: { lineStyle: { color: 'rgba(0,0,0,0.08)' } }
			},
			yAxis: {
				type: 'value',
				axisLabel: { color: '#7b8197' },
				splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
			},
			series: [
				{
					type: 'line',
					name: 'Visibility',
					data: (series.visibility || []).map((v) => (v == null ? null : Number(v.toFixed(3)))),
					smooth: true,
					showSymbol: false,
					lineStyle: { width: 2, color: CHART_BLUE },
					areaStyle: { color: CHART_BLUE_FILL }
				}
			]
		};
	}

	const activeMetricTitle = $derived.by(() => {
		if (activeMetric === 'traffic') return 'Traffic forecast';
		if (activeMetric === 'top10') return '% in Top 10';
		if (activeMetric === 'visibility') return 'Visibility';
		return 'Average position';
	});

	const activeMetricOption = $derived.by(() => {
		if (activeMetric === 'traffic') return buildTrafficOption();
		if (activeMetric === 'top10') return buildTop10Option();
		if (activeMetric === 'visibility') return buildVisibilityOption();
		return buildAvgPositionOption();
	});

	function isActiveMetric(metric) {
		return activeMetric === metric;
	}

	function setActiveMetric(metric) {
		activeMetric = metric;
	}

	function buildTopOption() {
		return {
			grid: { left: 48, right: 16, top: 18, bottom: 32 },
			tooltip: { trigger: 'axis' },
			xAxis: {
				type: 'category',
				data: chartLabels,
				axisLabel: { color: '#7b8197' },
				axisLine: { lineStyle: { color: 'rgba(0,0,0,0.08)' } }
			},
			yAxis: {
				type: 'value',
				min: 0,
				max: 1,
				axisLabel: {
					color: '#7b8197',
					formatter: (v) => `${Math.round(Number(v) * 100)}%`
				},
				splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
			},
			legend: { top: 0, right: 8, textStyle: { color: '#6b7280', fontSize: 11 } },
			series: [
				{
					type: 'line',
					name: 'Top 3',
					data: series.top3,
					smooth: true,
					showSymbol: false,
					lineStyle: { width: 2, color: '#2563eb' }
				},
				{
					type: 'line',
					name: 'Top 5',
					data: series.top5,
					smooth: true,
					showSymbol: false,
					lineStyle: { width: 2, color: '#0ea5e9' }
				},
				{
					type: 'line',
					name: 'Top 10',
					data: series.top10,
					smooth: true,
					showSymbol: false,
					lineStyle: { width: 2, color: '#16a34a' }
				}
			]
		};
	}

	const selectedKeywords = $derived.by(() =>
		selectedKeywordIds.map((id) => keywords.find((k) => k.id === id)).filter(Boolean)
	);

	const selectedGroup = $derived.by(() => groups.find((g) => g.id === selectedGroupId) || null);
	const selectedGroupName = $derived.by(() => (selectedGroup ? selectedGroup.name : ''));
	const selectedGroupKeywords = $derived.by(() =>
		selectedGroupId === 'all' ? [] : keywords.filter((k) => k.groupId === selectedGroupId)
	);

	function buildSelectedKeywordsOption() {
		const selected = selectedKeywords;
		const empty = selected.length === 0;
		const useGroupAverage = empty && selectedGroupId !== 'all' && selectedGroupKeywords.length > 0;
		const useSelectedAverage = !empty && selectedKeywordsShowAverage;
		return {
			grid: { left: 48, right: 16, top: 18, bottom: 32 },
			tooltip: { trigger: 'axis' },
			legend: {
				top: 0,
				right: 8,
				textStyle: { color: '#6b7280', fontSize: 11 },
				type: 'scroll'
			},
			xAxis: {
				type: 'category',
				data: chartLabels,
				axisLabel: { color: '#7b8197' },
				axisLine: { lineStyle: { color: 'rgba(0,0,0,0.08)' } }
			},
			yAxis: {
				type: 'value',
				inverse: true,
				axisLabel: { color: '#7b8197' },
				splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } }
			},
			series: useSelectedAverage
				? [
						{
							type: 'line',
							id: 'selected:avg',
							name: 'Selected (avg)',
							data: buckets.map((b) => {
								const perKeyword = selected.map((kw) => {
									const perDay = b.dates
										.map((d) => getLatestPosition(kw.id, d))
										.map((v) => (v == null ? 100 : v));
									return mean(perDay);
								});
								const v = mean(perKeyword);
								return v == null ? null : Math.round(v);
							}),
							smooth: true,
							showSymbol: false,
							lineStyle: { width: 2, color: CHART_BLUE },
							// yAxis is inverse; fill should go "down" to the bottom baseline (like other charts)
							areaStyle: { color: CHART_BLUE_FILL, origin: 'end' }
						}
				  ]
				: useGroupAverage
				? [
						{
							type: 'line',
							id: `grp:${selectedGroupId}`,
						name: `${selectedGroupName || 'Group'} (avg)`,
						data: buckets.map((b) => {
								const perKeyword = selectedGroupKeywords.map((kw) => {
									const perDay = b.dates
										.map((d) => getLatestPosition(kw.id, d))
										.map((v) => (v == null ? 100 : v));
									return mean(perDay);
								});
								const v = mean(perKeyword);
								return v == null ? null : Math.round(v);
							}),
						smooth: true,
						showSymbol: false,
						lineStyle: { width: 2, color: 'var(--pi-primary)' },
						// yAxis is inverse; fill should go "down" to the bottom baseline (like other charts)
						areaStyle: { color: CHART_BLUE_FILL, origin: 'end' }
						}
				  ]
				: empty
					? []
					: selected.map((kw, idx) => {
						const data = buckets.map((b) => {
							const perDay = b.dates
								.map((d) => getLatestPosition(kw.id, d))
								.map((v) => (v == null ? 100 : v));
							const avgPos = mean(perDay);
							return avgPos == null ? null : Math.round(avgPos);
						});
						const palette = ['#404b77', '#2563eb', '#0ea5e9', '#16a34a', '#f59e0b', '#ef4444'];
						return {
							type: 'line',
							id: kw.id,
							name: kw.keyword,
							data,
							smooth: true,
							showSymbol: false,
							lineStyle: { width: 2, color: palette[idx % palette.length] }
						};
				  })
		};
	}

	function toggleGroup(groupId) {
		expandedGroups = { ...expandedGroups, [groupId]: !expandedGroups[groupId] };
	}

	function groupStats(group) {
		const latest = datesDaily[datesDaily.length - 1];
		const prev = datesDaily[datesDaily.length - 2];
		const ks = keywords.filter((k) => k.groupId === group.id);
		const latestPositions = ks
			.map((k) => getLatestPosition(k.id, latest))
			.map((v) => (v == null ? 100 : v));
		const prevPositions = ks
			.map((k) => getLatestPosition(k.id, prev))
			.map((v) => (v == null ? 100 : v));
		const avgLatest = mean(latestPositions);
		const avgPrev = mean(prevPositions);
		const delta = avgLatest != null && avgPrev != null ? avgPrev - avgLatest : null; // positive = improved
		const top10Share =
			ks.length > 0
				? ks.filter((k) => (getLatestPosition(k.id, latest) ?? 100) <= 10).length / ks.length
				: 0;
		return { avgLatest, delta, top10Share };
	}

	function keywordRowStats(kw) {
		const latest = datesDaily[datesDaily.length - 1];
		const prev = datesDaily[datesDaily.length - 2];
		const latestPos = getLatestPosition(kw.id, latest);
		const prevPos = getLatestPosition(kw.id, prev);
		const a = latestPos == null ? 100 : latestPos;
		const b = prevPos == null ? 100 : prevPos;
		const delta = Number.isFinite(a) && Number.isFinite(b) ? b - a : null; // positive = improved
		return { latestPos, prevPos, delta };
	}
</script>

<svelte:head>
	<title>Pulse Insight — Organic Keywords</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<div class="text-xs font-semibold tracking-wide text-[var(--pi-muted)] uppercase">
				Organic
			</div>
			<h2 class="mt-1 text-xl font-semibold text-gray-900">Keywords</h2>
			<p class="mt-1 text-sm text-[var(--pi-muted)]">
				Track keyword positions over time, group keywords, and monitor Top 3/5/10 coverage (mock
				data for now).
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<div class="relative">
				<select
					bind:value={rangePreset}
					class="min-w-[180px] appearance-none rounded-xl border border-[var(--pi-border)] bg-white px-3 py-2 pr-10 text-sm font-semibold text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-[var(--pi-primary)]"
				>
					<option value="last_7_days">Last 7 days</option>
					<option value="last_28_days">Last 28 days</option>
					<option value="last_3_months">Last 3 months</option>
					<option value="last_6_months">Last 6 months</option>
					<option value="last_12_months">Last 12 months</option>
				</select>
				<svg
					class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pi-muted)]"
					viewBox="0 0 20 20"
					fill="currentColor"
					aria-hidden="true"
				>
					<path
						fill-rule="evenodd"
						d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>

			<div class="relative">
				<select
					bind:value={groupBy}
					class="min-w-[190px] appearance-none rounded-xl border border-[var(--pi-border)] bg-white px-3 py-2 pr-10 text-sm font-semibold text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-[var(--pi-primary)]"
				>
					<option value="daily">Group by: days</option>
					<option value="weekly">Group by: weeks</option>
					<option value="monthly">Group by: months</option>
				</select>
				<svg
					class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pi-muted)]"
					viewBox="0 0 20 20"
					fill="currentColor"
					aria-hidden="true"
				>
					<path
						fill-rule="evenodd"
						d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>

			<button
				type="button"
				on:click={openAdd}
				class="inline-flex items-center rounded-xl bg-[var(--pi-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[color-mix(in_oklch,var(--pi-primary)_92%,black)]"
			>
				Add keywords
			</button>
		</div>
	</div>

	<CardGrid cols={4}>
		<div
			role="button"
			tabindex="0"
			class={`cursor-pointer rounded-2xl ${isActiveMetric('avg_position') ? 'ring-2 ring-[var(--pi-primary)]' : ''}`}
			on:click={() => setActiveMetric('avg_position')}
			on:keydown={(e) => e.key === 'Enter' && setActiveMetric('avg_position')}
		>
			<DashboardCard title="Average position" icon="search" kpiValue={kpiAvgPos} compareMode="off">
				<EChart
					option={{
						grid: { left: 0, right: 0, top: 6, bottom: 0 },
						xAxis: { type: 'category', data: chartLabels, show: false },
						yAxis: { type: 'value', inverse: true, show: false },
						series: [
							{
								type: 'line',
								data: series.positions.map((v) => (v == null ? null : Math.round(v))),
								smooth: true,
								showSymbol: false,
								lineStyle: { width: 2, color: CHART_BLUE },
								areaStyle: { color: CHART_BLUE_FILL, origin: 'end' }
							}
						]
					}}
					height={92}
				/>
			</DashboardCard>
		</div>
		<div
			role="button"
			tabindex="0"
			class={`cursor-pointer rounded-2xl ${isActiveMetric('traffic') ? 'ring-2 ring-[var(--pi-primary)]' : ''}`}
			on:click={() => setActiveMetric('traffic')}
			on:keydown={(e) => e.key === 'Enter' && setActiveMetric('traffic')}
		>
			<DashboardCard title="Traffic forecast" icon="activity" kpiValue={kpiTraffic} compareMode="off">
				<EChart
					option={{
						grid: { left: 0, right: 0, top: 6, bottom: 0 },
						xAxis: { type: 'category', data: chartLabels, show: false },
						yAxis: { type: 'value', show: false },
						series: [
							{
								type: 'line',
								data: series.traffic,
								smooth: true,
								showSymbol: false,
								lineStyle: { width: 2, color: CHART_BLUE },
								areaStyle: { color: CHART_BLUE_FILL }
							}
						]
					}}
					height={92}
				/>
			</DashboardCard>
		</div>
		<div
			role="button"
			tabindex="0"
			class={`cursor-pointer rounded-2xl ${isActiveMetric('top10') ? 'ring-2 ring-[var(--pi-primary)]' : ''}`}
			on:click={() => setActiveMetric('top10')}
			on:keydown={(e) => e.key === 'Enter' && setActiveMetric('top10')}
		>
			<DashboardCard title="% in Top 10" icon="percent" kpiValue={kpiTop10} compareMode="off">
				<EChart
					option={{
						grid: { left: 0, right: 0, top: 6, bottom: 0 },
						xAxis: { type: 'category', data: chartLabels, show: false },
						yAxis: { type: 'value', min: 0, max: 1, show: false },
						series: [
							{
								type: 'line',
								data: series.top10,
								smooth: true,
								showSymbol: false,
								lineStyle: { width: 2, color: '#16a34a' },
								areaStyle: { color: 'rgba(22,163,74,0.10)' }
							}
						]
					}}
					height={92}
				/>
			</DashboardCard>
		</div>
		<div
			role="button"
			tabindex="0"
			class={`cursor-pointer rounded-2xl ${isActiveMetric('visibility') ? 'ring-2 ring-[var(--pi-primary)]' : ''}`}
			on:click={() => setActiveMetric('visibility')}
			on:keydown={(e) => e.key === 'Enter' && setActiveMetric('visibility')}
		>
			<DashboardCard title="Visibility" icon="eye" kpiValue={kpiVisibility} compareMode="off">
				<EChart
					option={{
						grid: { left: 0, right: 0, top: 6, bottom: 0 },
						xAxis: { type: 'category', data: chartLabels, show: false },
						yAxis: { type: 'value', show: false },
						series: [
							{
								type: 'line',
								data: (series.visibility || []).map((v) => (v == null ? null : Number(v.toFixed(3)))),
								smooth: true,
								showSymbol: false,
								lineStyle: { width: 2, color: CHART_BLUE },
								areaStyle: { color: CHART_BLUE_FILL }
							}
						]
					}}
					height={92}
				/>
			</DashboardCard>
		</div>
	</CardGrid>

	<div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-center gap-3">
				<h3 class="text-sm font-semibold text-gray-900">{activeMetricTitle} over time</h3>
				<span class="text-xs text-[var(--pi-muted)]">Group + filter applied</span>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<div class="relative">
					<select
						bind:value={selectedGroupId}
						class="min-w-[200px] appearance-none rounded-xl border border-[var(--pi-border)] bg-white px-3 py-2 pr-10 text-sm font-semibold text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-[var(--pi-primary)]"
					>
						<option value="all">All groups</option>
						{#each groups as g (g.id)}
							<option value={g.id}>{g.name}</option>
						{/each}
					</select>
					<svg
						class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pi-muted)]"
						viewBox="0 0 20 20"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							fill-rule="evenodd"
							d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div class="relative">
					<select
						bind:value={rankFilter}
						class="min-w-[170px] appearance-none rounded-xl border border-[var(--pi-border)] bg-white px-3 py-2 pr-10 text-sm font-semibold text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-[var(--pi-primary)]"
					>
						<option value="all">All keywords</option>
						<option value="top3">Top 3</option>
						<option value="top5">Top 5</option>
						<option value="top10">Top 10</option>
						<option value="unranked">Unranked</option>
					</select>
					<svg
						class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pi-muted)]"
						viewBox="0 0 20 20"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							fill-rule="evenodd"
							d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
			</div>
		</div>

		<div class="mt-3 text-xs text-[var(--pi-muted)]">
			Showing <span class="font-semibold text-gray-800">{filteredKeywordCount}</span> keyword
			{filteredKeywordCount === 1 ? '' : 's'} (filter + group applied).
		</div>

		{#if keywords.length > 0 && filteredKeywordCount === 0}
			<div class="mt-4 rounded-2xl border border-[var(--pi-border)] bg-[var(--pi-surface-2)] p-6">
				<div class="text-sm font-semibold text-gray-900">No keywords match your filter</div>
				<div class="mt-1 text-sm text-[var(--pi-muted)]">
					Try switching "Rank filter" back to <span class="font-semibold">All keywords</span>.
				</div>
				<div class="mt-4 flex flex-wrap items-center gap-2">
					<button
						type="button"
						on:click={() => {
							selectedGroupId = 'all';
							rankFilter = 'all';
						}}
						class="rounded-xl bg-[var(--pi-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[color-mix(in_oklch,var(--pi-primary)_92%,black)]"
					>
						Clear filters
					</button>
				</div>
			</div>
		{:else}
			<div class="mt-4 rounded-2xl border border-[var(--pi-border)] bg-white p-4">
				<div class="mb-2 text-xs font-semibold text-gray-700">{activeMetricTitle}</div>
				{#key `${activeMetric}:${rangePreset}:${groupBy}:${selectedGroupId}:${rankFilter}:main`}
					<EChart option={activeMetricOption} height={320} />
				{/key}
			</div>
		{/if}

		<div class="mt-4 rounded-2xl border border-[var(--pi-border)] bg-[var(--pi-surface-2)] p-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="text-xs font-semibold text-gray-700">Selected keywords</div>
				<div class="flex items-center gap-2">
					<label class="inline-flex items-center gap-2 rounded-xl border border-[var(--pi-border)] bg-white px-3 py-1.5 text-xs font-semibold text-gray-700">
						<input
							type="checkbox"
							class="h-4 w-4 rounded border-gray-300 text-[var(--pi-primary)] focus:ring-[var(--pi-primary)]"
							bind:checked={selectedKeywordsShowAverage}
						/>
						Show average
					</label>
					<span class="text-xs text-[var(--pi-muted)]">{selectedKeywords.length} selected</span>
					<button
						type="button"
						on:click={clearSelectedKeywords}
						disabled={selectedKeywords.length === 0}
						class="rounded-xl border border-[var(--pi-border)] bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
					>
						Clear
					</button>
				</div>
			</div>

			{#if selectedKeywords.length > 0}
				<div class="mt-3 flex flex-wrap gap-2">
					{#each selectedKeywords.slice(0, 6) as kw (kw.id)}
						<span
							class="inline-flex max-w-full items-center rounded-full border border-[var(--pi-border)] bg-white px-3 py-1 text-xs font-semibold text-gray-700"
							title={kw.keyword}
						>
							<span class="truncate">{kw.keyword}</span>
						</span>
					{/each}
					{#if selectedKeywords.length > 6}
						<span class="text-xs font-semibold text-[var(--pi-muted)]">
							+{selectedKeywords.length - 6} more
						</span>
					{/if}
				</div>
			{:else if selectedGroupId !== 'all' && selectedGroupName}
				<div class="mt-3 flex flex-wrap gap-2">
					<span
						class="inline-flex max-w-full items-center rounded-full border border-[var(--pi-border)] bg-white px-3 py-1 text-xs font-semibold text-gray-700"
					>
						{selectedGroupName} (avg)
					</span>
				</div>
			{/if}

			{#if selectedKeywords.length === 0}
				<div
					class="mt-3 rounded-xl border border-[var(--pi-border)] bg-white px-4 py-3 text-sm text-[var(--pi-muted)]"
				>
					{#if selectedGroupId !== 'all'}
						Showing the <span class="font-semibold text-gray-800">group average</span> for
						<span class="font-semibold text-gray-800">{selectedGroupName || 'this group'}</span>.
						Select individual keywords below to compare multiple lines.
					{:else}
						Select keywords in the table below to compare their rankings.
					{/if}
				</div>
			{:else}
				<div class="mt-3">
					{#key `${selectedKeywordsShowAverage ? 'avg' : 'ind'}:${rangePreset}:${groupBy}:${selectedKeywordIds.join(',')}:${selectedGroupId}:sel`}
						<EChart option={buildSelectedKeywordsOption()} height={320} />
					{/key}
				</div>
			{/if}
		</div>
	</div>

	<div class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
		<div
			class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--pi-border)] px-5 py-4"
		>
			<div class="min-w-0">
				<div class="text-sm font-semibold text-gray-900">Keyword groups</div>
				<div class="mt-1 text-xs text-[var(--pi-muted)]">
					Positions are mock data (generated per keyword) until we connect real rank tracking.
				</div>
			</div>
			<div class="text-xs text-[var(--pi-muted)]">
				Latest: <span class="font-medium text-gray-800"
					>{datesDaily[datesDaily.length - 1] || '—'}</span
				>
			</div>
		</div>

		<div class="overflow-x-auto">
			<table class="min-w-full text-sm">
				<thead
					class="bg-[var(--pi-surface-2)] text-left text-xs font-semibold text-[var(--pi-muted)]"
				>
					<tr class="border-b border-[var(--pi-border)]">
						<th class="px-5 py-3"></th>
						<th class="px-5 py-3">Keyword / Group</th>
						<th class="px-5 py-3">Volume</th>
						<th class="px-5 py-3">Latest</th>
						<th class="px-5 py-3">Δ</th>
						<th class="px-5 py-3">% Top 10</th>
						<th class="px-5 py-3 text-right">Group</th>
					</tr>
				</thead>
				<tbody>
					{#if keywords.length === 0}
						<tr>
							<td colspan="7" class="px-5 py-10 text-center text-sm text-[var(--pi-muted)]">
								No keywords yet. Click <span class="font-semibold text-gray-800">Add keywords</span> to
								get started.
							</td>
						</tr>
					{:else}
						{#each groupsWithKeywords as g (g.id)}
							{@const stats = groupStats(g)}
							<tr class="border-b border-[var(--pi-border)] bg-white">
								<td class="px-5 py-3">
									<input
										type="checkbox"
										class="h-4 w-4 rounded border-gray-300 text-[var(--pi-primary)] focus:ring-[var(--pi-primary)]"
										checked={selectedGroupId === g.id}
										on:change={(e) => {
											activeMetric = 'avg_position';
											selectedGroupId = e.currentTarget.checked ? g.id : 'all';
										}}
										aria-label={`Focus group ${g.name}`}
									/>
								</td>
								<td class="px-5 py-3">
									<button
										type="button"
										on:click={() => toggleGroup(g.id)}
										class="inline-flex items-center gap-2 font-semibold text-gray-900 hover:underline"
									>
										<span
											class="grid h-6 w-6 place-items-center rounded-lg border border-[var(--pi-border)] bg-[var(--pi-surface-2)] text-[10px] text-gray-600"
											aria-hidden="true"
										>
											{expandedGroups[g.id] === false ? '+' : '–'}
										</span>
										<span>{g.name}</span>
										<span
											class="rounded-full bg-[var(--pi-surface-2)] px-2 py-0.5 text-[11px] text-gray-700"
										>
											{g.keywords.length}
										</span>
									</button>
								</td>
								<td class="px-5 py-3 text-[var(--pi-muted)]">—</td>
								<td class="px-5 py-3 font-semibold text-gray-900">
									{stats.avgLatest == null
										? '—'
										: new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(
												stats.avgLatest
											)}
								</td>
								<td class="px-5 py-3">
									{#if stats.delta == null}
										<span class="text-[var(--pi-muted)]">—</span>
									{:else}
										<span
											class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
											class:bg-emerald-50={stats.delta > 0}
											class:text-emerald-800={stats.delta > 0}
											class:bg-red-50={stats.delta < 0}
											class:text-red-700={stats.delta < 0}
											class:bg-gray-100={stats.delta === 0}
											class:text-gray-800={stats.delta === 0}
										>
											{stats.delta > 0 ? '▲' : stats.delta < 0 ? '▼' : ''}
											{new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(
												stats.delta
											)}
										</span>
									{/if}
								</td>
								<td class="px-5 py-3 font-semibold text-gray-900">{formatPct(stats.top10Share)}</td>
								<td class="px-5 py-3 text-right text-[var(--pi-muted)]">—</td>
							</tr>

							{#if expandedGroups[g.id] !== false}
								{#each g.keywords as kw (kw.id)}
									{@const kstats = keywordRowStats(kw)}
									<tr class="border-b border-[var(--pi-border)] bg-white/60">
										<td class="px-5 py-3">
											<input
												type="checkbox"
												class="h-4 w-4 rounded border-gray-300 text-[var(--pi-primary)] focus:ring-[var(--pi-primary)]"
												checked={selectedKeywordIds.includes(kw.id)}
												on:change={() => toggleKeywordSelected(kw.id)}
												aria-label={`Select ${kw.keyword}`}
											/>
										</td>
										<td class="px-5 py-3">
											<div class="font-medium text-gray-900">{kw.keyword}</div>
										</td>
										<td class="px-5 py-3 text-gray-700">{formatInt(kw.volume)}</td>
										<td class="px-5 py-3 font-semibold text-gray-900">
											{#if kstats.latestPos == null}
												<span class="text-[var(--pi-muted)]">—</span>
											{:else}
												{kstats.latestPos}
											{/if}
										</td>
										<td class="px-5 py-3">
											{#if kstats.delta == null}
												<span class="text-[var(--pi-muted)]">—</span>
											{:else}
												<span
													class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
													class:bg-emerald-50={kstats.delta > 0}
													class:text-emerald-800={kstats.delta > 0}
													class:bg-red-50={kstats.delta < 0}
													class:text-red-700={kstats.delta < 0}
													class:bg-gray-100={kstats.delta === 0}
													class:text-gray-800={kstats.delta === 0}
												>
													{kstats.delta > 0 ? '▲' : kstats.delta < 0 ? '▼' : ''}
													{new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(
														kstats.delta
													)}
												</span>
											{/if}
										</td>
										<td class="px-5 py-3 text-gray-700">
											{kstats.latestPos != null && kstats.latestPos <= 10 ? 'Yes' : 'No'}
										</td>
										<td class="px-5 py-3 text-right">
											<div class="relative inline-block">
												<select
													class="min-w-[150px] appearance-none rounded-xl border border-[var(--pi-border)] bg-white px-2 py-1 pr-8 text-xs font-semibold text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-[var(--pi-primary)]"
													on:change={(e) => setKeywordGroup(kw.id, e.currentTarget.value)}
												>
													{#each groups as gr (gr.id)}
														<option value={gr.id} selected={gr.id === kw.groupId}>{gr.name}</option>
													{/each}
												</select>
												<svg
													class="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--pi-muted)]"
													viewBox="0 0 20 20"
													fill="currentColor"
													aria-hidden="true"
												>
													<path
														fill-rule="evenodd"
														d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z"
														clip-rule="evenodd"
													/>
												</svg>
											</div>
										</td>
									</tr>
								{/each}
							{/if}
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

{#if showAddModal}
	<div class="fixed inset-0 z-50">
		<button
			type="button"
			class="absolute inset-0 bg-black/40"
			aria-label="Close"
			on:click={closeAdd}
		/>
		<div class="absolute inset-0 flex items-start justify-center p-4 pt-16">
			<div
				class="w-full max-w-2xl rounded-2xl border border-[var(--pi-border)] bg-white shadow-xl"
				role="dialog"
				aria-modal="true"
			>
				<div class="border-b border-[var(--pi-border)] px-6 py-4">
					<div class="text-lg font-semibold text-gray-900">Add keywords</div>
					<div class="mt-1 text-sm text-[var(--pi-muted)]">
						Paste one keyword per line. We’ll generate mock daily positions so you can build the UI.
					</div>
					<div class="mt-2 text-xs text-[var(--pi-muted)]">
						{#if persistenceMode === 'pb'}
							Saving to database.
						{:else}
							Saving to this browser only.
							{#if pbError}
								<span class="text-red-700">({pbError})</span>
							{/if}
						{/if}
					</div>
				</div>

				<div class="space-y-4 px-6 py-5">
					<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
						<div>
							<label class="text-sm font-semibold text-gray-900" for="group">Group</label>
									<div class="relative mt-2">
										<select
											id="group"
											bind:value={addGroupId}
											class="w-full appearance-none rounded-xl border border-[var(--pi-border)] bg-white px-3 py-2 pr-10 text-sm font-semibold text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-[var(--pi-primary)]"
										>
											{#each groups as g (g.id)}
												<option value={g.id}>{g.name}</option>
											{/each}
										</select>
										<svg
											class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pi-muted)]"
											viewBox="0 0 20 20"
											fill="currentColor"
											aria-hidden="true"
										>
											<path
												fill-rule="evenodd"
												d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z"
												clip-rule="evenodd"
											/>
										</svg>
									</div>
								</div>
						<div>
							<label class="text-sm font-semibold text-gray-900" for="newGroup"
								>Or create new group</label
							>
							<input
								id="newGroup"
								bind:value={newGroupName}
								placeholder="e.g. Meal Kits"
								class="mt-2 w-full rounded-xl border border-[var(--pi-border)] bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[var(--pi-primary)]"
							/>
						</div>
					</div>

					<div>
						<label class="text-sm font-semibold text-gray-900" for="keywords">Keywords</label>
						<div class="relative mt-2">
							<textarea
								id="keywords"
								rows="8"
								bind:value={addKeywordsText}
								class="w-full rounded-xl border border-[var(--pi-border)] bg-white px-3 py-2 pr-14 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[var(--pi-primary)]"
								placeholder={'meal kits\nmeal delivery\nmeal prep delivery'}
							/>
							<button
								type="button"
								on:click={() => {
									showAiKeywordGen = !showAiKeywordGen;
									aiGenError = '';
								}}
								class="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-lg border border-[var(--pi-border)] bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-[var(--pi-surface-2)]"
								title="Generate keywords with AI"
							>
								<span
									class="grid h-5 w-5 place-items-center rounded-md bg-[var(--pi-surface-2)] text-[var(--pi-primary)]"
									aria-hidden="true"
								>
									<svg
										viewBox="0 0 24 24"
										class="h-4 w-4"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2z" />
										<path d="M19 14l.9 3.1L23 18l-3.1.9L19 22l-.9-3.1L15 18l3.1-.9L19 14z" />
									</svg>
								</span>
								AI
							</button>
						</div>

						{#if showAiKeywordGen}
							<div class="mt-3 rounded-xl border border-[var(--pi-border)] bg-[var(--pi-surface-2)] p-4">
								<div class="flex flex-wrap items-end gap-3">
									<div class="min-w-[220px] flex-1">
										<label class="text-xs font-semibold text-gray-700" for="aiTopic">Topic</label>
										<input
											id="aiTopic"
											bind:value={aiTopic}
											placeholder="e.g. fibre broadband for business"
											class="mt-2 w-full rounded-xl border border-[var(--pi-border)] bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[var(--pi-primary)]"
										/>
									</div>
									<div class="min-w-[200px]">
										<label class="text-xs font-semibold text-gray-700" for="aiIntent">Intent</label>
										<div class="relative mt-2">
											<select
												id="aiIntent"
												bind:value={aiIntent}
												class="w-full appearance-none rounded-xl border border-[var(--pi-border)] bg-white px-3 py-2 pr-10 text-sm font-semibold text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-[var(--pi-primary)]"
											>
												<option value="Informational">Informational</option>
												<option value="Commercial">Commercial</option>
												<option value="Transactional">Transactional</option>
												<option value="LLM">LLM</option>
											</select>
											<svg
												class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pi-muted)]"
												viewBox="0 0 20 20"
												fill="currentColor"
												aria-hidden="true"
											>
												<path
													fill-rule="evenodd"
													d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z"
													clip-rule="evenodd"
												/>
											</svg>
										</div>
									</div>
									<div class="flex items-center gap-2">
										<button
											type="button"
											on:click={() => {
												showAiKeywordGen = false;
												aiGenError = '';
											}}
											class="rounded-xl border border-[var(--pi-border)] bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[var(--pi-surface-2)]"
											disabled={aiGenerating}
										>
											Close
										</button>
										<button
											type="button"
											on:click={generateKeywordsWithAI}
											disabled={aiGenerating}
											class="rounded-xl bg-[var(--pi-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[color-mix(in_oklch,var(--pi-primary)_92%,black)] disabled:opacity-60"
										>
											{aiGenerating ? 'Generating…' : 'Generate 25'}
										</button>
									</div>
								</div>

								{#if aiGenError}
									<div class="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
										{aiGenError}
									</div>
								{/if}

								<div class="mt-3 text-xs text-[var(--pi-muted)]">
									Generates 25 keyword ideas and inserts them into the textbox above (one per line).
								</div>
							</div>
						{/if}
					</div>

					{#if addError}
						<div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
							{addError}
						</div>
					{/if}
				</div>

				<div
					class="flex items-center justify-end gap-2 border-t border-[var(--pi-border)] px-6 py-4"
				>
					<button
						type="button"
						on:click={closeAdd}
						class="rounded-xl border border-[var(--pi-border)] bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[var(--pi-surface-2)]"
						disabled={savingKeywords}
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={addKeywords}
						disabled={savingKeywords}
						class="rounded-xl bg-[var(--pi-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[color-mix(in_oklch,var(--pi-primary)_92%,black)] disabled:opacity-60"
					>
						{savingKeywords ? 'Saving…' : 'Add'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
