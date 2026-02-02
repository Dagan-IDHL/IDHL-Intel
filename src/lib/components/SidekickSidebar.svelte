<script>
	import { page } from '$app/stores';

	export let title = '';

	let isDropdownOpen = false;
	const year = new Date().getFullYear();

	let userEmail = 'user@idhl.ai';
	let userRole = 'standard';
	let accountStatusLabel = 'Standard';

	$: userEmail = $page.data?.user?.email || 'user@idhl.ai';
	$: userRole = String($page.data?.user?.role || 'standard').toLowerCase();
	$: accountStatusLabel =
		userRole === 'unlimited' ? 'Unlimited' : userRole === 'pro' ? 'Pro' : 'Standard';

	let pathname = '/dashboard';
	$: pathname = $page.url.pathname;

	$: clientId = $page.params?.clientId || '';

	/**
	 * @param {string} currentPath
	 * @param {string} href
	 * @param {'exact'|'prefix'} match
	 */
	function isActiveHref(currentPath, href, match = 'exact') {
		if (match === 'prefix') return currentPath === href || currentPath.startsWith(`${href}/`);
		return currentPath === href;
	}

	$: railItems = [
		{ name: 'Home', href: '/dashboard', icon: 'home', match: 'exact' },
		{ name: 'Clients', href: '/dashboard/clients', icon: 'users', match: 'prefix' },
		...(clientId
			? [
					{ name: 'Data', href: `/dashboard/${clientId}/data`, icon: 'dashboard', match: 'prefix' },
					{
						name: 'Analysis',
						href: `/dashboard/${clientId}/custom-analysis`,
						icon: 'sparkles',
						match: 'prefix'
					},
					{ name: 'Report', href: `/dashboard/${clientId}/report`, icon: 'file', match: 'prefix' }
				]
			: [])
	];
	$: baseItems = railItems.slice(0, 2);
	$: clientItems = railItems.slice(2);

	// Back-compat/safety: if any stale compiled markup still references `navItems`, keep it defined.
	// (The current template uses `navSections`.)
	let navItems = [];
	$: navItems = railItems;

	const iconMap = {
		home: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v11h14V10"/><path d="M9 21v-6h6v6"/></svg>',
		dashboard:
			'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
		sparkles:
			'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l1.8 5.6L20 10l-6.2 2.4L12 18l-1.8-5.6L4 10l6.2-2.4L12 2z"/><path d="M5 20l.9-2.7L9 16l-3.1-1.3L5 12l-.9 2.7L1 16l3.1 1.3L5 20z"/></svg>',
		file: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/></svg>',
		chart:
			'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l3-3 4 4 6-6"/></svg>',
		beaker:
			'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v6.5L5 20a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 20L14 8.5V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/></svg>',
		activity:
			'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9-4-18-3 9H2"/></svg>',
		plus: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
		users:
			'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
	};

	function toggleDropdown() {
		isDropdownOpen = !isDropdownOpen;
	}

	function closeDropdown() {
		isDropdownOpen = false;
	}
</script>

<svelte:window on:click={closeDropdown} />

