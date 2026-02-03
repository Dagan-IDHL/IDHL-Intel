export async function load({ locals }) {
	const record = locals.user;
	const email = typeof record?.email === 'string' ? record.email : '';
	const role = typeof record?.role === 'string' ? record.role : 'standard';

	return {
		user: email ? { id: record?.id, email, role } : null
	};
}
