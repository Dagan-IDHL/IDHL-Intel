<script>
	import { MOCK_CLIENTS } from '$lib/mock/clients.js';
</script>

<svelte:head>
	<title>Clients</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h2 class="text-xl font-semibold text-gray-900">Clients</h2>
			<p class="mt-1 text-sm text-gray-600">Mock client list (Phase 0).</p>
		</div>

		<a
			href="/dashboard/clients/new"
			class="inline-flex items-center rounded-lg bg-[#404b77] px-4 py-2 text-sm font-semibold text-white hover:bg-[#505c8f]"
		>
			Create client
		</a>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
		{#each MOCK_CLIENTS as client (client.id)}
			<a
				href={`/dashboard/${client.id}/data`}
				class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
			>
				<div class="text-sm font-semibold text-gray-900">{client.clientName}</div>
				<div class="mt-1 truncate text-xs text-gray-600">{client.url}</div>
				<div class="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#404b77]">
					Open
					<span aria-hidden="true">→</span>
				</div>
			</a>
		{/each}
	</div>
</div>
