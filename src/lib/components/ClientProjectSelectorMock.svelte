<script>
	// UI-only mock of Sidekick's client selector. No fetching or persistence.
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { MOCK_CLIENTS } from '$lib/mock/clients.js';

	export let isCollapsed = false;

	let isOpen = false;
	let selectedProject = null;
	const projects = MOCK_CLIENTS;

	$: currentClientId = $page.params?.clientId;
	$: {
		if (currentClientId) {
			selectedProject = projects.find((p) => p.id === currentClientId) || projects[0];
		} else if (!selectedProject) {
			selectedProject = projects[0];
		}
	}

	function toggleDropdown(e) {
		e.stopPropagation();
		isOpen = !isOpen;
	}

	function closeDropdown() {
		isOpen = false;
	}

	function selectProject(project) {
		selectedProject = project;
		closeDropdown();
		goto(`/dashboard/${project.id}/data`);
	}

	function handleClickOutside(e) {
		if (isOpen && !e.target.closest('.client-selector-dropdown')) closeDropdown();
	}
</script>

<svelte:window on:click={handleClickOutside} />

<div class="client-selector-dropdown">
	<button
		on:click={toggleDropdown}
		class="flex h-14 w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-[#e0d5ca]"
		title={selectedProject ? selectedProject.clientName : 'Select a project'}
	>
		<div class="h-6 w-6 flex-shrink-0 rounded bg-gray-300"></div>

		{#if !isCollapsed && selectedProject}
			<div class="min-w-0 flex-1 text-left">
				<div class="truncate text-sm font-medium text-gray-800">{selectedProject.clientName}</div>
				<div class="truncate text-xs text-gray-500">{selectedProject.url}</div>
			</div>
		{/if}

		{#if !isCollapsed}
			<svg
				class="h-4 w-4 flex-shrink-0 transition-transform"
				class:rotate-180={isOpen}
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
				<polyline points="6 9 12 15 18 9" />
			</svg>
		{/if}
	</button>

	{#if isOpen && !isCollapsed}
		<div
			class="absolute top-full right-0 left-0 z-50 mt-2 rounded-lg border border-gray-200 bg-white shadow-xl"
			role="listbox"
			on:click|stopPropagation={() => {}}
		>
			<div class="max-h-64 overflow-y-auto">
				{#each projects as project (project.id)}
					<button
						on:click={() => selectProject(project)}
						class="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[#f2e9e4]"
						role="option"
						aria-selected={selectedProject?.id === project.id}
					>
						<div class="h-6 w-6 flex-shrink-0 rounded bg-gray-300"></div>

						<div class="min-w-0 flex-1">
							<div class="truncate text-sm font-medium text-gray-800">{project.clientName}</div>
							<div class="truncate text-xs text-gray-500">{project.url}</div>
						</div>

						{#if selectedProject?.id === project.id}
							<svg
								class="h-5 w-5 flex-shrink-0 text-[#404b77]"
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
								<polyline points="20 6 9 17 4 12" />
							</svg>
						{/if}
					</button>
				{/each}
			</div>

			<button
				type="button"
				class="flex w-full items-center gap-3 border-t border-gray-200 px-4 py-3 text-sm font-medium text-[#404b77] transition-colors hover:bg-[#f2e9e4]"
				on:click={() => goto('/dashboard/clients/new')}
			>
				<svg
					class="h-5 w-5 flex-shrink-0"
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
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				<span>Add New Client</span>
			</button>
		</div>
	{/if}
</div>

<style>
	.client-selector-dropdown {
		position: relative;
		border-bottom: 1px solid #e0d5ca;
	}
</style>
