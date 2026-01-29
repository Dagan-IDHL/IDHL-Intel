function safeParseJson(value) {
	if (!value) return null;
	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}

export async function load({ cookies }) {
	const raw = cookies.get('intel_user');
	const parsed = safeParseJson(raw) || {};
	const email = typeof parsed?.email === 'string' ? parsed.email : '';
	const role = typeof parsed?.role === 'string' ? parsed.role : 'standard';

	return {
		user: email ? { email, role } : null
	};
}
