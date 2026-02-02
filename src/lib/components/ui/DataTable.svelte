<script>
	/**
	 * @typedef {Object} Column
	 * @property {string} key
	 * @property {string} label
	 * @property {'left'|'right'} [align]
	 */

	/** @type {Column[]} */
	export let columns = [];
	export let rows = [];
	export let emptyLabel = 'No data';
</script>

<div class="overflow-hidden rounded-xl border border-[var(--pi-border)] bg-white">
	<table class="w-full table-fixed border-collapse text-sm">
		<thead class="bg-[var(--pi-surface-2)]">
			<tr>
				{#each columns as col (col.key)}
					<th
						class="px-3 py-2 text-[11px] font-semibold tracking-wide text-[var(--pi-muted)] uppercase"
						class:text-left={!col.align || col.align === 'left'}
						class:text-right={col.align === 'right'}
					>
						{col.label}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#if !rows || rows.length === 0}
				<tr>
					<td class="px-3 py-3 text-sm text-[var(--pi-muted)]" colspan={columns.length}>
						{emptyLabel}
					</td>
				</tr>
			{:else}
				{#each rows as row, i (row?.id ?? i)}
					<tr class="border-t border-[color-mix(in_oklch,var(--pi-border)_55%,transparent)]">
						{#each columns as col (col.key)}
							<td
								class="truncate px-3 py-2 text-gray-800"
								class:text-left={!col.align || col.align === 'left'}
								class:text-right={col.align === 'right'}
							>
								{row?.[col.key]}
							</td>
						{/each}
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
