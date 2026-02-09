import { json } from '@sveltejs/kit';

function normalizeUrl(raw) {
	const value = String(raw || '').trim();
	if (!value) return '';
	try {
		const url = new URL(
			value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`
		);
		url.hash = '';
		return url.toString().replace(/\/+$/, '');
	} catch {
		return value;
	}
}

export async function PATCH({ locals, request, params }) {
	if (!locals.pb || !locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => ({}));
	const clientName = String(body?.clientName || '').trim();
	const url = normalizeUrl(body?.url || '');

	if (!clientName) return json({ error: 'Client name is required.' }, { status: 400 });
	if (!url) return json({ error: 'Website URL is required.' }, { status: 400 });

	try {
		const updated = await locals.pb.collection('clients').update(params.clientId, {
			clientName,
			url
		});
		return json({ id: updated.id, clientName: updated.clientName, url: updated.url });
	} catch (err) {
		const message = err?.response?.message || err?.message || 'Failed to update client.';
		return json({ error: message }, { status: 500 });
	}
}
