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

function normalizeIntent(intent) {
	const t = String(intent || '').trim().toLowerCase();
	if (t === 'informational') return 'Informational';
	if (t === 'commercial') return 'Commercial';
	if (t === 'transactional') return 'Transactional';
	if (t === 'llm') return 'LLM';
	return 'Informational';
}

function cleanList(items, limit) {
	const out = [];
	const seen = new Set();
	for (const raw of Array.isArray(items) ? items : []) {
		const s = String(raw || '')
			.replace(/^[-*•\d.)\s]+/, '')
			.replace(/\s+/g, ' ')
			.trim();
		if (!s) continue;
		const key = s.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(s);
		if (out.length >= limit) break;
	}
	return out;
}

function parseKeywords(content, count) {
	const trimmed = String(content || '').trim();
	if (!trimmed) return [];

	const asJson = safeJsonParse(trimmed);
	if (Array.isArray(asJson)) return cleanList(asJson, count);
	if (asJson && typeof asJson === 'object') {
		if (Array.isArray(asJson.keywords)) return cleanList(asJson.keywords, count);
		if (Array.isArray(asJson.items)) return cleanList(asJson.items, count);
	}

	const lines = trimmed.split(/\r?\n/g);
	return cleanList(lines, count);
}

export async function POST({ request, fetch }) {
	const apiKey = (env.OPENAI_API_KEY || '').trim();
	if (!apiKey) {
		return json({ error: 'OPENAI_API_KEY is not set on the server.' }, { status: 500 });
	}

	const model = String(env.OPENAI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;

	const body = await request.json().catch(() => null);
	const topic = String(body?.topic || '').trim();
	const intent = normalizeIntent(body?.intent);
	const count = Math.min(50, Math.max(1, Number(body?.count) || 25));

	if (!topic) return json({ error: 'topic is required' }, { status: 400 });

	const system = [
		'You are an SEO keyword generator.',
		'Generate a list of search queries relevant to the provided topic.',
		`Return EXACTLY ${count} unique keywords/queries.`,
		'Return ONLY valid JSON as an array of strings. No markdown, no extra keys.'
	].join(' ');

	const intentHints = {
		Informational:
			'Use educational/question phrasing (how/what/why/guides). Avoid purchase intent.',
		Commercial:
			'Use comparison/consideration phrasing (best, alternatives, vs, reviews, pricing comparison).',
		Transactional:
			'Use purchase intent phrasing (buy, price, deals, near me, quote, sign up).',
		LLM:
			'Use conversational assistant-style prompts (recommend, help me choose, explain, step-by-step).'
	};

	const user = [
		`Topic: ${topic}`,
		`Intent category: ${intent}`,
		`Guidance: ${intentHints[intent] || intentHints.Informational}`,
		'Output JSON array only.'
	].join('\n');

	const payload = {
		model,
		messages: [
			{ role: 'system', content: system },
			{ role: 'user', content: user }
		]
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
		const err = safeJsonParse(raw);
		const message = err?.error?.message || err?.message || `OpenAI request failed (${res.status})`;
		return json({ error: message }, { status: 502 });
	}

	const data = safeJsonParse(raw);
	const content =
		data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.message?.refusal ?? '';
	const keywords = parseKeywords(content, count);

	if (keywords.length === 0) {
		return json({ error: 'AI returned no keywords.', raw: content }, { status: 502 });
	}

	return json({ keywords });
}

