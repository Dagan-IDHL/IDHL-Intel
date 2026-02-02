<script>
	import { page } from '$app/stores';

	$: userEmail = $page.data?.user?.email || '';
</script>

<svelte:head>
	<title>Pulse Insight — Dashboard</title>
</svelte:head>

<div class="space-y-6">
	<div class="rounded-2xl border border-[var(--pi-border)] bg-white p-6 shadow-sm md:p-8">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="min-w-0">
				<h1 class="text-2xl font-bold tracking-tight text-gray-900">Welcome</h1>
				<p class="mt-2 text-sm text-[var(--pi-muted)]">
					Select a client in the sidebar to view Data, run Custom Analysis, and build Reports.
				</p>
				{#if userEmail}
					<p class="mt-3 text-xs text-[var(--pi-muted)]">Signed in as {userEmail}</p>
				{/if}
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<a
					href="/dashboard/clients"
					class="rounded-xl border border-[var(--pi-border)] bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-[var(--pi-surface-2)]"
				>
					View clients
				</a>
				<a
					href="/dashboard/clients/new"
					class="rounded-xl bg-[var(--pi-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[color-mix(in_oklch,var(--pi-primary)_92%,black)]"
				>
					Create client
				</a>
			</div>
		</div>
	</div>
</div>
