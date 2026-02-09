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

function asStringArray(value, limit = 6) {
	if (!Array.isArray(value)) return [];
	return value
		.map((v) => String(v || '').trim())
		.filter(Boolean)
		.slice(0, limit);
}

function mergeWrappedClarifyQuestions(list) {
	const items = Array.isArray(list) ? [...list] : [];
	const out = [];

	for (let i = 0; i < items.length; i += 1) {
		const cur = String(items[i] || '').trim();
		if (!cur) continue;

		const hasOpen = cur.includes('[');
		const hasClose = cur.includes(']');
		const openUnclosed = hasOpen && !hasClose;

		if (openUnclosed && i + 1 < items.length) {
			const next = String(items[i + 1] || '').trim();
			// If the next chunk looks like it's continuing the options, merge it in.
			if (next && (!next.includes('[') || next.includes('|') || next.includes(']'))) {
				out.push(`${cur} ${next}`.replace(/\s+/g, ' ').trim());
				i += 1;
				continue;
			}
		}

		out.push(cur);
	}

	return out;
}

function normalizeMetricMention(text) {
	const t = String(text || '').toLowerCase();
	/** @type {string[]} */
	const metrics = [];

	if (
		t.includes('average purchase value') ||
		t.includes('avg purchase value') ||
		t.includes('aov')
	) {
		metrics.push('averagePurchaseValue');
	}
	if (t.includes('engaged sessions') || t.includes('engagedsession'))
		metrics.push('engagedSessions');
	if (t.includes('sessions')) metrics.push('sessions');
	if (t.includes('clicks')) metrics.push('clicks');
	if (t.includes('impressions')) metrics.push('impressions');
	if (t.includes('ctr')) metrics.push('ctr');
	if (t.includes('bounce rate') || t.includes('bouncerate')) metrics.push('bounceRate');
	if (t.includes('purchases') || t.includes('conversions')) metrics.push('purchases');
	if (t.includes('revenue')) metrics.push('revenue');

	return Array.from(new Set(metrics));
}

function isSplitRequest(text) {
	const t = String(text || '').toLowerCase();
	return t.includes(' vs ') || t.includes('versus') || t.includes('split');
}

