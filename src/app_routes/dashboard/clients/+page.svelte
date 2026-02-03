<script>
	export let data;
</script>

<svelte:head>
	<title>Pulse Insight — Clients</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h2 class="text-xl font-semibold text-gray-900">Clients</h2>
			<p class="mt-1 text-sm text-[var(--pi-muted)]">
				{data?.error ? data.error : 'Your accessible clients.'}
			</p>
		</div>

		<a
			href="/dashboard/clients/new"
			class="inline-flex items-center rounded-xl bg-[var(--pi-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[color-mix(in_oklch,var(--pi-primary)_92%,black)]"
		>
			Create client
		</a>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
		{#each data?.clients || [] as client (client.id)}
			<a
				href={`/dashboard/${client.id}/data`}
				class="rounded-2xl border border-[var(--pi-border)] bg-white p-5 shadow-sm transition-colors hover:bg-[var(--pi-surface-2)]"
			>
				<div class="text-sm font-semibold text-gray-900">{client.clientName}</div>
				<div class="mt-1 truncate text-xs text-[var(--pi-muted)]">{client.url}</div>
				<div
					class="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[var(--pi-primary)]"
				>
					Open
					<span aria-hidden="true">→</span>
				</div>
			</a>
		{/each}
	</div>
</div>
