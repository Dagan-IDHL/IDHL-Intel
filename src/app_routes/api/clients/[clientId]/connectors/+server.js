import { json } from '@sveltejs/kit';

function safeObject(value) {
	return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

export async function GET({ locals, params }) {
	if (!locals.pb || !locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		await locals.pb.collection('clients').getOne(params.clientId);

		const res = await locals.pb
			.collection('connectors')
			.getList(1, 50, { filter: `client="${params.clientId}"`, sort: 'provider' });

		const items = (res?.items || []).map((c) => ({
			id: c.id,
			provider: c.provider,
			status: c.status,
			config: c.config || {}
		}));

		return json({ items });
	} catch (err) {
		const message = err?.response?.message || err?.message || 'Failed to load connectors.';
		return json({ error: message }, { status: 500 });
	}
}

export async function PUT({ locals, params, request }) {
	if (!locals.pb || !locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => ({}));
	const provider = String(body?.provider || '').trim();
	const config = safeObject(body?.config) || {};
	const status = String(body?.status || '').trim();

	if (!provider) return json({ error: 'Provider is required.' }, { status: 400 });

	try {
		await locals.pb.collection('clients').getOne(params.clientId);

		let existing = null;
		try {
			existing = await locals.pb
				.collection('connectors')
				.getFirstListItem(`client="${params.clientId}" && provider="${provider}"`);
		} catch (err) {
			if (!(err?.status === 404 || err?.response?.code === 404)) throw err;
		}

		const payload = {
			client: params.clientId,
			provider,
			status: status || 'disconnected',
			config
		};

		const saved = existing
			? await locals.pb.collection('connectors').update(existing.id, payload)
			: await locals.pb.collection('connectors').create(payload);

		return json({ ok: true, id: saved.id });
	} catch (err) {
		const message = err?.response?.message || err?.message || 'Failed to save connector.';
		return json({ error: message }, { status: 500 });
	}
}