<div class="min-h-screen text-[var(--pi-text)]">
	<aside class="fixed inset-y-0 left-0 z-30 w-20 border-r border-[var(--pi-border)] bg-white">
		<div class="flex h-full flex-col items-center gap-3 overflow-hidden py-4">
			<a
				href="/dashboard"
				class="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[var(--pi-primary)] via-[var(--pi-primary-2)] to-[var(--pi-accent)] text-white shadow-sm"
				aria-label="Pulse Insight"
				title="Pulse Insight"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					class="h-5 w-5"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M7 14a5 5 0 1 0 0-4" />
					<path d="M17 10a5 5 0 1 1 0 4" />
					<path d="M10.5 12h3" />
				</svg>
			</a>

			<nav class="mt-2 w-full px-2" aria-label="Primary navigation">
				<div class="grid grid-cols-1 gap-2">
					{#each baseItems as item (item.href)}
						{@const active = isActiveHref(pathname, item.href, item.match || 'exact')}
						<a
							href={item.href}
							title={item.name}
							class="group flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-center transition-colors"
							class:bg-[var(--pi-primary)]={active}
							class:text-white={active}
							class:hover:bg-[var(--pi-surface-2)]={!active}
							class:text-gray-700={!active}
						>
							<span
								class={`grid h-9 w-9 place-items-center rounded-2xl ${active ? 'bg-white/15' : ''}`}
							>
								<span
									class={`flex h-5 w-5 items-center justify-center ${active ? 'text-white' : 'text-[var(--pi-muted)]'}`}
								>
									{@html iconMap[item.icon]}
								</span>
							</span>
							<span class="text-[10px] leading-3 font-semibold">{item.name}</span>
						</a>
					{/each}

					{#if clientItems.length > 0}
						<div class="my-2 h-px w-full bg-[var(--pi-border)]" />
						{#each clientItems as item (item.href)}
							{@const active = isActiveHref(pathname, item.href, item.match || 'exact')}
							<a
								href={item.href}
								title={item.name}
								class="group flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-center transition-colors"
								class:bg-[var(--pi-primary)]={active}
								class:text-white={active}
								class:hover:bg-[var(--pi-surface-2)]={!active}
								class:text-gray-700={!active}
							>
								<span
									class={`grid h-9 w-9 place-items-center rounded-2xl ${active ? 'bg-white/15' : ''}`}
								>
									<span
										class={`flex h-5 w-5 items-center justify-center ${active ? 'text-white' : 'text-[var(--pi-muted)]'}`}
									>
										{@html iconMap[item.icon]}
									</span>
								</span>
								<span class="text-[10px] leading-3 font-semibold">{item.name}</span>
							</a>
						{/each}
					{/if}
				</div>
			</nav>

			<div class="mt-auto pb-2 text-center text-[10px] leading-3 text-[var(--pi-muted)]">
				© {year}
			</div>
		</div>
	</aside>

	<div class="min-w-0 flex-1" style="margin-left: 5rem;">
		<header class="sticky top-0 z-20 border-b border-[var(--pi-border)] bg-white/70 backdrop-blur">
			<div class="flex items-center justify-between gap-4 px-6 py-4">
				<div class="min-w-0">
					<h1 class="truncate text-lg font-semibold text-gray-900">{title || 'Dashboard'}</h1>
				</div>

				<div class="flex items-center gap-3">
					<div class="relative">
						<button
							on:click|stopPropagation={toggleDropdown}
							class="flex items-center gap-3 rounded-full border border-[var(--pi-border)] bg-white px-3 py-1.5 transition-colors hover:bg-[var(--pi-surface-2)]"
						>
							<div class="hidden text-right sm:block">
								<p class="text-xs font-semibold text-gray-900">{userEmail}</p>
							</div>
							<div
								class="grid h-8 w-8 place-items-center rounded-full bg-[var(--pi-primary)] text-sm font-semibold text-white"
							>
								{userEmail.charAt(0).toUpperCase()}
							</div>
						</button>

						{#if isDropdownOpen}
							<menu
								class="absolute right-0 z-50 m-0 mt-2 w-56 list-none overflow-hidden rounded-xl border border-[var(--pi-border)] bg-white p-0 shadow-xl"
								on:click|stopPropagation={() => {}}
							>
								<div class="border-b border-[var(--pi-border)] p-4">
									<p class="text-sm font-semibold text-gray-900">{userEmail}</p>
								</div>
								<a
									href="/login"
									class="block w-full px-4 py-3 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
								>
									Sign out
								</a>
							</menu>
						{/if}
					</div>
				</div>
			</div>
		</header>

		<main class="min-w-0 p-6">
			<slot />
		</main>
	</div>
</div>
