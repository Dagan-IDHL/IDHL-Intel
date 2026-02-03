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

export async function GET({ locals }) {
	if (!locals.pb || !locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const res = await locals.pb.collection('clients').getList(1, 200, { sort: 'clientName' });
		const items = (res?.items || []).map((c) => ({
			id: c.id,
			clientName: c.clientName,
			url: c.url
		}));
		return json({ items });
	} catch (err) {
		const message = err?.response?.message || err?.message || 'Failed to load clients.';
		return json({ error: message }, { status: 500 });
	}
}

export async function POST({ locals, request }) {
	if (!locals.pb || !locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => ({}));
	const clientName = String(body?.clientName || '').trim();
	const url = normalizeUrl(body?.url || '');

	if (!clientName) return json({ error: 'Client name is required.' }, { status: 400 });
	if (!url) return json({ error: 'Website URL is required.' }, { status: 400 });

	try {
		const created = await locals.pb.collection('clients').create({
			clientName,
			url,
			users: [locals.user.id]
		});
		return json({ id: created.id, clientName: created.clientName, url: created.url });
	} catch (err) {
		const message = err?.response?.message || err?.message || 'Failed to create client.';
		return json({ error: message }, { status: 500 });
	}
}
