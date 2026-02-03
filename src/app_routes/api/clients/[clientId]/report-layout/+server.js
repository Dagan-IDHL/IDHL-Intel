import { json } from '@sveltejs/kit';

function safeArray(value) {
	return Array.isArray(value) ? value : [];
}

export async function GET({ locals, params }) {
	if (!locals.pb || !locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		await locals.pb.collection('clients').getOne(params.clientId);

		const record = await locals.pb
			.collection('report_layouts')
			.getFirstListItem(`client="${params.clientId}"`);

		return json({
			id: record.id,
			title: record.title || 'Report',
			items: safeArray(record.items)
		});
	} catch (err) {
		// If no layout exists yet, return defaults.
		if (err?.status === 404 || err?.response?.code === 404) {
			return json({ id: null, title: 'Report', items: [] });
		}
		const message = err?.response?.message || err?.message || 'Failed to load report layout.';
		return json({ error: message }, { status: 500 });
	}
}

export async function PUT({ locals, params, request }) {
	if (!locals.pb || !locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => ({}));
	const title = String(body?.title || 'Report').slice(0, 60);
	const items = safeArray(body?.items);

	try {
		await locals.pb.collection('clients').getOne(params.clientId);

		let existing = null;
		try {
			existing = await locals.pb
				.collection('report_layouts')
				.getFirstListItem(`client="${params.clientId}"`);
		} catch (err) {
			if (!(err?.status === 404 || err?.response?.code === 404)) throw err;
		}

		const payload = {
			client: params.clientId,
			title,
			items,
			updatedBy: locals.user.id
		};

		const saved = existing
			? await locals.pb.collection('report_layouts').update(existing.id, payload)
			: await locals.pb.collection('report_layouts').create(payload);

		return json({ ok: true, id: saved.id });
	} catch (err) {
		const message = err?.response?.message || err?.message || 'Failed to save report layout.';
		return json({ error: message }, { status: 500 });
	}
}
