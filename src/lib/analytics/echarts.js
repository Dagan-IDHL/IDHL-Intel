import { METRIC_META } from './constants.js';

const PALETTE = {
	primary: '#2430A6',
	primarySoft: '#9EA7FF',
	accent: '#08B4C6',
	neutral: '#98A2B3',
	grid: '#EAECF0',
	axis: '#D0D5DD',
	text: '#667085'
};

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
		grid: { left: 44, right: 18, top: 10, bottom: 34, containLabel: true },
		tooltip: {
			trigger: 'axis',
			backgroundColor: '#ffffff',
			borderColor: PALETTE.axis,
			borderWidth: 1,
			textStyle: { color: '#101828' }
		},
		xAxis: {
			type: 'category',
			data: x,
			axisLabel: {
				color: PALETTE.text,
				hideOverlap: true,
				formatter: (v) => {
					if (granularity === 'monthly' && typeof v === 'string') return v.slice(0, 7);
					return v;
				}
			},
			axisTick: { show: false },
			axisLine: { lineStyle: { color: PALETTE.axis } }
		},
		yAxis: {
			type: 'value',
			axisLabel: { color: PALETTE.text, formatter: formatYAxis },
			splitLine: { lineStyle: { color: PALETTE.grid } }
		},
		series: [
			{
				name: 'Current',
				type: 'line',
				data: currentY,
				smooth: true,
				showSymbol: false,
				lineStyle: { width: 3, color: PALETTE.primary },
				areaStyle: { opacity: 0.1, color: PALETTE.primary }
			},
			...(hasCompare
				? [
						{
							name: compareMode === 'yoy' ? 'YoY' : 'MoM',
							type: 'line',
							data: compareY,
							smooth: true,
							showSymbol: false,
							lineStyle: { width: 2, type: 'dashed', color: PALETTE.neutral }
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
		if (unit === 'currency') return `£${Math.round(v).toLocaleString('en-GB')}`;
		return Math.round(v).toLocaleString('en-GB');
	};

	const palette = [PALETTE.primary, PALETTE.accent, PALETTE.primarySoft, '#7B61FF'];

	return {
		grid: { left: 44, right: 18, top: 10, bottom: 34, containLabel: true },
		tooltip: {
			trigger: 'axis',
			backgroundColor: '#ffffff',
			borderColor: PALETTE.axis,
			borderWidth: 1,
			textStyle: { color: '#101828' }
		},
		legend: { top: 0, left: 0, textStyle: { color: PALETTE.text, fontSize: 11 } },
		xAxis: {
			type: 'category',
			data: x,
			axisLabel: {
				color: PALETTE.text,
				hideOverlap: true,
				formatter: (v) => {
					if (granularity === 'monthly' && typeof v === 'string') return v.slice(0, 7);
					return v;
				}
			},
			axisTick: { show: false },
			axisLine: { lineStyle: { color: PALETTE.axis } }
		},
		yAxis: {
			type: 'value',
			axisLabel: { color: PALETTE.text, formatter: formatYAxis },
			splitLine: { lineStyle: { color: PALETTE.grid } }
		},
		series: (currentSegments || []).map((seg, idx) => ({
			name: seg.label,
			type: 'line',
			stack: 'total',
			smooth: true,
			showSymbol: false,
			lineStyle: { width: 2, color: palette[idx % palette.length] },
			areaStyle: { opacity: 0.16, color: palette[idx % palette.length] },
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
		if (unit === 'currency') return `£${Math.round(v).toLocaleString('en-GB')}`;
		return Math.round(v).toLocaleString('en-GB');
	};

	return {
		grid: { left: 10, right: 18, top: 10, bottom: 10, containLabel: true },
		tooltip: {
			trigger: 'axis',
			axisPointer: { type: 'shadow' },
			backgroundColor: '#ffffff',
			borderColor: PALETTE.axis,
			borderWidth: 1,
			textStyle: { color: '#101828' }
		},
		xAxis: {
			type: 'value',
			axisLabel: { color: PALETTE.text, formatter: formatXAxis },
			splitLine: { lineStyle: { color: PALETTE.grid } }
		},
		yAxis: {
			type: 'category',
			data: categories,
			axisLabel: { color: PALETTE.text, width: 140, overflow: 'truncate' },
			axisTick: { show: false },
			axisLine: { lineStyle: { color: PALETTE.axis } }
		},
		series: [
			{
				type: 'bar',
				data: values,
				itemStyle: { color: PALETTE.primary },
				barWidth: 14,
				borderRadius: [6, 6, 6, 6]
			}
		]
	};
}
