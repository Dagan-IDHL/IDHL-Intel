import { json } from '@sveltejs/kit';

function safeObject(value) {
	return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

export async function GET({ locals }) {
	if (!locals.pb || !locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const record = await locals.pb
			.collection('user_preferences')
			.getFirstListItem(`user="${locals.user.id}"`);
		return json({ prefs: record.prefs || {} });
	} catch (err) {
		if (err?.status === 404 || err?.response?.code === 404) {
			return json({ prefs: {} });
		}
		const message = err?.response?.message || err?.message || 'Failed to load preferences.';
		return json({ error: message }, { status: 500 });
	}
}

export async function PUT({ locals, request }) {
	if (!locals.pb || !locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => ({}));
	const prefs = safeObject(body?.prefs);
	if (!prefs) return json({ error: 'Invalid preferences payload.' }, { status: 400 });

	try {
		let existing = null;
		try {
			existing = await locals.pb
				.collection('user_preferences')
				.getFirstListItem(`user="${locals.user.id}"`);
		} catch (err) {
			if (!(err?.status === 404 || err?.response?.code === 404)) throw err;
		}

		const payload = { user: locals.user.id, prefs };
		const saved = existing
			? await locals.pb.collection('user_preferences').update(existing.id, payload)
			: await locals.pb.collection('user_preferences').create(payload);

		return json({ ok: true, id: saved.id });
	} catch (err) {
		const message = err?.response?.message || err?.message || 'Failed to save preferences.';
		return json({ error: message }, { status: 500 });
	}
}
