import { METRIC_META } from './constants.js';

/**
 * @param {Object} args
 * @param {string} args.metric
 * @param {{date:string,value:number}[]} args.currentPoints
 * @param {{date:string,value:number}[]} [args.comparePoints]
 * @param {'off'|'mom'|'yoy'} args.compareMode
 */
export function buildTimeSeriesOption({
	metric,
	currentPoints,
	comparePoints = [],
	compareMode,
	granularity = 'auto'
}) {
	const meta = METRIC_META?.[metric];
	const unit = meta?.unit ?? 'number';

	const x = currentPoints.map((p) => p.date);
	const currentY = currentPoints.map((p) => p.value);

	const hasCompare = compareMode !== 'off' && comparePoints.length > 0;
	const compareY = comparePoints.map((p) => p.value);

	const formatYAxis = (v) => {
		if (unit === 'percent') return `${Math.round(v * 100)}%`;
		if (unit === 'currency') return `£${Math.round(v).toLocaleString('en-GB')}`;
		return Math.round(v).toLocaleString('en-GB');
	};

	return {
		grid: { left: 40, right: 18, top: 10, bottom: 30 },
		tooltip: { trigger: 'axis' },
		xAxis: {
			type: 'category',
			data: x,
			axisLabel: {
				color: '#6b7280',
				hideOverlap: true,
				formatter: (v) => {
					if (granularity === 'monthly' && typeof v === 'string') return v.slice(0, 7);
					return v;
				}
			},
			axisTick: { show: false },
			axisLine: { lineStyle: { color: '#e5e7eb' } }
		},
		yAxis: {
			type: 'value',
			axisLabel: { color: '#6b7280', formatter: formatYAxis },
			splitLine: { lineStyle: { color: '#f3f4f6' } }
		},
		series: [
			{
				name: 'Current',
				type: 'line',
				data: currentY,
				smooth: true,
				showSymbol: false,
				lineStyle: { width: 3, color: '#404b77' },
				areaStyle: { opacity: 0.08, color: '#404b77' }
			},
			...(hasCompare
				? [
						{
							name: compareMode === 'yoy' ? 'YoY' : 'MoM',
							type: 'line',
							data: compareY,
							smooth: true,
							showSymbol: false,
							lineStyle: { width: 2, type: 'dashed', color: '#9ca3af' }
						}
					]
				: [])
		]
	};
}

/**
 * @param {Object} args
 * @param {string} args.metric
 * @param {{label:string, points:{date:string,value:number}[]}[]} args.currentSegments
 * @param {string} args.granularity
 */
export function buildStackedSplitOption({ metric, currentSegments, granularity = 'auto' }) {
	const meta = METRIC_META?.[metric];
	const unit = meta?.unit ?? 'number';

	const x = currentSegments?.[0]?.points?.map((p) => p.date) || [];

	const formatYAxis = (v) => {
		if (unit === 'percent') return `${Math.round(v * 100)}%`;
		if (unit === 'currency') return `Â£${Math.round(v).toLocaleString('en-GB')}`;
		return Math.round(v).toLocaleString('en-GB');
	};

	const palette = ['#404b77', '#9aa3c5', '#c7cbe0'];

	return {
		grid: { left: 44, right: 18, top: 10, bottom: 30 },
		tooltip: { trigger: 'axis' },
		legend: { top: 0, left: 0, textStyle: { color: '#6b7280', fontSize: 11 } },
		xAxis: {
			type: 'category',
			data: x,
			axisLabel: {
				color: '#6b7280',
				hideOverlap: true,
				formatter: (v) => {
					if (granularity === 'monthly' && typeof v === 'string') return v.slice(0, 7);
					return v;
				}
			},
			axisTick: { show: false },
			axisLine: { lineStyle: { color: '#e5e7eb' } }
		},
		yAxis: {
			type: 'value',
			axisLabel: { color: '#6b7280', formatter: formatYAxis },
			splitLine: { lineStyle: { color: '#f3f4f6' } }
		},
		series: (currentSegments || []).map((seg, idx) => ({
			name: seg.label,
			type: 'line',
			stack: 'total',
			smooth: true,
			showSymbol: false,
			lineStyle: { width: 2, color: palette[idx % palette.length] },
			areaStyle: { opacity: 0.14, color: palette[idx % palette.length] },
			data: (seg.points || []).map((p) => p.value)
		}))
	};
}

/**
 * @param {Object} args
 * @param {string} args.metric
 * @param {{key:string,value:number}[]} args.rows
 */
export function buildHorizontalBarOption({ metric, rows }) {
	const meta = METRIC_META?.[metric];
	const unit = meta?.unit ?? 'number';

	const categories = (rows || []).map((r) => r.key).reverse();
	const values = (rows || []).map((r) => r.value).reverse();

	const formatXAxis = (v) => {
		if (unit === 'percent') return `${Math.round(v * 100)}%`;
		if (unit === 'currency') return `Â£${Math.round(v).toLocaleString('en-GB')}`;
		return Math.round(v).toLocaleString('en-GB');
	};

	return {
		grid: { left: 10, right: 18, top: 10, bottom: 10, containLabel: true },
		tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
		xAxis: {
			type: 'value',
			axisLabel: { color: '#6b7280', formatter: formatXAxis },
			splitLine: { lineStyle: { color: '#f3f4f6' } }
		},
		yAxis: {
			type: 'category',
			data: categories,
			axisLabel: { color: '#6b7280', width: 140, overflow: 'truncate' },
			axisTick: { show: false },
			axisLine: { lineStyle: { color: '#e5e7eb' } }
		},
		series: [
			{
				type: 'bar',
				data: values,
				itemStyle: { color: '#404b77' },
				barWidth: 14,
				borderRadius: [6, 6, 6, 6]
			}
		]
	};
}
