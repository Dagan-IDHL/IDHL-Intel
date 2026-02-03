import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function POST({ request, locals }) {
	const body = await request.json().catch(() => ({}));
	const email = String(body?.email || '').trim();
	const password = String(body?.password || '').trim();

	if (!email || !password) {
		return json({ error: 'Email and password are required' }, { status: 400 });
	}

	if (!locals.pb) {
		return json(
			{ error: 'PocketBase is not configured (missing POCKETBASE_URL).' },
			{ status: 500 }
		);
	}

	const authCollection = env.POCKETBASE_AUTH_COLLECTION || 'users';

	try {
		await locals.pb.collection(authCollection).authWithPassword(email, password);
	} catch (err) {
		const message =
			typeof err?.response?.message === 'string'
				? err.response.message
				: typeof err?.message === 'string'
					? err.message
					: 'Login failed. Please try again.';
		return json({ error: message }, { status: 401 });
	}

	return json({ ok: true });
}
