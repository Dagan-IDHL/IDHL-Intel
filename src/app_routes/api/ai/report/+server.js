import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { normalizeMetricId } from '$lib/analytics/normalize.js';

const DEFAULT_MODEL = 'gpt-5-mini';

function safeJsonParse(text) {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

function normalizeGraphSpec(spec) {
	if (!spec || typeof spec !== 'object') return null;
	if (!spec.version) spec.version = 1;
	if (!spec.range || typeof spec.range !== 'object') spec.range = null;
	if (!spec.compareMode) spec.compareMode = 'off';
	if (!spec.granularity) spec.granularity = 'auto';
	if (spec.limit == null) spec.limit = spec.kind === 'breakdown' ? 10 : null;

	// Ensure `metrics` exists for strict-ish callers.
	if (spec.metrics === undefined) spec.metrics = null;
	if (spec.metric) spec.metric = normalizeMetricId(spec.metric);
	if (Array.isArray(spec.metrics))
		spec.metrics = spec.metrics
			.map((m) => normalizeMetricId(m))
			.filter(Boolean)
			.slice(0, 4);

	const isValidDimension = (d) => d === 'page' || d === 'query' || d === 'source';
	if (spec.kind === 'breakdown') {
		if (!isValidDimension(spec.dimension)) spec.dimension = 'page';
	} else {
		spec.dimension = null;
	}

	return spec;
}

function normalizeKeywordSpec(spec) {
	if (!spec || typeof spec !== 'object') return null;
	return {
		version: 1,
		kind: 'keyword_tracking',
		title: String(spec.title || 'Organic Keywords').slice(0, 60),
		variant: ['avg_position', 'visibility', 'list', 'summary'].includes(String(spec.variant))
			? String(spec.variant)
			: 'avg_position',
		groupId: String(spec.groupId || 'all') || 'all',
		limit:
			spec.limit == null
				? 25
				: Math.max(5, Math.min(200, Math.round(Number(spec.limit) || 25)))
	};
}

export async function POST({ request, fetch }) {
	const apiKey = (env.OPENAI_API_KEY || '').trim();
	if (!apiKey) return json({ error: 'OPENAI_API_KEY is not set on the server.' }, { status: 500 });

	const model = String(env.OPENAI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;

	const body = await request.json().catch(() => null);
	const prompt = String(body?.prompt || '').trim();
	if (!prompt) return json({ error: 'prompt is required' }, { status: 400 });

	const system = [
		'You build dashboards for a digital marketing reporting suite.',
		'Return a report layout as JSON only.',
		'Use ONLY supported card types:',
		'- Analytics graph cards: kind in [time_series, brand_split, breakdown, kpi_split, multi_time_series].',
		'- Keyword cards: kind="keyword_tracking" with variant in [avg_position, visibility, list].',
		'Prefer 6-12 cards. Avoid duplicates.',
		'For an "organic performance" report, include clicks, impressions, CTR, top queries, top pages, and keyword cards.',
		'Do not invent metrics outside: sessions, engagedSessions, bounceRate, clicks, impressions, ctr, purchases, revenue, averagePurchaseValue.',
		'Use breakdown dimensions only: page, query, source.',
		'Use span 4 for wide charts and tables; span 2 for smaller time series.',
		'Be concise.'
	].join(' ');

	const graphSpecSchema = {
		type: 'object',
		additionalProperties: false,
		properties: {
			version: { type: 'integer', enum: [1] },
			kind: {
				type: 'string',
				enum: ['time_series', 'brand_split', 'breakdown', 'kpi_split', 'multi_time_series']
			},
			title: { type: 'string', maxLength: 60 },
			metric: { type: 'string', maxLength: 32 },
			metrics: {
				anyOf: [
					{ type: 'null' },
					{ type: 'array', maxItems: 4, items: { type: 'string', maxLength: 32 } }
				]
			},
			dimension: { type: ['string', 'null'], maxLength: 32 },
			chartType: {
				type: 'string',
				enum: ['line', 'bar', 'stacked_area', 'stacked_bar', 'table', 'pie']
			},
			range: {
				anyOf: [
					{ type: 'null' },
					{
						type: 'object',
						additionalProperties: false,
						properties: {
							start: { type: 'string', maxLength: 16 },
							end: { type: 'string', maxLength: 16 }
						},
						required: ['start', 'end']
					}
				]
			},
			compareMode: { type: 'string', enum: ['off', 'mom', 'yoy'] },
			granularity: { type: 'string', enum: ['auto', 'daily', 'weekly', 'monthly'] },
			limit: { anyOf: [{ type: 'null' }, { type: 'integer', minimum: 1, maximum: 50 }] }
		},
		required: [
			'version',
			'kind',
			'title',
			'metric',
			'metrics',
			'dimension',
			'chartType',
			'range',
			'compareMode',
			'granularity',
			'limit'
		]
	};

	const keywordSpecSchema = {
		type: 'object',
		additionalProperties: false,
		properties: {
			version: { type: 'integer', enum: [1] },
			kind: { type: 'string', enum: ['keyword_tracking'] },
			title: { type: 'string', maxLength: 60 },
			variant: { type: 'string', enum: ['avg_position', 'visibility', 'list'] },
			groupId: { type: 'string', maxLength: 64 },
			limit: { anyOf: [{ type: 'null' }, { type: 'integer', minimum: 5, maximum: 200 }] }
		},
		required: ['version', 'kind', 'title', 'variant', 'groupId', 'limit']
	};

	const cardSchema = {
		type: 'object',
		additionalProperties: false,
		properties: {
			span: { type: 'integer', minimum: 1, maximum: 4 },
			spec: { anyOf: [graphSpecSchema, keywordSpecSchema] }
		},
		required: ['span', 'spec']
	};

	const schema = {
		type: 'object',
		additionalProperties: false,
		properties: {
			title: { type: 'string', maxLength: 60 },
			cards: { type: 'array', minItems: 3, maxItems: 16, items: cardSchema }
		},
		required: ['title', 'cards']
	};

	const payload = {
		model,
		messages: [
			{ role: 'system', content: system },
			{ role: 'user', content: prompt }
		],
		response_format: {
			type: 'json_schema',
			json_schema: { name: 'report_builder', strict: true, schema }
		}
	};

	let res;
	try {
		res = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				authorization: `Bearer ${apiKey}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify(payload)
		});
	} catch (e) {
		return json({ error: `Failed to reach OpenAI: ${e?.message || 'fetch failed'}` }, { status: 502 });
	}

	const raw = await res.text();
	if (!res.ok) {
		const errJson = safeJsonParse(raw);
		const message =
			errJson?.error?.message || errJson?.message || `OpenAI request failed (${res.status})`;
		return json({ error: message }, { status: 502 });
	}

	const data = safeJsonParse(raw);
	const content =
		data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.message?.refusal ?? '';
	const parsed = safeJsonParse(content);
	if (!parsed) return json({ error: 'AI response was not valid JSON.', raw: content }, { status: 502 });

	const title = String(parsed.title || 'Report').slice(0, 60);
	const cardsRaw = Array.isArray(parsed.cards) ? parsed.cards : [];
	const cards = [];

	for (const c of cardsRaw) {
		const span = Math.max(1, Math.min(4, Math.round(Number(c?.span) || 2)));
		const spec = c?.spec || null;
		if (!spec || typeof spec !== 'object') continue;

		if (spec.kind === 'keyword_tracking') {
			cards.push({ span: 4, spec: normalizeKeywordSpec(spec) });
			continue;
		}

		const normalized = normalizeGraphSpec(spec);
		if (normalized) cards.push({ span, spec: normalized });
	}

	if (cards.length < 3) {
		return json({ error: 'AI did not return enough usable cards.' }, { status: 502 });
	}

	return json({ title, cards });
}

