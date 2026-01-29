<div class="min-h-screen bg-white">
	<div class="mx-auto max-w-2xl">
		<div class="mb-8">
			<a
				href="/dashboard"
				class="mb-4 flex items-center gap-2 text-[#404b77] transition-colors hover:text-[#505c8f]"
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
				<span>Back</span>
			</a>

			<h1 class="mb-2 text-4xl font-bold text-gray-900">Add New Client Project</h1>
			<p class="text-gray-600">Create a new client project to organise your tools and analytics</p>
		</div>

		<form class="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
			<div class="mb-6">
				<label for="clientName" class="mb-2 block text-sm font-medium text-gray-900">
					Client Name
				</label>
				<input
					type="text"
					id="clientName"
					placeholder="e.g., Acme Corporation"
					class="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors focus:border-transparent focus:ring-2 focus:ring-[#404b77] focus:outline-none"
				/>
				<p class="mt-1 text-xs text-gray-500">The name of your client or project</p>
			</div>

			<div class="mb-8">
				<label for="url" class="mb-2 block text-sm font-medium text-gray-900">Website URL</label>
				<input
					type="url"
					id="url"
					placeholder="e.g., https://example.com"
					class="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors focus:border-transparent focus:ring-2 focus:ring-[#404b77] focus:outline-none"
				/>
				<p class="mt-1 text-xs text-gray-500">
					The main website URL for this client (used for favicon and analytics)
				</p>
			</div>

			<div class="flex gap-4">
				<button
					type="button"
					class="flex-1 rounded-lg bg-[#404b77] px-6 py-3 font-medium text-white transition-colors hover:bg-[#505c8f]"
				>
					Create Client Project
				</button>
				<a
					href="/dashboard"
					class="flex-1 rounded-lg bg-gray-100 px-6 py-3 text-center font-medium text-gray-900 transition-colors hover:bg-gray-200"
				>
					Cancel
				</a>
			</div>
		</form>

		<div class="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
			<h3 class="mb-2 font-semibold text-blue-900">What you can do next:</h3>
			<ul class="space-y-1 text-sm text-blue-800">
				<li>✓ Select this project from the sidebar dropdown</li>
				<li>✓ Run keyword research for this domain</li>
				<li>✓ Track analytics and metrics specific to this client</li>
				<li>✓ Organize all tools by client project</li>
			</ul>
		</div>
	</div>
</div>
