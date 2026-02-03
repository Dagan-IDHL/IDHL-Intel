function safeArray(value) {
	return Array.isArray(value) ? value : [];
}

export async function load({ locals, params }) {
	const clientId = params.clientId;

	let customGraphs = [];
	try {
		const res = await locals.pb
			.collection('custom_graphs')
			.getList(1, 200, { filter: `client="${clientId}"`, sort: '-created' });
		customGraphs = safeArray(res?.items).map((g) => ({ id: g.id, spec: g.spec }));
	} catch {
		customGraphs = [];
	}

	return { customGraphs };
}
