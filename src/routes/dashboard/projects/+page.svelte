<svelte:head>
	<title>Projects · Intel</title>
</svelte:head>

<div class="space-y-6">
	<div class="rounded-2xl border border-gray-200 bg-white p-6">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<h2 class="text-lg font-semibold text-gray-900">Projects</h2>
				<p class="mt-1 text-sm text-gray-600">UI-only list. No data loading yet.</p>
			</div>
			<button
				type="button"
				class="rounded-lg bg-[#404b77] px-4 py-2 text-sm font-semibold text-white hover:bg-[#505c8f]"
			>
				New project
			</button>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		{#each ['Liverpool FC', 'IDHL', 'Example Client'] as name}
			<div class="rounded-2xl border border-gray-200 bg-white p-5">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<div class="truncate text-sm font-semibold text-gray-900">{name}</div>
						<div class="mt-1 text-xs text-gray-500">Last updated: —</div>
					</div>
					<span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
						Draft
					</span>
				</div>
				<div class="mt-4 flex flex-wrap gap-2">
					<a
						href="/dashboard/tools"
						class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
						>Open tools</a
					>
					<button
						type="button"
						class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
					>
						Settings
					</button>
				</div>
			</div>
		{/each}
	</div>
</div>
