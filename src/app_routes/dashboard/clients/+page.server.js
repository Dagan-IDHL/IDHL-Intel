export async function load({ fetch }) {
	const res = await fetch('/api/clients');
	const data = await res.json().catch(() => ({}));

	if (!res.ok) {
		return { clients: [], error: data?.error || 'Failed to load clients.' };
	}

	return { clients: data.items || [], error: '' };
}
