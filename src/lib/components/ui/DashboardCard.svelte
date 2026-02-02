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
	export let icon = '';

	const iconMap = {
		dollar:
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"/></svg>',
		eye: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
		click:
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 9V4.5a2.5 2.5 0 0 1 5 0V9"/><path d="M9 9v9a3 3 0 0 0 6 0V9"/><path d="M15 9h1.5a2.5 2.5 0 0 1 2.5 2.5V14"/><path d="M9 14H7.5A2.5 2.5 0 0 0 5 16.5V18"/></svg>',
		percent:
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5L5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
		activity:
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9-4-18-3 9H2"/></svg>',
		trendDown:
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v14h18"/><path d="m7 11 4 4 7-7"/><path d="M18 8h-3v3"/></svg>',
		cart: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42A2 2 0 0 0 8.66 16h9.72a2 2 0 0 0 1.95-1.57L22 6H6"/></svg>',
		search:
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
		file: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/></svg>',
		users:
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
	};
</script>

<section class="flex h-full flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
	<header class="flex items-start justify-between gap-3">
		<div class="flex min-w-0 items-start gap-3">
			<slot name="icon" />
			{#if icon}
				<div
					class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--pi-surface-2)] text-[var(--pi-primary)]"
				>
					<span class="h-5 w-5" aria-hidden="true">
						{@html iconMap[icon] || iconMap.activity}
					</span>
				</div>
			{/if}

			<div class="min-w-0">
				<div class="flex flex-wrap items-center gap-2">
					<h3 class="truncate text-sm font-semibold text-gray-900">{title}</h3>
					{#if sourceLabel}
						<span
							class="rounded-full border border-[var(--pi-border)] bg-[var(--pi-surface-2)] px-2 py-0.5 text-[11px] font-semibold text-gray-700"
						>
							{sourceLabel}
						</span>
					{/if}
				</div>

				<div class="mt-2 flex flex-wrap items-baseline gap-2">
					<div class="text-2xl font-bold text-gray-900">{kpiValue || '—'}</div>

					{#if compareMode !== 'off'}
						<span
							class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
							class:bg-emerald-50={deltaPct != null && deltaPct > 0}
							class:text-emerald-800={deltaPct != null && deltaPct > 0}
							class:bg-red-50={deltaPct != null && deltaPct < 0}
							class:text-red-700={deltaPct != null && deltaPct < 0}
							class:bg-gray-100={deltaPct == null || deltaPct === 0}
							class:text-gray-800={deltaPct == null || deltaPct === 0}
						>
							{#if deltaPct != null && deltaPct > 0}
								<span aria-hidden="true">▲</span>
							{:else if deltaPct != null && deltaPct < 0}
								<span aria-hidden="true">▼</span>
							{/if}
							{formatDeltaPct(deltaPct)}
						</span>
					{/if}

					{#if deltaAbsLabel && compareMode !== 'off'}
						<span class="text-xs text-gray-500">{deltaAbsLabel}</span>
					{/if}
				</div>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<slot name="actions" />
		</div>
	</header>

	{#if loading}
		<div
			class="mt-4 rounded-xl border border-[var(--pi-border)] bg-[var(--pi-surface-2)] p-3 text-sm text-[var(--pi-muted)]"
		>
			Loading…
		</div>
	{:else if error}
		<div class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
			{error}
		</div>
	{:else}
		<div class="mt-4 min-h-0 flex-1">
			<slot />
		</div>
	{/if}
</section>
