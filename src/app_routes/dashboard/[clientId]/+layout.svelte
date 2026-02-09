<script>
	import { page } from '$app/stores';

	let { children, data } = $props();

	const clientId = $derived($page.params.clientId);
	let clientOverride = null;
	const client = $derived(clientOverride || data?.client || null);

	const tabs = $derived([
		{ name: 'Data', href: `/dashboard/${clientId}/data`, match: 'prefix' },
		{ name: 'Organic', href: `/dashboard/${clientId}/organic/keywords`, match: 'prefix' },
		{ name: 'Custom Analysis', href: `/dashboard/${clientId}/custom-analysis`, match: 'prefix' },
		{ name: 'Report', href: `/dashboard/${clientId}/report`, match: 'prefix' }
	]);

	const activeHref = $derived($page.url.pathname);

	function isActive(href, match = 'exact') {
		if (match === 'prefix') return activeHref === href || activeHref.startsWith(`${href}/`);
		return activeHref === href;
	}

	let showClientSettings = false;
	let savingClientSettings = false;
	let clientSettingsError = '';
	let editClientName = '';
	let editClientUrl = '';

	function openClientSettings() {
		clientSettingsError = '';
		editClientName = String(client?.clientName || '');
		editClientUrl = String(client?.url || '');
		showClientSettings = true;
	}

	function closeClientSettings() {
		showClientSettings = false;
		clientSettingsError = '';
	}

	async function saveClientSettings() {
		if (!clientId) return;
		if (savingClientSettings) return;
		clientSettingsError = '';
		savingClientSettings = true;
		try {
			const res = await fetch(`/api/clients/${clientId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ clientName: editClientName, url: editClientUrl })
			});
			const payload = await res.json().catch(() => null);
			if (!res.ok) throw new Error(payload?.error || 'Failed to update client');
			clientOverride = payload;
			closeClientSettings();
		} catch (e) {
			clientSettingsError = e?.message || 'Failed to update client';
		} finally {
			savingClientSettings = false;
		}
	}
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="min-w-0">
			<div class="flex items-center gap-2">
				<button
					type="button"
					on:click={openClientSettings}
					class="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--pi-border)] bg-white text-[var(--pi-muted)] transition-colors hover:bg-[var(--pi-surface-2)] hover:text-gray-700"
					aria-label="Edit client"
					title="Edit client"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="h-4 w-4"
						aria-hidden="true"
					>
						<path
							d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
						/>
						<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
					</svg>
				</button>
				<div class="text-xs font-semibold tracking-wide text-[var(--pi-muted)] uppercase">
					Client
				</div>
			</div>
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
					class:bg-[var(--pi-primary)]={isActive(tab.href, tab.match || 'exact')}
					class:text-white={isActive(tab.href, tab.match || 'exact')}
					class:text-gray-700={!isActive(tab.href, tab.match || 'exact')}
					class:border={!isActive(tab.href, tab.match || 'exact')}
					class:border-[var(--pi-border)]={!isActive(tab.href, tab.match || 'exact')}
					class:bg-white={!isActive(tab.href, tab.match || 'exact')}
					class:hover:bg-[var(--pi-surface-2)]={!isActive(tab.href, tab.match || 'exact')}
				>
					{tab.name}
				</a>
			{/each}
		</nav>
	</div>

	{@render children()}
</div>

{#if showClientSettings}
	<div class="fixed inset-0 z-[60]">
		<button
			type="button"
			class="absolute inset-0 bg-black/40"
			aria-label="Close"
			on:click={closeClientSettings}
		/>

		<div class="absolute inset-0 flex items-start justify-center p-4 pt-16">
			<div
				class="w-full max-w-lg rounded-2xl border border-[var(--pi-border)] bg-white shadow-xl"
				role="dialog"
				aria-modal="true"
			>
				<div class="border-b border-[var(--pi-border)] px-6 py-4">
					<div class="text-lg font-semibold text-gray-900">Client settings</div>
					<div class="mt-1 text-sm text-[var(--pi-muted)]">
						Update the client name and website URL.
					</div>
				</div>

				<div class="space-y-4 px-6 py-5">
					<div>
						<label class="text-sm font-semibold text-gray-900" for="clientName">Client name</label>
						<input
							id="clientName"
							class="mt-2 w-full rounded-xl border border-[var(--pi-border)] bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[var(--pi-primary)]"
							bind:value={editClientName}
							placeholder="Client name"
						/>
					</div>

					<div>
						<label class="text-sm font-semibold text-gray-900" for="clientUrl">Website URL</label>
						<input
							id="clientUrl"
							class="mt-2 w-full rounded-xl border border-[var(--pi-border)] bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[var(--pi-primary)]"
							bind:value={editClientUrl}
							placeholder="https://example.com"
						/>
					</div>

					{#if clientSettingsError}
						<div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
							{clientSettingsError}
						</div>
					{/if}
				</div>

				<div
					class="flex items-center justify-end gap-2 border-t border-[var(--pi-border)] px-6 py-4"
				>
					<button
						type="button"
						on:click={closeClientSettings}
						class="rounded-xl border border-[var(--pi-border)] bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[var(--pi-surface-2)]"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={saveClientSettings}
						disabled={savingClientSettings}
						class="rounded-xl bg-[var(--pi-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[color-mix(in_oklch,var(--pi-primary)_92%,black)] disabled:opacity-50"
					>
						{savingClientSettings ? 'Saving…' : 'Save'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
