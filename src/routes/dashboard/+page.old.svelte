<!-- Old dashboard UI kept for reference (replaced with Sidekick UI) -->
<svelte:head>
	<title>Dashboard · Intel</title>
</svelte:head>

<div class="space-y-6">
	<div class="rounded-2xl border border-gray-200 bg-white p-6">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<h2 class="text-lg font-semibold text-gray-900">Welcome</h2>
				<p class="mt-1 text-sm text-gray-600">This is a UI-only dashboard shell.</p>
			</div>
			<div class="flex gap-2">
				<a
					href="/dashboard/projects"
					class="rounded-lg bg-[#404b77] px-4 py-2 text-sm font-semibold text-white hover:bg-[#505c8f]"
					>New project</a
				>
				<a
					href="/dashboard/tools"
					class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
					>View tools</a
				>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
		<div class="rounded-2xl border border-gray-200 bg-white p-5">
			<div class="text-xs font-semibold tracking-wide text-gray-500 uppercase">Account Status</div>
			<div class="mt-3 text-3xl font-semibold text-gray-900">Standard</div>
			<div class="mt-1 text-sm text-gray-600">Placeholder status badge.</div>
		</div>
		<div class="rounded-2xl border border-gray-200 bg-white p-5">
			<div class="text-xs font-semibold tracking-wide text-gray-500 uppercase">Active Client</div>
			<div class="mt-3 text-xl font-semibold text-gray-900">—</div>
			<div class="mt-1 text-sm text-gray-600">Client selector not wired up.</div>
		</div>
		<div class="rounded-2xl border border-gray-200 bg-white p-5">
			<div class="text-xs font-semibold tracking-wide text-gray-500 uppercase">Notifications</div>
			<div class="mt-3 text-xl font-semibold text-gray-900">0</div>
			<div class="mt-1 text-sm text-gray-600">UI only.</div>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<div class="rounded-2xl border border-gray-200 bg-white p-6">
			<div class="flex items-center justify-between gap-3">
				<h3 class="text-sm font-semibold text-gray-900">Recent projects</h3>
				<a href="/dashboard/projects" class="text-sm font-semibold text-[#404b77] hover:underline"
					>View all</a
				>
			</div>
			<div class="mt-4 space-y-3">
				<div class="rounded-xl border border-gray-200 p-4">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<div class="truncate text-sm font-semibold text-gray-900">DA Band Gap</div>
							<div class="mt-1 text-xs text-gray-500">Created today · Status: Draft</div>
						</div>
						<span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700"
							>UI</span
						>
					</div>
				</div>
				<div class="rounded-xl border border-gray-200 p-4">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<div class="truncate text-sm font-semibold text-gray-900">Authority Analysis</div>
							<div class="mt-1 text-xs text-gray-500">Yesterday · Status: Draft</div>
						</div>
						<span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700"
							>UI</span
						>
					</div>
				</div>
			</div>
		</div>

		<div class="rounded-2xl border border-gray-200 bg-white p-6">
			<h3 class="text-sm font-semibold text-gray-900">Quick links</h3>
			<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
				<a
					href="/dashboard/tools"
					class="rounded-xl border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100"
				>
					<div class="text-sm font-semibold text-gray-900">Tools</div>
					<div class="mt-1 text-xs text-gray-600">DA Band Gap, reporting, more.</div>
				</a>
				<a
					href="/dashboard/reports"
					class="rounded-xl border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100"
				>
					<div class="text-sm font-semibold text-gray-900">Reports</div>
					<div class="mt-1 text-xs text-gray-600">Exportable outputs (placeholder).</div>
				</a>
				<a
					href="/dashboard/projects"
					class="rounded-xl border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100"
				>
					<div class="text-sm font-semibold text-gray-900">Projects</div>
					<div class="mt-1 text-xs text-gray-600">All client workspaces.</div>
				</a>
				<a
					href="/dashboard/settings"
					class="rounded-xl border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100"
				>
					<div class="text-sm font-semibold text-gray-900">Settings</div>
					<div class="mt-1 text-xs text-gray-600">Profile and preferences.</div>
				</a>
			</div>
		</div>
	</div>
</div>
