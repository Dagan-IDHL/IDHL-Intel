import { json } from '@sveltejs/kit';

export async function DELETE({ locals, params }) {
	if (!locals.pb || !locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		await locals.pb.collection('clients').getOne(params.clientId);

		const existing = await locals.pb.collection('custom_graphs').getOne(params.graphId);
		if (existing?.client !== params.clientId) {
			return json({ error: 'Not found' }, { status: 404 });
		}

		await locals.pb.collection('custom_graphs').delete(params.graphId);
		return json({ ok: true });
	} catch (err) {
		const status = err?.status || err?.response?.code || 500;
		const message = err?.response?.message || err?.message || 'Failed to delete graph.';
		return json({ error: message }, { status: status >= 400 && status <= 599 ? status : 500 });
	}
}
