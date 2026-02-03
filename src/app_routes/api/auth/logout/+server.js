import { json } from '@sveltejs/kit';

export async function POST({ locals }) {
	if (locals.pb) locals.pb.authStore.clear();
	return json({ ok: true });
}
