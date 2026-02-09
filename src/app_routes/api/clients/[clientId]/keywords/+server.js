import { json } from '@sveltejs/kit';

function safeArray(value) {
	return Array.isArray(value) ? value : [];
}

function safeKeyword(value) {
	return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 120);
}

function safeNumber(value) {
	const n = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(n) ? n : null;
}

export async function GET({ locals, params }) {
	if (!locals.pb || !locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		await locals.pb.collection('clients').getOne(params.clientId);

		const res = await locals.pb.collection('keywords').getList(1, 2000, {
			filter: `client="${params.clientId}"`,
			sort: 'created',
			expand: 'group'
		});

		const items = (res?.items || []).map((k) => ({
			id: k.id,
			keyword: k.keyword,
			volume: safeNumber(k.volume),
			groupId: typeof k.group === 'string' ? k.group : null
		}));

		return json({ items });
	} catch (err) {
		const status = err?.status || err?.response?.code || 500;
		const message = err?.response?.message || err?.message || 'Failed to load keywords.';
		return json({ error: message }, { status: status >= 400 && status <= 599 ? status : 500 });
	}
}

export async function POST({ locals, params, request }) {
	if (!locals.pb || !locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => ({}));
	const groupId = String(body?.groupId || '').trim();
	const items = safeArray(body?.items).map((it) => ({
		keyword: safeKeyword(it?.keyword),
		volume: safeNumber(it?.volume)
	}));

	const clean = items.filter((it) => it.keyword);
	if (!groupId) return json({ error: 'groupId is required.' }, { status: 400 });
	if (clean.length === 0) return json({ error: 'items is required.' }, { status: 400 });

	try {
		await locals.pb.collection('clients').getOne(params.clientId);

		// Load existing keywords for de-dupe (case-insensitive).
		const existing = await locals.pb.collection('keywords').getList(1, 2000, {
			filter: `client="${params.clientId}"`,
			fields: 'id,keyword'
		});
		const existingTerms = new Set(
			(existing?.items || []).map((k) => String(k.keyword || '').toLowerCase().trim())
		);

		const createdItems = [];
		for (const it of clean) {
			const key = it.keyword.toLowerCase().trim();
			if (!key || existingTerms.has(key)) continue;
			existingTerms.add(key);

			const created = await locals.pb.collection('keywords').create({
				client: params.clientId,
				group: groupId,
				keyword: it.keyword,
				volume: it.volume ?? null,
				createdBy: locals.user.id
			});
			createdItems.push({
				id: created.id,
				keyword: created.keyword,
				volume: safeNumber(created.volume),
				groupId: typeof created.group === 'string' ? created.group : groupId
			});
		}

		return json({ items: createdItems });
	} catch (err) {
		const message = err?.response?.message || err?.message || 'Failed to save keywords.';
		return json({ error: message }, { status: 500 });
	}
}

