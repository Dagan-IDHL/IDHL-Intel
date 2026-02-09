import { json } from '@sveltejs/kit';

export async function PATCH({ locals, params, request }) {
	if (!locals.pb || !locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => ({}));
	const groupId = String(body?.groupId || '').trim();
	if (!groupId) return json({ error: 'groupId is required.' }, { status: 400 });

	try {
		await locals.pb.collection('clients').getOne(params.clientId);

		const existing = await locals.pb.collection('keywords').getOne(params.keywordId);
		if (String(existing?.client || '') !== String(params.clientId || '')) {
			return json({ error: 'Not found.' }, { status: 404 });
		}

		const updated = await locals.pb.collection('keywords').update(params.keywordId, { group: groupId });

		return json({
			ok: true,
			id: updated.id,
			groupId: typeof updated.group === 'string' ? updated.group : groupId
		});
	} catch (err) {
		const status = err?.status || err?.response?.code || 500;
		const message = err?.response?.message || err?.message || 'Failed to update keyword.';
		return json({ error: message }, { status: status >= 400 && status <= 599 ? status : 500 });
	}
}

