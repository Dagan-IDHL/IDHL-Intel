<svelte:head>
	<title>Pulse Insight</title>
</svelte:head>

<div class="min-h-screen px-6 py-16">
	<div class="mx-auto max-w-3xl">
		<div class="rounded-2xl border border-[var(--pi-border)] bg-white p-8 shadow-sm">
			<div class="flex items-center gap-3">
				<div
					class="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[var(--pi-primary)] via-[var(--pi-primary-2)] to-[var(--pi-accent)] text-white shadow-sm"
				>
					<span class="text-sm font-semibold">PI</span>
				</div>
				<div>
					<div class="text-sm font-semibold text-gray-900">Pulse Insight</div>
					<div class="text-xs text-[var(--pi-muted)]">Marketing reporting suite</div>
				</div>
			</div>

			<h1 class="mt-8 text-3xl font-bold text-gray-900">UI preview</h1>
			<p class="mt-2 text-sm text-[var(--pi-muted)]">
				This environment uses mock data and placeholder auth. Styling and layout are representative
				of the final product.
			</p>

			<div class="mt-8 flex flex-wrap gap-3">
				<a
					href="/login"
					class="rounded-xl bg-[var(--pi-primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[color-mix(in_oklch,var(--pi-primary)_92%,black)]"
					>Login</a
				>
				<a
					href="/dashboard"
					class="rounded-xl border border-[var(--pi-border)] bg-white px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-[var(--pi-surface-2)]"
					>Dashboard</a
				>
			</div>
		</div>
	</div>
</div>
