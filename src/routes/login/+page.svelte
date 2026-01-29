<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let email = '';
	let password = '';
	let error = '';
	let loading = false;
	let showLegacyLogin = false;

	onMount(() => {
		const errorParam = $page.url.searchParams.get('error');
		if (errorParam) error = errorParam;

		// Hide email/password by default, but keep the legacy login flow available.
		// Enable by visiting /login?legacy=1 (and always toggleable in dev).
		showLegacyLogin = $page.url.searchParams.get('legacy') === '1';
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

<div
	class="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#404b77] via-[#505c8f] to-[#3a4267] p-4"
>
	<!-- Left side - Branding section (hidden on mobile) -->
	<div class="hidden flex-col items-center justify-center px-8 text-white lg:flex lg:w-1/2">
		<div class="text-center">
			<h1 class="mb-4 text-5xl font-bold">IDHL Sidekick</h1>
			<p class="text-xl opacity-90">Digital Marketing Suite</p>
		</div>
	</div>

	<!-- Right side - Login form -->
	<div class="flex w-full items-center justify-center lg:w-1/2">
		<div class="w-full max-w-md">
			<div class="rounded-2xl bg-white p-8 shadow-2xl lg:p-10">
				<!-- Logo for mobile -->
				<div class="mb-8 text-center lg:hidden">
					<h1 class="mb-2 text-3xl font-bold text-[#404b77]">IDHL Sidekick</h1>
					<p class="text-sm text-gray-600">Digital Marketing Suite</p>
				</div>

				<h2 class="mb-2 text-3xl font-bold text-gray-900">Welcome Back</h2>
				<p class="mb-8 text-gray-600">Sign in with Microsoft to continue</p>

				<!-- Error Message -->
				{#if error}
					<div class="mb-6 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
						<span class="text-xl text-red-600">⚠️</span>
						<p class="text-sm text-red-700">{error}</p>
					</div>
				{/if}

				<div class="space-y-6">
					<!-- Microsoft Sign-In -->
					<a
						href="/api/auth/azure"
						class="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 px-4 py-3 font-semibold text-gray-900 transition-colors duration-200 hover:bg-gray-50"
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
							<span class="inline-block animate-spin">⏳</span>
							Redirecting...
						{:else}
							Continue with Microsoft
						{/if}
					</a>

					{#if import.meta.env.DEV && !showLegacyLogin}
						<button
							type="button"
							class="w-full text-xs font-medium text-[#404b77] hover:underline"
							on:click={() => (showLegacyLogin = true)}
						>
							Use legacy email/password login
						</button>
					{/if}
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
									class="w-full rounded-lg border border-gray-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[#404b77] focus:outline-none"
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
									class="w-full rounded-lg border border-gray-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[#404b77] focus:outline-none"
									disabled={loading}
									required
								/>
							</div>

							<!-- Login Button -->
							<button
								type="submit"
								disabled={loading || !email || !password}
								class="flex w-full items-center justify-center gap-2 rounded-lg bg-[#404b77] px-4 py-3 font-bold text-white transition-colors duration-200 hover:bg-[#505c8f] disabled:cursor-not-allowed disabled:opacity-50"
							>
								{#if loading}
									<span class="inline-block animate-spin">⏳</span>
									Signing in...
								{:else}
									Sign In
								{/if}
							</button>
						</form>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="mt-8 text-center text-sm text-white opacity-75">
				<p>© 2025 IDHL Group. All rights reserved.</p>
			</div>
		</div>
	</div>
</div>

{#if false}
	<!-- Old Intel login UI kept for reference -->

	<div
		class="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#404b77] via-[#505c8f] to-[#3a4267] p-4"
	>
		<div class="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
			<div class="grid grid-cols-1 lg:grid-cols-2">
				<!-- Branding -->
				<div class="hidden flex-col justify-between bg-[#404b77] p-10 text-white lg:flex">
					<div>
						<div class="flex items-center gap-3">
							<div class="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white">
								<span class="text-sm font-semibold">SK</span>
							</div>
							<div class="text-sm font-semibold">IDHL Sidekick</div>
						</div>
						<h1 class="mt-10 text-4xl leading-tight font-bold">Intel workspace</h1>
						<p class="mt-3 text-sm text-white/85">
							A lightweight UI shell for Sidekick-style pages. No functionality wired up yet.
						</p>
					</div>
					<div class="text-xs text-white/70">© {new Date().getFullYear()} IDHL Group</div>
				</div>

				<!-- Form -->
				<div class="p-8 sm:p-10">
					<div class="lg:hidden">
						<div class="text-sm font-semibold text-[#404b77]">IDHL Sidekick</div>
						<div class="mt-1 text-xs text-gray-600">Intel</div>
					</div>

					<h2 class="mt-6 text-3xl font-bold text-gray-900">Welcome back</h2>
					<p class="mt-2 text-sm text-gray-600">Sign in to access your dashboard.</p>

					<div class="mt-8 space-y-6">
						<button
							type="button"
							class="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
						>
							<span class="inline-flex h-5 w-5 items-center justify-center">
								<svg viewBox="0 0 23 23" aria-hidden="true" class="h-5 w-5">
									<path fill="#f25022" d="M1 1h10v10H1z" />
									<path fill="#7fba00" d="M12 1h10v10H12z" />
									<path fill="#00a4ef" d="M1 12h10v10H1z" />
									<path fill="#ffb900" d="M12 12h10v10H12z" />
								</svg>
							</span>
							Continue with Microsoft
						</button>

						<div class="flex items-center gap-3">
							<div class="h-px flex-1 bg-gray-200"></div>
							<span class="text-xs font-semibold text-gray-500">OR</span>
							<div class="h-px flex-1 bg-gray-200"></div>
						</div>

						<form class="space-y-5">
							<div>
								<label for="email" class="mb-2 block text-sm font-semibold text-gray-900"
									>Email</label
								>
								<input
									id="email"
									type="email"
									placeholder="you@idhl.ai"
									class="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-[#404b77] focus:outline-none"
								/>
							</div>
							<div>
								<label for="password" class="mb-2 block text-sm font-semibold text-gray-900"
									>Password</label
								>
								<input
									id="password"
									type="password"
									placeholder="••••••••"
									class="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-[#404b77] focus:outline-none"
								/>
							</div>

							<a
								href="/dashboard"
								class="block w-full rounded-lg bg-[#404b77] px-4 py-3 text-center text-sm font-bold text-white hover:bg-[#505c8f]"
								>Sign in</a
							>
						</form>

						<p class="text-xs text-gray-500">
							This is UI-only. Buttons/fields don’t authenticate yet.
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background-color: #404b77;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	:global(.animate-spin) {
		animation: spin 1s linear infinite;
	}
</style>
