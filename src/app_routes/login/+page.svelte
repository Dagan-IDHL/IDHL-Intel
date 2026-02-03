<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let email = '';
	let password = '';
	let error = '';
	let loading = false;
	let showLegacyLogin = true;

	onMount(() => {
		const errorParam = $page.url.searchParams.get('error');
		if (errorParam) error = errorParam;
	});

	async function handleLogin() {
		error = '';
		loading = true;

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email, password })
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.error || 'Login failed. Please try again.';
				loading = false;
				return;
			}

			// Redirect to dashboard on successful login
			await goto('/dashboard');
		} catch {
			error = 'An error occurred. Please try again.';
			loading = false;
		}
	}

	function handleKeyDown(e) {
		if (e.key === 'Enter' && email && password) {
			handleLogin();
		}
	}
</script>

<svelte:head>
	<title>Pulse Insight — Login</title>
</svelte:head>

<div class="grid min-h-screen grid-cols-1 lg:grid-cols-2">
	<!-- Left: brand / marketing -->
	<section class="relative hidden overflow-hidden border-r border-[var(--pi-border)] lg:block">
		<div
			class="absolute inset-0 bg-gradient-to-br from-[color-mix(in_oklch,var(--pi-primary)_22%,white)] via-[var(--pi-bg)] to-[color-mix(in_oklch,var(--pi-accent)_18%,white)]"
		/>
		<div class="relative flex h-full flex-col justify-between p-10">
			<div>
				<div class="flex items-center gap-3">
					<div
						class="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[var(--pi-primary)] via-[var(--pi-primary-2)] to-[var(--pi-accent)] text-white shadow-sm"
					>
						<span class="text-sm font-semibold">PI</span>
					</div>
					<div>
						<div class="text-sm font-semibold text-gray-900">Pulse Insight</div>
						<div class="text-xs text-[var(--pi-muted)]">Marketing reporting suite</div>
					</div>
				</div>

				<h1 class="mt-10 text-4xl font-bold tracking-tight text-gray-900">
					Beautiful reporting. Built for modern marketing teams.
				</h1>
				<p class="mt-3 max-w-xl text-sm leading-relaxed text-[var(--pi-muted)]">
					Connect your sources, explore performance with AI, and generate client-ready reports — all
					in one place.
				</p>

				<div class="mt-8 grid max-w-xl grid-cols-1 gap-3">
					<div class="rounded-xl border border-[var(--pi-border)] bg-white/70 p-4">
						<div class="text-sm font-semibold text-gray-900">Data</div>
						<div class="mt-1 text-xs text-[var(--pi-muted)]">
							Clean KPI cards, breakdown tables, and time series trends.
						</div>
					</div>
					<div class="rounded-xl border border-[var(--pi-border)] bg-white/70 p-4">
						<div class="text-sm font-semibold text-gray-900">Custom Analysis</div>
						<div class="mt-1 text-xs text-[var(--pi-muted)]">
							Ask questions, generate insights, and build custom charts.
						</div>
					</div>
					<div class="rounded-xl border border-[var(--pi-border)] bg-white/70 p-4">
						<div class="text-sm font-semibold text-gray-900">Reports</div>
						<div class="mt-1 text-xs text-[var(--pi-muted)]">
							Drag-and-drop report builder with resizable cards.
						</div>
					</div>
				</div>
			</div>

			<div class="text-xs text-[var(--pi-muted)]">© {new Date().getFullYear()} IDHL Group</div>
		</div>
	</section>

	<!-- Right: login -->
	<section class="flex items-center justify-center px-6 py-12">
		<div class="w-full max-w-md">
			<div class="rounded-2xl border border-[var(--pi-border)] bg-white p-8 shadow-sm">
				<div class="mb-7 flex items-center gap-3">
					<div
						class="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[var(--pi-primary)] via-[var(--pi-primary-2)] to-[var(--pi-accent)] text-white shadow-sm"
					>
						<span class="text-sm font-semibold">PI</span>
					</div>
					<div class="min-w-0">
						<div class="truncate text-sm font-semibold text-gray-900">Pulse Insight</div>
						<div class="truncate text-xs text-[var(--pi-muted)]">Sign in</div>
					</div>
				</div>

				<h2 class="text-2xl font-bold text-gray-900">Welcome back</h2>
				<p class="mt-1 text-sm text-[var(--pi-muted)]">
					Continue with Microsoft to open your workspace.
				</p>

				<!-- Error Message -->
				{#if error}
					<div class="mt-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
						<span class="mt-0.5 text-red-700">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M12 9v4" />
								<path d="M12 17h.01" />
								<path
									d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
								/>
							</svg>
						</span>
						<p class="text-sm text-red-700">{error}</p>
					</div>
				{/if}

				<div class="mt-7 space-y-5">
					<!-- Microsoft Sign-In -->
					<a
						href="/api/auth/azure"
						class="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--pi-border)] bg-white px-4 py-3 font-semibold text-gray-900 transition-colors hover:bg-[var(--pi-surface-2)]"
						aria-disabled={loading}
						on:click={() => (loading = true)}
					>
						<span class="inline-flex h-5 w-5 items-center justify-center">
							<svg viewBox="0 0 23 23" aria-hidden="true" class="h-5 w-5">
								<path fill="#f25022" d="M1 1h10v10H1z" />
								<path fill="#7fba00" d="M12 1h10v10H12z" />
								<path fill="#00a4ef" d="M1 12h10v10H1z" />
								<path fill="#ffb900" d="M12 12h10v10H12z" />
							</svg>
						</span>
						{#if loading}
							<span class="inline-flex h-4 w-4 animate-spin">
								<svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4">
									<path
										fill="currentColor"
										opacity="0.25"
										d="M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-8-8V2z"
									/>
									<path fill="currentColor" d="M20 12a8 8 0 0 0-8-8V2a10 10 0 0 1 10 10h-2z" />
								</svg>
							</span>
							Redirecting...
						{:else}
							Continue with Microsoft
						{/if}
					</a>
				</div>

				{#if showLegacyLogin}
					<div class="mt-8">
						<!-- Divider -->
						<div class="mb-6 flex items-center gap-3">
							<div class="h-px flex-1 bg-gray-200"></div>
							<span class="text-xs font-medium text-gray-500">OR</span>
							<div class="h-px flex-1 bg-gray-200"></div>
						</div>

						<form on:submit|preventDefault={handleLogin} class="space-y-6">
							<!-- Email Field -->
							<div>
								<label for="email" class="mb-2 block text-sm font-semibold text-gray-900">
									Email Address
								</label>
								<input
									type="email"
									id="email"
									bind:value={email}
									on:keydown={handleKeyDown}
									placeholder="you@example.com"
									class="w-full rounded-xl border border-[var(--pi-border)] bg-white px-4 py-3 transition-all focus:border-transparent focus:ring-2 focus:ring-[var(--pi-focus)] focus:outline-none"
									disabled={loading}
									required
								/>
							</div>

							<!-- Password Field -->
							<div>
								<label for="password" class="mb-2 block text-sm font-semibold text-gray-900">
									Password
								</label>
								<input
									type="password"
									id="password"
									bind:value={password}
									on:keydown={handleKeyDown}
									placeholder="••••••••"
									class="w-full rounded-xl border border-[var(--pi-border)] bg-white px-4 py-3 transition-all focus:border-transparent focus:ring-2 focus:ring-[var(--pi-focus)] focus:outline-none"
									disabled={loading}
									required
								/>
							</div>

							<!-- Login Button -->
							<button
								type="submit"
								disabled={loading || !email || !password}
								class="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--pi-primary)] px-4 py-3 font-bold text-white shadow-sm transition-colors hover:bg-[color-mix(in_oklch,var(--pi-primary)_92%,black)] disabled:cursor-not-allowed disabled:opacity-50"
							>
								{#if loading}
									<span class="inline-flex h-4 w-4 animate-spin">
										<svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4">
											<path
												fill="currentColor"
												opacity="0.25"
												d="M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-8-8V2z"
											/>
											<path fill="currentColor" d="M20 12a8 8 0 0 0-8-8V2a10 10 0 0 1 10 10h-2z" />
										</svg>
									</span>
									Signing in...
								{:else}
									Sign In
								{/if}
							</button>
						</form>
					</div>
				{/if}
			</div>
		</div>
	</section>
</div>
