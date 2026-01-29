<script>
	import { formatDeltaPct } from '$lib/analytics/format.js';

	export let title = '';
	export let sourceLabel = '';
	export let kpiValue = '';
	export let compareMode = 'off';
	export let deltaPct = null;
	export let deltaAbsLabel = '';
	export let loading = false;
	export let error = '';
</script>

<section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
	<header class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			<div class="flex flex-wrap items-center gap-2">
				<h3 class="truncate text-sm font-semibold text-gray-900">{title}</h3>
				{#if sourceLabel}
					<span
						class="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-700"
					>
						{sourceLabel}
					</span>
				{/if}
			</div>

			<div class="mt-2 flex flex-wrap items-baseline gap-2">
				<div class="text-2xl font-bold text-gray-900">{kpiValue || '—'}</div>

				{#if compareMode !== 'off'}
					<span
						class="rounded-full px-2 py-0.5 text-xs font-semibold"
						class:bg-emerald-50={deltaPct != null && deltaPct > 0}
						class:text-emerald-800={deltaPct != null && deltaPct > 0}
						class:bg-red-50={deltaPct != null && deltaPct < 0}
						class:text-red-700={deltaPct != null && deltaPct < 0}
						class:bg-gray-100={deltaPct == null || deltaPct === 0}
						class:text-gray-800={deltaPct == null || deltaPct === 0}
					>
						{formatDeltaPct(deltaPct)}
					</span>
				{/if}

				{#if deltaAbsLabel && compareMode !== 'off'}
					<span class="text-xs text-gray-500">{deltaAbsLabel}</span>
				{/if}
			</div>
		</div>

		<div class="flex items-center gap-2">
			<slot name="actions" />
		</div>
	</header>

	{#if loading}
		<div class="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
			Loading…
		</div>
	{:else if error}
		<div class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
			{error}
		</div>
	{:else}
		<div class="mt-4">
			<slot />
		</div>
	{/if}
</section>
