<script>
	import { page } from '$app/stores';
	import SidekickSidebar from '$lib/components/SidekickSidebar.svelte';

	let { children } = $props();

	let title = $derived.by(() => {
		const path = $page.url.pathname;
		return path === '/dashboard'
			? 'Dashboard'
			: path.includes('/projects')
				? 'Projects'
				: path.includes('/tools')
					? 'Tools'
					: path.includes('/reports')
						? 'Reports'
						: path.includes('/settings')
							? 'Settings'
							: 'Dashboard';
	});
</script>

<SidekickSidebar {title}>
	{@render children()}
</SidekickSidebar>
