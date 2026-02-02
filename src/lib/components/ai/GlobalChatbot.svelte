<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { dashboardContext } from '$lib/stores/dashboardContext.js';
	import { addCustomGraph } from '$lib/stores/customAnalysisGraphs.js';

	let open = false;
	let input = '';
	let loading = false;
	let error = '';

	/** @type {{ id: string, role: 'user'|'assistant', content: string, mode?: string, graphSpec?: any, clarifyingQuestions?: string[] }[]} */
	let thread = [];
	let addedByMessageId = {};

	function uid() {
		return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
	}

	function toggle() {
		open = !open;
		error = '';
	}

	function close() {
		open = false;
	}

	function currentContext() {
		let ctx = null;
		const unsub = dashboardContext.subscribe((v) => (ctx = v));
		unsub();
		return ctx;
	}

	function buildRequestMessages() {
		return thread
			.filter((m) => m.role === 'user' || m.role === 'assistant')
			.slice(-10)
			.map((m) => ({
				role: m.role,
				content: m.content
			}));
	}

	async function send(text) {
		const prompt = String(text ?? input ?? '').trim();
		if (!prompt) return;

		error = '';
		loading = true;

		thread = [...thread, { id: uid(), role: 'user', content: prompt }];
		input = '';

		try {
			const ctx = currentContext();
			const clientId = $page.params?.clientId || ctx?.clientId || null;

			const res = await fetch('/api/ai/chat', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					messages: buildRequestMessages(),
					context: { ...ctx, clientId, location: $page.url.pathname }
				})
			});
			const json = await res.json().catch(() => null);
			if (!res.ok) throw new Error(json?.error || 'AI request failed');

			thread = [
				...thread,
				{
					id: uid(),
					role: 'assistant',
					content: json.answer || '',
					mode: json.mode,
					graphSpec: json.graphSpec || null,
					clarifyingQuestions: json.clarifyingQuestions || []
				}
			];
		} catch (e) {
			error = e?.message || 'AI request failed';
		} finally {
			loading = false;
		}
	}

	function parseClarify(q) {
		const raw = String(q || '').trim();
		const m = raw.match(/^(.*?)(?:\s*\[([^\]]+)\])\s*$/);
		if (!m) return { question: raw, options: [] };
		const question = String(m[1] || '').trim();
		const options = String(m[2] || '')
			.split('|')
			.map((s) => s.trim())
			.filter(Boolean)
			.slice(0, 7);
		return { question, options };
	}

	function answerClarify(question, option) {
		const q = String(question || '').trim();
		const a = String(option || '').trim();
		if (!a) return;
		send(q ? `For "${q}": ${a}` : a);
	}

	function addGraph(spec) {
		const clientId = $page.params?.clientId;
		if (!clientId || !spec) return;
		addCustomGraph(clientId, spec);
	}

	function addGraphFromMessage(msgId, spec) {
		addGraph(spec);
		addedByMessageId = { ...addedByMessageId, [msgId]: true };
	}

	function viewCustomAnalysis() {
		const clientId = $page.params?.clientId;
		if (!clientId) return;
		goto(`/dashboard/${clientId}/custom-analysis`);
	}
</script>

