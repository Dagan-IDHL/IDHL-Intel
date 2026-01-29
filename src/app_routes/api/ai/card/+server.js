import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const DEFAULT_MODEL = 'gpt-5-mini';

function safeJsonParse(text) {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

function asStringArray(value, limit = 8) {
	if (!Array.isArray(value)) return [];
	return value
		.map((v) => String(v || '').trim())
		.filter(Boolean)
		.slice(0, limit);
}

export async function POST({ request, fetch }) {
	const apiKey = (env.OPENAI_API_KEY || '').trim();
	if (!apiKey) {
		return json(
			{ error: 'OPENAI_API_KEY is not set on the server.' },
			{ status: 500 }
		);
	}

	const model = String(env.OPENAI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;

	const body = await request.json().catch(() => null);
	const question = String(body?.question || '').trim();
	const context = body?.context || null;

	if (!question) {
		return json({ error: 'question is required' }, { status: 400 });
	}
	if (!context || typeof context !== 'object') {
		return json({ error: 'context is required' }, { status: 400 });
	}

	const system = [
		'You are an analytics assistant for a digital marketing dashboard.',
		'Only use the data provided in the `context`. Do not invent metrics, numbers, or sources.',
		'If the context is missing information needed to answer, say what is missing and suggest what to check next.',
		'Be concise, practical, and reference exact numbers when possible.'
	].join(' ');

	const schema = {
		type: 'object',
		additionalProperties: false,
		properties: {
			summaryBullets: {
				type: 'array',
				maxItems: 5,
				items: { type: 'string', maxLength: 180 }
			},
			keyFindings: {
				type: 'array',
				maxItems: 5,
				items: { type: 'string', maxLength: 180 }
			},
			nextChecks: {
				type: 'array',
				maxItems: 5,
				items: { type: 'string', maxLength: 180 }
			},
			confidence: { type: 'string', enum: ['low', 'medium', 'high'] }
		},
		required: ['summaryBullets', 'keyFindings', 'nextChecks', 'confidence']
	};

	const payload = {
		model,
		messages: [
			{ role: 'system', content: system },
			{
				role: 'user',
				content: [
					`Question: ${question}`,
					'Context (JSON):',
					JSON.stringify(context)
				].join('\n')
			}
		],
		response_format: {
			type: 'json_schema',
			json_schema: {
				name: 'card_analysis',
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
			errJson?.error?.message ||
			errJson?.message ||
			`OpenAI request failed (${res.status})`;
		return json({ error: message }, { status: 502 });
	}

	const data = safeJsonParse(raw);
	const content =
		data?.choices?.[0]?.message?.content ??
		data?.choices?.[0]?.message?.refusal ??
		'';
	const parsed = safeJsonParse(content);

	if (!parsed) {
		return json(
			{
				error: 'AI response was not valid JSON.',
				raw: content
			},
			{ status: 502 }
		);
	}

	return json({
		summaryBullets: asStringArray(parsed.summaryBullets, 5),
		keyFindings: asStringArray(parsed.keyFindings, 5),
		nextChecks: asStringArray(parsed.nextChecks, 5),
		confidence: String(parsed.confidence || 'low')
	});
}
