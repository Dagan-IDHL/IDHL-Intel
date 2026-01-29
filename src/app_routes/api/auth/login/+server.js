import { json } from '@sveltejs/kit';

export async function POST({ request, cookies }) {
	const body = await request.json().catch(() => ({}));
	const email = String(body?.email || '').trim();
	const password = String(body?.password || '').trim();

	if (!email || !password) {
		return json({ error: 'Email and password are required' }, { status: 400 });
	}

	// UI-only auth: accept any username/password and set a cookie.
	cookies.set(
		'intel_user',
		JSON.stringify({
			email,
			role: 'standard'
		}),
		{
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 7
		}
	);

	return json({ ok: true });
}
