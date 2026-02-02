<script>
	import { page } from '$app/stores';

	let { children, title = 'Dashboard' } = $props();
	let currentPath = $derived($page.url.pathname);

	const navItems = [{ name: 'Dashboard', href: '/dashboard' }];

	const iconMap = {
		dashboard:
			'<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'
	};

	function iconForHref(href) {
		return iconMap.dashboard;
	}

	function isActive(href) {
		if (href === '/dashboard') return currentPath === '/dashboard';
		return currentPath.startsWith(href);
	}
</script>

<div class="min-h-screen text-gray-900">
	<div class="flex">
		<aside class="min-h-screen w-72 border-r border-[var(--pi-border)] bg-white">
			<div class="px-6 pt-7">
				<div class="flex items-center gap-3">
					<div
						class="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[var(--pi-primary)] via-[var(--pi-primary-2)] to-[var(--pi-accent)] text-white shadow-sm"
					>
						<span class="text-sm font-semibold">PI</span>
					</div>
					<div class="min-w-0">
						<div class="truncate text-sm font-semibold text-gray-900">Pulse Insight</div>
						<div class="truncate text-xs text-[var(--pi-muted)]">Reporting Suite</div>
					</div>
				</div>
			</div>

			<nav class="mt-8 px-4 pb-10">
				<div class="px-3 text-[11px] font-semibold tracking-wide text-gray-600 uppercase">
					Navigation
				</div>
				<ul class="mt-3 space-y-1">
					{#each navItems as item}
						<li>
							<a
								href={item.href}
								class="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/60 hover:text-gray-900 {isActive(
									item.href
								)
									? 'bg-white/70 text-gray-900'
									: 'text-gray-700'}"
							>
								<span
									class="h-5 w-5 shrink-0 group-hover:text-[var(--pi-primary)]"
									class:text-[var(--pi-primary)]={isActive(item.href)}
									class:text-gray-600={!isActive(item.href)}
								>
									{@html iconForHref(item.href)}
								</span>
								<span class="truncate">{item.name}</span>
							</a>
						</li>
					{/each}
				</ul>

				<div class="mt-8 rounded-xl border border-[var(--pi-border)] bg-[var(--pi-surface-2)] p-4">
					<div class="text-xs font-semibold text-gray-800">Quick actions</div>
					<div class="mt-2 space-y-2">
						<a
							href="/dashboard/projects"
							class="block rounded-lg bg-[var(--pi-primary)] px-3 py-2 text-center text-xs font-semibold text-white hover:bg-[color-mix(in_oklch,var(--pi-primary)_92%,black)]"
							>Create project</a
						>
						<a
							href="/login"
							class="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-xs font-semibold text-gray-800 hover:bg-gray-50"
							>Sign out</a
						>
					</div>
				</div>
			</nav>
		</aside>

		<div class="min-w-0 flex-1">
			<header class="sticky top-0 z-10 border-b border-gray-200 bg-white/85 backdrop-blur">
				<div class="flex items-center justify-between gap-4 px-6 py-4">
					<div class="min-w-0">
						<div class="truncate text-xs font-semibold tracking-wide text-gray-500 uppercase">
							Pulse Insight
						</div>
						<h1 class="truncate text-lg font-semibold text-gray-900">{title}</h1>
					</div>

					<div class="flex items-center gap-3">
						<span
							class="hidden rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 sm:inline"
						>
							Account Status: <span class="text-gray-900">Standard</span>
						</span>
						<div
							class="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5"
						>
							<div
								class="grid h-7 w-7 place-items-center rounded-full bg-[var(--pi-primary)] text-xs font-semibold text-white"
							>
								U
							</div>
							<div class="hidden sm:block">
								<div class="text-xs font-semibold text-gray-900">user@idhl.ai</div>
								<div class="text-[11px] text-gray-500">Standard</div>
							</div>
						</div>
					</div>
				</div>
			</header>

			<main class="px-6 py-6">
				{@render children()}
			</main>
		</div>
	</div>
</div>
