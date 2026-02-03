import { json } from '@sveltejs/kit';

function safeObject(value) {
	return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

export async function GET({ locals, params }) {
	if (!locals.pb || !locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		// Ensure client is accessible to current user.
		await locals.pb.collection('clients').getOne(params.clientId);

		const res = await locals.pb
			.collection('custom_graphs')
			.getList(1, 200, { filter: `client="${params.clientId}"`, sort: '-created' });

		const items = (res?.items || []).map((g) => ({ id: g.id, spec: g.spec }));
		return json({ items });
	} catch (err) {
		const status = err?.status || err?.response?.code || 500;
		const message = err?.response?.message || err?.message || 'Failed to load custom graphs.';
		return json({ error: message }, { status: status >= 400 && status <= 599 ? status : 500 });
	}
}

export async function POST({ locals, params, request }) {
	if (!locals.pb || !locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => ({}));
	const spec = safeObject(body?.spec);
	if (!spec) return json({ error: 'Invalid graph spec.' }, { status: 400 });

	try {
		await locals.pb.collection('clients').getOne(params.clientId);

		const created = await locals.pb.collection('custom_graphs').create({
			client: params.clientId,
			spec,
			title: typeof spec.title === 'string' ? spec.title.slice(0, 80) : '',
			createdBy: locals.user.id
		});

		return json({ id: created.id, spec: created.spec });
	} catch (err) {
		const message = err?.response?.message || err?.message || 'Failed to create graph.';
		return json({ error: message }, { status: 500 });
	}
}
