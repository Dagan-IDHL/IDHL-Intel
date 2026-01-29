<script>
	import { page } from '$app/stores';
	import ClientProjectSelectorMock from './ClientProjectSelectorMock.svelte';

	export let title = '';

	let isDropdownOpen = false;
	const mainMarginLeft = '256px';

	let userEmail = 'user@idhl.ai';
	let userRole = 'standard';
	let accountStatusLabel = 'Standard';

	$: userEmail = $page.data?.user?.email || 'user@idhl.ai';
	$: userRole = String($page.data?.user?.role || 'standard').toLowerCase();
	$: accountStatusLabel =
		userRole === 'unlimited' ? 'Unlimited' : userRole === 'pro' ? 'Pro' : 'Standard';

	$: clientId = $page.params?.clientId || '';

	/**
	 * @param {string} href
	 * @param {'exact'|'prefix'} match
	 */
	function isActiveHref(href, match = 'exact') {
		const path = $page.url.pathname;
		if (match === 'prefix') return path === href || path.startsWith(`${href}/`);
		return path === href;
	}

	$: navSections = [
		...(clientId
			? [
					{
						title: 'Client',
						items: [
							{ name: 'Data', href: `/dashboard/${clientId}/data`, icon: 'dashboard' },
							{
								name: 'Custom Analysis',
								href: `/dashboard/${clientId}/custom-analysis`,
								icon: 'sparkles'
							},
							{ name: 'Report', href: `/dashboard/${clientId}/report`, icon: 'file' }
						]
					}
				]
			: []),
		{
			title: 'Workspace',
			items: [{ name: 'Clients', href: '/dashboard/clients', icon: 'users', match: 'prefix' }]
		}
	];

	// Back-compat/safety: if any stale compiled markup still references `navItems`, keep it defined.
	// (The current template uses `navSections`.)
	let navItems = [];
	$: navItems = navSections.flatMap((s) => s.items || []);

	const iconMap = {
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

<div class="flex h-screen bg-white">
	<!-- Primary Sidebar Navigation -->
	<aside class="fixed top-0 left-0 z-20 h-screen w-64 overflow-hidden bg-[#f2e9e4] pt-16 shadow-lg">
		<div class="flex h-full flex-col">
			<!-- Client Project Selector -->
			<div class="p-4">
				<ClientProjectSelectorMock isCollapsed={false} />
			</div>

			<!-- Navigation Menu -->
			<nav class="flex-1 space-y-6 p-6" aria-label="Sidebar navigation">
				{#each navSections as section (section.title)}
					<div>
						<div class="mb-2 px-1 text-[11px] font-semibold tracking-wide text-[#404b77] uppercase">
							{section.title}
						</div>
						<div class="space-y-2">
							{#each section.items as item (item.href)}
								<a
									href={item.href}
									class="flex h-12 w-full cursor-pointer items-center gap-3 rounded-lg px-4 py-3 text-gray-700 transition-all duration-200 focus:outline-none active:scale-100"
									class:bg-[#404b77]={isActiveHref(item.href, item.match || 'exact')}
									class:text-white={isActiveHref(item.href, item.match || 'exact')}
									class:hover:bg-[#e0d5ca]={!isActiveHref(item.href, item.match || 'exact')}
									class:hover:translate-x-2={!isActiveHref(item.href, item.match || 'exact')}
								>
									<span class="flex h-5 w-5 flex-shrink-0 items-center justify-center">
										{@html iconMap[item.icon]}
									</span>
									<span class="font-medium whitespace-nowrap">{item.name}</span>
								</a>
							{/each}
						</div>
					</div>
				{/each}
			</nav>

			<div class="border-t border-[#e0d5ca] p-6 text-xs text-[#404b77]">
				<p>© 2026 IDHL Group</p>
			</div>
		</div>
	</aside>

	<!-- Main Content -->
	<div
		class="flex min-w-0 flex-1 flex-col transition-all duration-300"
		style="margin-left: {mainMarginLeft}"
	>
		<!-- Top Bar -->
		<header
			class="fixed top-0 right-0 left-0 z-30 border-b border-[#3a4267] bg-[#404b77] shadow-sm"
		>
			<div class="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
				<!-- Left: Brand Name -->
				<div class="flex min-w-0 flex-1 items-center gap-4">
					<h1 class="truncate text-2xl font-bold text-white">IDHL Intel</h1>
					{#if title}
						<div class="hidden truncate text-sm font-medium text-white/80 md:block">{title}</div>
					{/if}
				</div>

				<!-- Right: User Profile & Logout -->
				<div class="relative">
					<button
						on:click|stopPropagation={toggleDropdown}
						class="flex items-center gap-3 rounded-lg px-4 py-2 transition-colors duration-200 hover:bg-[#505c8f]"
					>
						<div class="text-right">
							<p class="text-sm font-medium text-white">{userEmail}</p>
							<p class="text-xs text-gray-200">Account status: {accountStatusLabel}</p>
						</div>
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-white font-bold text-[#404b77]"
						>
							{userEmail.charAt(0).toUpperCase()}
						</div>
					</button>

					<!-- Dropdown Menu -->
					{#if isDropdownOpen}
						<menu
							class="absolute right-0 z-50 m-0 mt-2 w-48 list-none rounded-lg border border-gray-200 bg-white p-0 shadow-xl"
							on:click|stopPropagation={() => {}}
						>
							<div class="border-b border-gray-200 p-4">
								<p class="text-sm font-medium text-[#404b77]">{userEmail}</p>
								<p class="mt-1 text-xs text-gray-500">Account status: {accountStatusLabel}</p>
							</div>
							<a
								href="/login"
								class="block w-full px-4 py-3 text-left text-sm font-medium text-red-600 transition-colors duration-200 hover:bg-red-50"
							>
								Logout
							</a>
						</menu>
					{/if}
				</div>
			</div>
		</header>

		<!-- Page Content -->
		<main class="mt-16 min-w-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
			<slot />
		</main>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		scrollbar-gutter: stable;
	}
</style>
