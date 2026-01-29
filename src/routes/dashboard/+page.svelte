<script>
	import { page } from '$app/stores';

	$: userEmail = $page.data?.user?.email || '';
</script>

<div class="space-y-6">
	<div
		class="rounded-xl border border-[#404b77]/15 bg-gradient-to-r from-[#404b77] to-[#505c8f] p-8 text-white shadow-sm"
	>
		<h1 class="text-3xl font-bold">Welcome to IDHL Sidekick</h1>
		<p class="mt-2 text-white/90">
			The product is still in development, please report any issues to Dagan Price.
		</p>
		{#if userEmail}
			<p class="mt-4 text-sm text-white/80">
				Signed in as: <span class="font-semibold">{userEmail}</span>
			</p>
		{/if}
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<div class="rounded-lg border border-gray-200 bg-white p-6 lg:col-span-2">
			<h2 class="text-lg font-semibold text-gray-900">Getting started</h2>
			<ol class="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
				<li>Select (or create) a client project using the selector in the left sidebar.</li>
				<li>
					Open <span class="font-semibold">Tools</span> and choose
					<span class="font-semibold">DA Band Gap</span>.
				</li>
				<li>Create a project, then Run to generate charts and exports.</li>
			</ol>
			<div class="mt-5 flex flex-wrap gap-3">
				<a
					href="/dashboard/da-band-gap"
					class="inline-flex items-center rounded-lg bg-[#404b77] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#505c8f]"
				>
					Go to DA Band Gap
				</a>
				<a
					href="/dashboard/clients/new"
					class="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
				>
					Create client project
				</a>
			</div>
		</div>

		<div class="rounded-lg border border-gray-200 bg-white p-6">
			<h2 class="text-lg font-semibold text-gray-900">Reporting issues</h2>
			<ul class="mt-3 space-y-2 text-sm text-gray-700">
				<li>Include the page URL and what you clicked.</li>
				<li>Paste any error message shown in the UI.</li>
				<li>If possible, include a screenshot.</li>
			</ul>
			<div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
				If something looks stuck, refresh the page and try again.
			</div>
		</div>
	</div>

	<div class="rounded-lg border border-gray-200 bg-white p-6">
		<h2 class="text-lg font-semibold text-gray-900">Available now</h2>
		<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
			<a
				href="/dashboard/da-band-gap"
				class="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-300 hover:bg-gray-50"
			>
				<div class="text-sm font-semibold text-gray-900">DA Band Gap</div>
				<div class="mt-1 text-xs text-gray-600">
					Compare referring domains grouped by DA bands, with exports.
				</div>
			</a>
			<div class="rounded-lg border border-gray-200 p-4">
				<div class="text-sm font-semibold text-gray-900">More tools</div>
				<div class="mt-1 text-xs text-gray-600">
					Additional sections are temporarily hidden while deploying.
				</div>
			</div>
		</div>
	</div>
</div>

{#if false}
	<!-- Old dashboard UI kept for reference -->
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
				<div class="text-xs font-semibold tracking-wide text-gray-500 uppercase">
					Account Status
				</div>
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
{/if}
