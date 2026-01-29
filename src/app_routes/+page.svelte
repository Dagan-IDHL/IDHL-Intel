<svelte:head>
	<title>Intel</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 px-6 py-16">
	<div class="mx-auto max-w-3xl">
		<div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
			<div class="flex items-center gap-3">
				<div class="grid h-10 w-10 place-items-center rounded-xl bg-[#404b77] text-white shadow-sm">
					<span class="text-sm font-semibold">IN</span>
				</div>
				<div>
					<div class="text-sm font-semibold text-[#404b77]">IDHL Intel</div>
					<div class="text-xs text-gray-600">Intel (UI shell)</div>
				</div>
			</div>

			<h1 class="mt-8 text-3xl font-bold text-gray-900">Preview pages</h1>
			<p class="mt-2 text-sm text-gray-600">
				Login and dashboard UI scaffolded to match Sidekick styling (no functionality yet).
			</p>

			<div class="mt-8 flex flex-wrap gap-3">
				<a
					href="/login"
					class="rounded-lg bg-[#404b77] px-5 py-3 text-sm font-semibold text-white hover:bg-[#505c8f]"
					>Login</a
				>
				<a
					href="/dashboard"
					class="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
					>Dashboard</a
				>
			</div>
		</div>
	</div>
</div>
