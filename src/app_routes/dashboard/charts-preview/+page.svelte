<script>
	import TimeSeriesDemo from '$lib/components/analytics/TimeSeriesDemo.svelte';
</script>

<svelte:head>
	<title>Charts Preview</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold text-gray-900">Phase 2 — Cards + Charts</h2>
		<p class="mt-1 text-sm text-gray-600">
			Temporary page to validate the card system, formatting, responsive grid, and ECharts
			rendering.
		</p>
	</div>

	<TimeSeriesDemo />
</div>
