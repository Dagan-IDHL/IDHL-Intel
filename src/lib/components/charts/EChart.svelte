<script>
	import { onDestroy, onMount } from 'svelte';

	export let option = {};
	export let height = 260;

	/** @type {HTMLDivElement | null} */
	let el = null;
	/** @type {import('echarts').ECharts | null} */
	let chart = null;
	/** @type {typeof import('echarts') | null} */
	let echarts = null;
	let ro = null;

	function set() {
		if (!chart) return;
		chart.setOption(option, { notMerge: true });
		chart.resize();
	}

	onMount(() => {
		let disposed = false;

		(async () => {
			if (!el) return;
			echarts = await import('echarts');
			if (disposed || !el) return;

			chart = echarts.init(el, undefined, { renderer: 'canvas' });
			set();

			ro = new ResizeObserver(() => {
				chart?.resize();
			});
			ro.observe(el);
		})().catch(() => {});

		return () => {
			disposed = true;
		};
	});

	onDestroy(() => {
		ro?.disconnect();
		ro = null;
		chart?.dispose();
		chart = null;
		echarts = null;
	});

	$: option, set();
</script>

<div bind:this={el} style={`height:${height}px; width: 100%;`} />
