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
