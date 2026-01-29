<script>
	export let title = '';
	export let context = null;
	export let disabled = false;

	let open = false;
	let question = '';
	let loading = false;
	let error = '';
	/** @type {{ id: string, role: 'user'|'assistant', text?: string, result?: any }[]} */
	let thread = [];

	const suggestions = [
		'What explains the change vs the comparison period?',
		'Are there any anomalies or spikes in the trend?',
		'What should I check next to diagnose this?'
	];

	function uid() {
		return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
	}

	function toggle() {
		if (disabled) return;
		open = !open;
		error = '';
	}

	function close() {
		open = false;
	}

	function splitForHighlight(text) {
		const raw = String(text || '');
		if (!raw) return [];

		// Matches: currency, counts, decimals, percentages. Keeps the match for rendering.
		const re =
			/(£|\$|€)?\b\d{1,3}(?:,\d{3})*(?:\.\d+)?%?|\b\d+(?:\.\d+)?%?/g;

		const parts = [];
		let last = 0;
		let m;
		while ((m = re.exec(raw))) {
			if (m.index > last) parts.push({ t: raw.slice(last, m.index), n: false });
			parts.push({ t: m[0], n: true });
			last = m.index + m[0].length;
		}
		if (last < raw.length) parts.push({ t: raw.slice(last), n: false });
		return parts;
	}

	async function ask(q) {
		const prompt = String(q ?? question ?? '').trim();
		if (!prompt) return;
		if (!context || typeof context !== 'object') {
			error = 'This card has no data yet.';
			return;
		}

		error = '';
		loading = true;

		const userId = uid();
		thread = [...thread, { id: userId, role: 'user', text: prompt }];

		try {
			const res = await fetch('/api/ai/card', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ question: prompt, context })
			});
			const json = await res.json().catch(() => null);
			if (!res.ok) throw new Error(json?.error || 'AI request failed');
			thread = [...thread, { id: uid(), role: 'assistant', result: json }];
			question = '';
		} catch (e) {
			error = e?.message || 'AI request failed';
		} finally {
			loading = false;
		}
	}
</script>

<div class="relative">
	<button
		type="button"
		class="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-1.5 text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
		on:click={toggle}
		disabled={disabled}
		aria-label={`Ask AI about ${title || 'this card'}`}
		aria-disabled={disabled}
		class:opacity-50={disabled}
		class:cursor-not-allowed={disabled}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M12 8V4H8" />
			<path d="M4 14a8 8 0 1 0 8-8" />
			<path d="M12 12h4" />
			<path d="M12 16h2" />
		</svg>
	</button>

	{#if open}
		<div class="fixed inset-0 z-40" on:click={close} />
		<div
			class="absolute right-0 top-9 z-50 w-[520px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
		>
			<div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
				<div class="min-w-0">
					<p class="truncate text-sm font-semibold text-gray-900">AI analysis</p>
					{#if title}
						<p class="truncate text-xs text-gray-500">{title}</p>
					{/if}
				</div>
				<button
					type="button"
					class="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
					on:click={close}
					aria-label="Close"
				>
					×
				</button>
			</div>

			<div class="flex max-h-[70vh] flex-col px-4 py-3">
				<div class="mb-3 flex flex-wrap gap-2">
					{#each suggestions as s (s)}
						<button
							type="button"
							class="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
							on:click={() => ask(s)}
						>
							{s}
						</button>
					{/each}
				</div>

				<div class="flex-1 space-y-3 overflow-auto pr-1">
					{#each thread as msg (msg.id)}
						{#if msg.role === 'user'}
							<div class="flex justify-end">
								<div
									class="max-w-[85%] rounded-2xl bg-[#404b77] px-3 py-2 text-sm text-white shadow-sm"
								>
									{msg.text}
								</div>
							</div>
						{:else}
							<div class="flex justify-start">
								<div class="max-w-[85%] rounded-2xl bg-gray-50 px-3 py-2 text-sm text-gray-900">
									<div class="space-y-3">
										<div>
											<p class="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
												Summary
											</p>
											<ul class="mt-1 list-disc space-y-1 pl-5">
												{#each (msg.result?.summaryBullets || []) as b (b)}
													<li>
														{#each splitForHighlight(b) as p (p.t)}
															{#if p.n}
																<span
																	class="font-semibold text-[oklch(42.4%_0.199_265.638)]"
																>
																	{p.t}
																</span>
															{:else}
																<span>{p.t}</span>
															{/if}
														{/each}
													</li>
												{/each}
											</ul>
										</div>

										<div>
											<p class="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
												Key findings
											</p>
											<ul class="mt-1 list-disc space-y-1 pl-5">
												{#each (msg.result?.keyFindings || []) as b (b)}
													<li>
														{#each splitForHighlight(b) as p (p.t)}
															{#if p.n}
																<span
																	class="font-semibold text-[oklch(42.4%_0.199_265.638)]"
																>
																	{p.t}
																</span>
															{:else}
																<span>{p.t}</span>
															{/if}
														{/each}
													</li>
												{/each}
											</ul>
										</div>

										<div>
											<p class="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
												Next checks
											</p>
											<ul class="mt-1 list-disc space-y-1 pl-5">
												{#each (msg.result?.nextChecks || []) as b (b)}
													<li>
														{#each splitForHighlight(b) as p (p.t)}
															{#if p.n}
																<span
																	class="font-semibold text-[oklch(42.4%_0.199_265.638)]"
																>
																	{p.t}
																</span>
															{:else}
																<span>{p.t}</span>
															{/if}
														{/each}
													</li>
												{/each}
											</ul>
										</div>

										{#if msg.result?.confidence}
											<p class="text-xs text-gray-500">Confidence: {msg.result.confidence}</p>
										{/if}
									</div>
								</div>
							</div>
						{/if}
					{/each}

					{#if loading}
						<div class="flex justify-start">
							<div class="rounded-2xl bg-gray-50 px-3 py-2 text-sm text-gray-700">Thinking…</div>
						</div>
					{/if}
				</div>

				{#if error}
					<div class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
						{error}
					</div>
				{/if}

				<div class="mt-3 flex items-end gap-2">
					<textarea
						class="min-h-[48px] w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#404b77]"
						placeholder="Ask a question about this card..."
						bind:value={question}
					/>
					<button
						type="button"
						class="shrink-0 rounded-lg bg-[#404b77] px-4 py-2 text-sm font-semibold text-white hover:bg-[#505c8f] disabled:opacity-60"
						on:click={() => ask()}
						disabled={loading || !String(question || '').trim()}
					>
						Send
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
