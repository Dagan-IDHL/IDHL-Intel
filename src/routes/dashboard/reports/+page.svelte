<svelte:head>
	<title>Reports · Intel</title>
</svelte:head>

<div class="space-y-6">
	<div class="rounded-2xl border border-gray-200 bg-white p-6">
		<h2 class="text-lg font-semibold text-gray-900">Reports</h2>
		<p class="mt-1 text-sm text-gray-600">Placeholder report exports list.</p>
	</div>

	<div class="rounded-2xl border border-gray-200 bg-white p-6">
		<div class="flex items-center justify-between gap-3">
			<div class="text-sm font-semibold text-gray-900">Available exports</div>
			<button
				type="button"
				class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
			>
				Generate
			</button>
		</div>
		<div class="mt-4 divide-y divide-gray-100">
			{#each ['DA Band Gap summary (PDF)', 'Authority analysis (CSV)', 'Brand visibility (CSV)'] as r}
				<div class="flex items-center justify-between gap-3 py-3">
					<div class="text-sm text-gray-800">{r}</div>
					<span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
						Pending
					</span>
				</div>
			{/each}
		</div>
	</div>
</div>
