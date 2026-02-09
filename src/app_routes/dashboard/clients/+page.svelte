<script>
	export let data;

	let clients = data?.clients || [];

	let showClientSettings = false;
	let savingClientSettings = false;
	let clientSettingsError = '';
	let editingClientId = '';
	let editClientName = '';
	let editClientUrl = '';

	function openClientSettings(client) {
		clientSettingsError = '';
		editingClientId = client?.id || '';
		editClientName = String(client?.clientName || '');
		editClientUrl = String(client?.url || '');
		showClientSettings = true;
	}

	function closeClientSettings() {
		showClientSettings = false;
		clientSettingsError = '';
		editingClientId = '';
	}

	async function saveClientSettings() {
		if (!editingClientId) return;
		if (savingClientSettings) return;
		clientSettingsError = '';
		savingClientSettings = true;
		try {
			const res = await fetch(`/api/clients/${editingClientId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ clientName: editClientName, url: editClientUrl })
			});
			const payload = await res.json().catch(() => null);
			if (!res.ok) throw new Error(payload?.error || 'Failed to update client');
			clients = clients.map((c) => (c.id === editingClientId ? { ...c, ...payload } : c));
			closeClientSettings();
		} catch (e) {
			clientSettingsError = e?.message || 'Failed to update client';
		} finally {
			savingClientSettings = false;
		}
	}
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
		{#each clients as client (client.id)}
			<div
				class="rounded-2xl border border-[var(--pi-border)] bg-white p-5 shadow-sm transition-colors hover:bg-[var(--pi-surface-2)]"
			>
				<div class="flex items-start gap-4">
					<img
						alt={`${client.clientName} favicon`}
						class="h-12 w-12 shrink-0 rounded-xl border border-[var(--pi-border)] bg-white object-contain p-2"
						src={`https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(
							client.url || ''
						)}`}
						loading="lazy"
						referrerpolicy="no-referrer"
					/>
					<div class="min-w-0 flex-1">
						<div class="text-base font-semibold text-gray-900">{client.clientName}</div>
						<div class="mt-1 truncate text-sm text-[var(--pi-muted)]">{client.url}</div>
					</div>
				</div>

				<div class="mt-4 flex items-center justify-end gap-2">
					<button
						type="button"
						on:click={() => openClientSettings(client)}
						class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500 shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-700"
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
					<a
						href={`/dashboard/${client.id}/data`}
						class="inline-flex items-center gap-2 rounded-xl bg-[var(--pi-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[color-mix(in_oklch,var(--pi-primary)_92%,black)]"
					>
						Open
						<span aria-hidden="true">→</span>
					</a>
				</div>
			</div>
		{/each}
	</div>
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
