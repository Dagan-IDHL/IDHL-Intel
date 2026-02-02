<svelte:head>
	<title>Pulse Insight — Create Client</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-6 pb-8">
	<div class="rounded-2xl border border-[var(--pi-border)] bg-white p-6 shadow-sm md:p-8">
		<a
			href="/dashboard/clients"
			class="inline-flex items-center gap-2 rounded-xl border border-[var(--pi-border)] bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-[var(--pi-surface-2)]"
		>
			<svg
				class="h-5 w-5"
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<line x1="19" y1="12" x2="5" y2="12" />
				<polyline points="12 19 5 12 12 5" />
			</svg>
			<span>Back to clients</span>
		</a>

		<h1 class="mt-6 text-2xl font-bold tracking-tight text-gray-900">Create client</h1>
		<p class="mt-2 text-sm text-[var(--pi-muted)]">
			This is UI-only for now. Fields don’t create records yet.
		</p>
	</div>

	<form class="rounded-2xl border border-[var(--pi-border)] bg-white p-6 shadow-sm md:p-8">
		<div class="mb-6">
			<label for="clientName" class="mb-2 block text-sm font-semibold text-gray-900">
				Client name
			</label>
			<input
				type="text"
				id="clientName"
				placeholder="e.g., Acme Corporation"
				class="w-full rounded-xl border border-[var(--pi-border)] bg-white px-4 py-3 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-[var(--pi-focus)] focus:outline-none"
			/>
			<p class="mt-1 text-xs text-[var(--pi-muted)]">The name of your client or project.</p>
		</div>

		<div class="mb-8">
			<label for="url" class="mb-2 block text-sm font-semibold text-gray-900">Website URL</label>
			<input
				type="url"
				id="url"
				placeholder="e.g., https://example.com"
				class="w-full rounded-xl border border-[var(--pi-border)] bg-white px-4 py-3 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-[var(--pi-focus)] focus:outline-none"
			/>
			<p class="mt-1 text-xs text-[var(--pi-muted)]">Used for icons and analytics context.</p>
		</div>

		<div class="flex gap-4">
			<button
				type="button"
				class="flex-1 rounded-xl bg-[var(--pi-primary)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[color-mix(in_oklch,var(--pi-primary)_92%,black)]"
			>
				Create client
			</button>
			<a
				href="/dashboard/clients"
				class="flex-1 rounded-xl border border-[var(--pi-border)] bg-white px-6 py-3 text-center text-sm font-semibold text-gray-900 transition-colors hover:bg-[var(--pi-surface-2)]"
			>
				Cancel
			</a>
		</div>
	</form>

	<div class="rounded-2xl border border-[var(--pi-border)] bg-white p-6 shadow-sm">
		<h3 class="text-sm font-semibold text-gray-900">Next steps</h3>
		<ul class="mt-3 space-y-2 text-sm text-[var(--pi-muted)]">
			<li>✓ Select the client from the sidebar dropdown</li>
			<li>✓ Explore Data and Custom Analysis</li>
			<li>✓ Build a client-ready report</li>
		</ul>
	</div>
</div>
