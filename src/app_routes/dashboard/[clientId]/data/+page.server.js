export async function load({ locals }) {
	let prefs = {};
	try {
		const record = await locals.pb
			.collection('user_preferences')
			.getFirstListItem(`user="${locals.user.id}"`);
		prefs = record.prefs || {};
	} catch {
		prefs = {};
	}

	return { prefs };
}
