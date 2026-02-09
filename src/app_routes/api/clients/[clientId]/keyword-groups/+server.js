import { json } from '@sveltejs/kit';

function safeName(value) {
	return String(value || '').trim().slice(0, 80);
}

export async function GET({ locals, params }) {
	if (!locals.pb || !locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		await locals.pb.collection('clients').getOne(params.clientId);

		const res = await locals.pb
			.collection('keyword_groups')
			.getList(1, 200, { filter: `client="${params.clientId}"`, sort: 'sortOrder,name' });

		const items = (res?.items || []).map((g) => ({
			id: g.id,
			name: g.name,
			sortOrder: typeof g.sortOrder === 'number' ? g.sortOrder : null
		}));

		return json({ items });
	} catch (err) {
		const status = err?.status || err?.response?.code || 500;
		const message = err?.response?.message || err?.message || 'Failed to load keyword groups.';
		return json({ error: message }, { status: status >= 400 && status <= 599 ? status : 500 });
	}
}

export async function POST({ locals, params, request }) {
	if (!locals.pb || !locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => ({}));
	const name = safeName(body?.name);
	if (!name) return json({ error: 'Group name is required.' }, { status: 400 });

	try {
		await locals.pb.collection('clients').getOne(params.clientId);

		const created = await locals.pb.collection('keyword_groups').create({
			client: params.clientId,
			name,
			createdBy: locals.user.id
		});

		return json({ id: created.id, name: created.name, sortOrder: created.sortOrder ?? null });
	} catch (err) {
		const message = err?.response?.message || err?.message || 'Failed to create keyword group.';
		return json({ error: message }, { status: 500 });
	}
}

