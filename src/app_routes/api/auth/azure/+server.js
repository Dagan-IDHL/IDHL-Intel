import { redirect } from '@sveltejs/kit';

export async function GET() {
	// Not implemented yet (Phase 8 will add real OAuth).
	throw redirect(303, '/login?error=Microsoft%20login%20is%20not%20configured%20yet');
}
