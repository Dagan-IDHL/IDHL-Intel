<script>
	import { page } from '$app/stores';
	import { MOCK_CLIENTS } from '$lib/mock/clients.js';

	let { children } = $props();

	const clientId = $derived($page.params.clientId);
	const client = $derived(MOCK_CLIENTS.find((c) => c.id === clientId) || null);

	const tabs = $derived([
		{ name: 'Data', href: `/dashboard/${clientId}/data` },
		{ name: 'Custom Analysis', href: `/dashboard/${clientId}/custom-analysis` },
		{ name: 'Report', href: `/dashboard/${clientId}/report` }
	]);

	const activeHref = $derived($page.url.pathname);

	function isActive(href) {
		return activeHref === href;
	}
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="min-w-0">
			<div class="text-xs font-semibold tracking-wide text-[var(--pi-muted)] uppercase">Client</div>
			<div class="mt-1 truncate text-lg font-semibold text-gray-900">
				{client?.clientName || clientId}
			</div>
			{#if client?.url}
				<div class="truncate text-sm text-[var(--pi-muted)]">{client.url}</div>
			{/if}
		</div>

		<nav class="flex flex-wrap gap-2" aria-label="Client tabs">
			{#each tabs as tab (tab.href)}
				<a
					href={tab.href}
					class="rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
					class:bg-[var(--pi-primary)]={isActive(tab.href)}
					class:text-white={isActive(tab.href)}
					class:text-gray-700={!isActive(tab.href)}
					class:border={!isActive(tab.href)}
					class:border-[var(--pi-border)]={!isActive(tab.href)}
					class:bg-white={!isActive(tab.href)}
					class:hover:bg-[var(--pi-surface-2)]={!isActive(tab.href)}
				>
					{tab.name}
				</a>
			{/each}
		</nav>
	</div>

	{@render children()}
</div>
