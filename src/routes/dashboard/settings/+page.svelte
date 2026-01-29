<svelte:head>
	<title>Settings · Intel</title>
</svelte:head>

<div class="space-y-6">
	<div class="rounded-2xl border border-gray-200 bg-white p-6">
		<h2 class="text-lg font-semibold text-gray-900">Settings</h2>
		<p class="mt-1 text-sm text-gray-600">UI-only profile and preferences.</p>
	</div>

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<div class="rounded-2xl border border-gray-200 bg-white p-6">
			<div class="text-sm font-semibold text-gray-900">Profile</div>
			<div class="mt-4 space-y-4">
				<div>
					<label class="mb-2 block text-xs font-semibold text-gray-600">Name</label>
					<input
						class="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-[#404b77] focus:outline-none"
						value="User"
					/>
				</div>
				<div>
					<label class="mb-2 block text-xs font-semibold text-gray-600">Email</label>
					<input
						class="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-[#404b77] focus:outline-none"
						value="user@idhl.ai"
					/>
				</div>
			</div>
		</div>

		<div class="rounded-2xl border border-gray-200 bg-white p-6">
			<div class="text-sm font-semibold text-gray-900">Preferences</div>
			<div class="mt-4 space-y-4">
				<label
					class="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-4"
				>
					<div>
						<div class="text-sm font-semibold text-gray-900">Compact mode</div>
						<div class="mt-1 text-xs text-gray-600">Tighter spacing for smaller screens.</div>
					</div>
					<input type="checkbox" class="h-5 w-5 rounded border-gray-300 text-[#404b77]" />
				</label>
				<label
					class="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-4"
				>
					<div>
						<div class="text-sm font-semibold text-gray-900">Email notifications</div>
						<div class="mt-1 text-xs text-gray-600">Receive weekly summary emails.</div>
					</div>
					<input type="checkbox" class="h-5 w-5 rounded border-gray-300 text-[#404b77]" checked />
				</label>
			</div>
		</div>
	</div>
</div>
