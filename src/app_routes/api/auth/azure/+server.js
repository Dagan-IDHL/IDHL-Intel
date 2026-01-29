import { redirect } from '@sveltejs/kit';

export async function GET({ cookies }) {
	// UI-only: mimic a successful Microsoft login.
	cookies.set(
		'intel_user',
		JSON.stringify({
			email: 'user@idhl.ai',
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

	throw redirect(303, '/dashboard');
}
