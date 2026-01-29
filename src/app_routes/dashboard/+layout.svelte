<script>
	import { page } from '$app/stores';
	import GlobalChatbot from '$lib/components/ai/GlobalChatbot.svelte';
	import SidekickSidebar from '$lib/components/SidekickSidebar.svelte';

	let { children } = $props();

	let title = $derived.by(() => {
		const path = $page.url.pathname;
		return path === '/dashboard'
			? 'Dashboard'
			: path.includes('/charts-preview')
				? 'Charts Preview'
				: path.includes('/analytics-preview')
					? 'Analytics Preview'
					: path.includes('/custom-analysis')
						? 'Custom Analysis'
						: path.includes('/report')
							? 'Report'
							: path.includes('/data')
								? 'Data'
								: path.includes('/da-band-gap')
									? 'DA Band Gap'
									: path.includes('/clients')
										? 'Clients'
										: path.includes('/usage')
											? 'Usage'
											: 'Dashboard';
	});
</script>

<SidekickSidebar {title}>
	{@render children()}
	<GlobalChatbot />
</SidekickSidebar>