<!-- Launcher -->
<div class="fixed right-5 bottom-5 z-40">
	<button
		type="button"
		on:click={toggle}
		class="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--pi-primary)] text-white shadow-lg hover:bg-[color-mix(in_oklch,var(--pi-primary)_92%,black)]"
		aria-label="Open chatbot"
	>
		<svg
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
			<path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
		</svg>
	</button>

	{#if open}
		<div class="fixed inset-0 z-40" on:click={close} />
		<section
			class="fixed right-5 bottom-20 z-50 flex h-[70vh] w-[520px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
			on:click|stopPropagation={() => {}}
		>
			<header class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
				<div class="min-w-0">
					<div class="truncate text-sm font-semibold text-gray-900">Chat</div>
					<div class="truncate text-xs text-gray-500">Ask about all dashboard data</div>
				</div>
				<button
					type="button"
					class="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
					on:click={close}
					aria-label="Close"
				>
					×
				</button>
			</header>

			<div class="flex-1 space-y-3 overflow-auto px-4 py-3">
				{#if thread.length === 0}
					<div class="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
						Try:
						<ul class="mt-2 list-disc pl-5 text-sm text-gray-700">
							<li>What is driving sessions down month-on-month?</li>
							<li>Show brand vs non-brand clicks for last month as a line graph</li>
							<li>Create a pie chart of brand vs non-brand clicks</li>
							<li>Which referral sources grew the most?</li>
						</ul>
					</div>
				{/if}

				{#each thread as msg (msg.id)}
					{#if msg.role === 'user'}
						<div class="flex justify-end">
							<div
								class="max-w-[85%] rounded-2xl bg-[var(--pi-primary)] px-3 py-2 text-sm text-white"
							>
								{msg.content}
							</div>
						</div>
					{:else}
						<div class="flex justify-start">
							<div class="max-w-[85%] rounded-2xl bg-gray-50 px-3 py-2 text-sm text-gray-900">
								<div class="whitespace-pre-wrap">{msg.content}</div>

								{#if msg.mode === 'clarify' && msg.clarifyingQuestions?.length}
									<div class="mt-3 space-y-2">
										<div class="text-xs font-semibold text-gray-600">Clarify:</div>
										{#each msg.clarifyingQuestions as raw (raw)}
											{@const parsed = parseClarify(raw)}
											<div class="rounded-xl border border-gray-200 bg-white p-3">
												<div class="text-sm font-semibold text-gray-900">{parsed.question}</div>
												{#if parsed.options.length}
													<div class="mt-2 flex flex-wrap gap-2">
														{#each parsed.options as opt (opt)}
															<button
																type="button"
																class="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
																on:click={() => answerClarify(parsed.question, opt)}
															>
																{opt}
															</button>
														{/each}
													</div>
												{:else}
													<div class="mt-2 text-xs text-gray-600">
														Reply in chat with your answer.
													</div>
												{/if}
											</div>
										{/each}
									</div>
								{/if}

								{#if msg.mode === 'graph' && msg.graphSpec}
									<div class="mt-3 flex flex-wrap items-center gap-2">
										<button
											type="button"
											class="rounded-lg bg-[var(--pi-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[color-mix(in_oklch,var(--pi-primary)_92%,black)]"
											on:click={() => addGraphFromMessage(msg.id, msg.graphSpec)}
											disabled={!$page.params?.clientId || addedByMessageId[msg.id]}
										>
											{addedByMessageId[msg.id] ? 'Added' : 'Add to Custom Analysis'}
										</button>
										{#if $page.params?.clientId}
											<button
												type="button"
												class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
												on:click={viewCustomAnalysis}
											>
												View
											</button>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					{/if}
				{/each}

				{#if loading}
					<div class="flex justify-start">
						<div class="rounded-2xl bg-gray-50 px-3 py-2 text-sm text-gray-700">Thinking…</div>
					</div>
				{/if}

				{#if error}
					<div class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
						{error}
					</div>
				{/if}
			</div>

			<footer class="border-t border-gray-100 px-4 py-3">
				<div class="flex items-end gap-2">
					<textarea
						class="min-h-[44px] w-full resize-none rounded-lg border border-[var(--pi-border)] px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[var(--pi-focus)]"
						placeholder="Ask a question…"
						bind:value={input}
					/>
					<button
						type="button"
						class="shrink-0 rounded-lg bg-[var(--pi-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color-mix(in_oklch,var(--pi-primary)_92%,black)] disabled:opacity-60"
						on:click={() => send()}
						disabled={loading || !String(input || '').trim()}
					>
						Send
					</button>
				</div>
			</footer>
		</section>
	{/if}
</div>