export async function POST({ request, fetch }) {
	const apiKey = (env.OPENAI_API_KEY || '').trim();
	if (!apiKey) {
		return json({ error: 'OPENAI_API_KEY is not set on the server.' }, { status: 500 });
	}

	const model = String(env.OPENAI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;

	const body = await request.json().catch(() => null);
	const messages = Array.isArray(body?.messages) ? body.messages : [];
	const context = body?.context || null;

	if (messages.length === 0) return json({ error: 'messages is required' }, { status: 400 });
	if (!context || typeof context !== 'object')
		return json({ error: 'context is required' }, { status: 400 });

	const lastUserMessage = [...messages]
		.reverse()
		.find((m) => (m?.role || 'user') !== 'assistant' && String(m?.content || '').trim());
	const lastUserText = String(lastUserMessage?.content || '').trim();

	const system = [
		'You are an analytics assistant for a digital marketing reporting dashboard.',
		'Only use the data provided in `context` (do not invent metrics or numbers).',
		'The context includes selected filters in `context.filters` and (when loaded) time series points in `context.timeSeries` for each metric at the chosen granularity.',
		'Derived metrics available: averagePurchaseValue = revenue / purchases.',
		'When asked to create a graph, return a `graphSpec` the UI can render.',
		'If the request is ambiguous, ask 1-2 clarifying questions (mode=clarify).',
		'For each clarifying question, include 3-7 suggested answer options in square brackets, separated by |. Example: "Which timeframe? [Last 28 days|Last month|Last quarter]".',
		'If the user asks for a split between two metrics (e.g. "sessions vs engaged sessions") and wants a pie/donut chart, use kind="kpi_split" with `metrics` set to both metric ids and chartType="pie".',
		'If the user asks for "metric vs metric" as a line graph, use kind="multi_time_series" with `metrics` (2+) and chartType="line".',
		'Do NOT use breakdown for metric-vs-metric graphs.',
		'Supported chart types include: line, bar, stacked charts, table, pie.',
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

	const schema = {
		type: 'object',
		additionalProperties: false,
		properties: {
			mode: { type: 'string', enum: ['answer', 'clarify', 'graph'] },
			answer: { type: 'string', maxLength: 900 },
			clarifyingQuestions: {
				type: 'array',
				maxItems: 2,
				items: { type: 'string', maxLength: 140 }
			},
			graphSpec: { anyOf: [{ type: 'null' }, graphSpecSchema] }
		},
		required: ['mode', 'answer', 'clarifyingQuestions', 'graphSpec']
	};

	const payload = {
		model,
		messages: [
			{ role: 'system', content: system },
			...messages.map((m) => ({
				role: m?.role === 'assistant' ? 'assistant' : 'user',
				content: String(m?.content || '').slice(0, 2000)
			})),
			{
				role: 'user',
				content: ['Dashboard context (JSON):', JSON.stringify(context)].join('\n')
			}
		],
		response_format: {
			type: 'json_schema',
			json_schema: {
				name: 'dashboard_chat',
				strict: true,
				schema
			}
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
		return json(
			{ error: `Failed to reach OpenAI: ${e?.message || 'fetch failed'}` },
			{ status: 502 }
		);
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
	if (!parsed)
		return json({ error: 'AI response was not valid JSON.', raw: content }, { status: 502 });

	/** @type {any} */
	let graphSpec = parsed.graphSpec || null;
	if (graphSpec && typeof graphSpec === 'object') {
		const filters = context?.filters || {};
		const start = String(filters.start || '').trim();
		const end = String(filters.end || '').trim();

		if (!graphSpec.range || typeof graphSpec.range !== 'object') graphSpec.range = null;
		if (graphSpec.range && (!graphSpec.range.start || !graphSpec.range.end) && start && end) {
			graphSpec.range = { start, end };
		}
		if (graphSpec.range === null && start && end) graphSpec.range = { start, end };

		if (!graphSpec.compareMode && filters.compareMode) graphSpec.compareMode = filters.compareMode;
		if (!graphSpec.granularity && filters.granularity) graphSpec.granularity = filters.granularity;
		if (graphSpec.limit == null) graphSpec.limit = graphSpec.kind === 'breakdown' ? 10 : null;

		const isValidDimension = (d) => d === 'page' || d === 'query' || d === 'source';
		if (graphSpec.kind === 'breakdown') {
			if (!isValidDimension(graphSpec.dimension)) graphSpec.dimension = 'page';
		} else {
			graphSpec.dimension = null;
		}

		const wantsPie =
			String(graphSpec.chartType || '').toLowerCase() === 'pie' ||
			/\bpie\b|\bdonut\b/i.test(lastUserText);
		const wantsLine =
			String(graphSpec.chartType || '').toLowerCase() === 'line' || /\bline\b/i.test(lastUserText);

		// Ensure `metrics` is present for strict schemas.
		if (graphSpec.metrics === undefined) graphSpec.metrics = null;

		if (graphSpec.kind === 'kpi_split' || graphSpec.kind === 'multi_time_series') {
			if (!Array.isArray(graphSpec.metrics)) graphSpec.metrics = [];
			graphSpec.metrics = graphSpec.metrics
				.map((m) => String(m || '').trim())
				.filter(Boolean)
				.map((m) => normalizeMetricId(m))
				.slice(0, 4);
		} else {
			graphSpec.metrics = null;
		}

		if (graphSpec.metric) graphSpec.metric = normalizeMetricId(graphSpec.metric);

		// Heuristic correction: "sessions vs engaged sessions split" should never become a breakdown-by-page pie.
		const mentioned = normalizeMetricMention(lastUserText);
		if (isSplitRequest(lastUserText) && mentioned.length >= 2 && graphSpec.kind === 'breakdown') {
			if (wantsLine) {
				graphSpec = {
					version: 1,
					kind: 'multi_time_series',
					title: graphSpec.title || 'Comparison',
					metric: mentioned[0],
					metrics: mentioned.slice(0, 4),
					dimension: null,
					chartType: 'line',
					range: graphSpec.range || (start && end ? { start, end } : null),
					compareMode: graphSpec.compareMode || 'off',
					granularity: graphSpec.granularity || 'auto',
					limit: null
				};
			} else if (wantsPie) {
				graphSpec = {
					version: 1,
					kind: 'kpi_split',
					title: graphSpec.title || 'Split',
					metric: mentioned[0],
					metrics: mentioned.slice(0, 4),
					dimension: null,
					chartType: 'pie',
					range: graphSpec.range || (start && end ? { start, end } : null),
					compareMode: 'off',
					granularity: graphSpec.granularity || 'auto',
					limit: null
				};
			}
		}
		if (!graphSpec.version) graphSpec.version = 1;
	}

	return json({
		mode: String(parsed.mode || 'answer'),
		answer: String(parsed.answer || ''),
		clarifyingQuestions: mergeWrappedClarifyQuestions(
			asStringArray(parsed.clarifyingQuestions, 4)
		).slice(0, 2),
		graphSpec
	});
}
