<script>
	import { page } from '$app/stores';
	import CardGrid from '$lib/components/ui/CardGrid.svelte';
	import GraphFromSpec from '$lib/components/ai/GraphFromSpec.svelte';
	import { customGraphsByClient, removeCustomGraph } from '$lib/stores/customAnalysisGraphs.js';

	const clientId = $derived($page.params.clientId);
	let graphs = $state([]);

	$effect(() => {
		const id = clientId;
		const unsub = customGraphsByClient.subscribe((m) => {
			const next = Array.isArray(m?.[id]) ? m[id] : [];
			graphs = next;
		});
		return unsub;
	});
</script>

<svelte:head>
	<title>Custom Analysis</title>
</svelte:head>

<div class="space-y-4">
	<div class="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<div class="font-semibold text-gray-900">Custom Analysis</div>
				<div class="mt-1 text-gray-600">AI-generated graphs you add from the chatbot.</div>
			</div>
			<div class="text-xs text-gray-500">Use the bottom-right chat to generate graphs.</div>
		</div>
	</div>

	{#if graphs.length === 0}
		<div
			class="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-600"
		>
			No custom graphs yet.
		</div>
	{:else}
		<CardGrid cols={2}>
			{#each graphs as g (g.id)}
				<GraphFromSpec {clientId} spec={g.spec}>
					<button
						slot="actions"
						type="button"
						class="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
						on:click={() => removeCustomGraph(clientId, g.id)}
					>
						Remove
					</button>
				</GraphFromSpec>
			{/each}
		</CardGrid>
	{/if}
</div>
