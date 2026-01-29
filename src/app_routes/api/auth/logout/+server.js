import { json } from '@sveltejs/kit';

export async function POST({ cookies }) {
	cookies.delete('intel_user', { path: '/' });
	return json({ ok: true });
}
