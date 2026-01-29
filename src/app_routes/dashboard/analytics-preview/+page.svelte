<script>
	import AnalyticsFilterBar from '$lib/components/AnalyticsFilterBar.svelte';
</script>

<svelte:head>
	<title>Analytics Preview</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold text-gray-900">Phase 1 — Analytics (Mock)</h2>
		<p class="mt-1 text-sm text-gray-600">
			This is a temporary preview page to validate date ranges, MoM/YoY logic, and the provider
			contract.
		</p>
	</div>

	<AnalyticsFilterBar />
</div>
