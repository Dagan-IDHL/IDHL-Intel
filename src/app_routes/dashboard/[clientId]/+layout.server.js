import { error } from '@sveltejs/kit';

export async function load({ locals, params }) {
	if (!locals.pb || !locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const client = await locals.pb.collection('clients').getOne(params.clientId);
		return {
			client: {
				id: client.id,
				clientName: client.clientName,
				url: client.url
			}
		};
	} catch (err) {
		throw error(404, err?.response?.message || 'Client not found');
	}
}
