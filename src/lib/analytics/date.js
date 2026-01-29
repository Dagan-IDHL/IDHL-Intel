const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @param {string} isoDate YYYY-MM-DD
 */
export function parseIsoDateUtc(isoDate) {
	const [y, m, d] = isoDate.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d));
}

/**
 * @param {string} isoDate YYYY-MM-DD
 */
export function parseIsoParts(isoDate) {
	const [y, m, d] = isoDate.split('-').map(Number);
	return { y, m, d };
}

/**
 * @param {Date} dateUtc
 */
export function toIsoDateUtc(dateUtc) {
	const y = dateUtc.getUTCFullYear();
	const m = String(dateUtc.getUTCMonth() + 1).padStart(2, '0');
	const d = String(dateUtc.getUTCDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/**
 * Adds days (UTC) without DST issues.
 * @param {string} isoDate
 * @param {number} days
 */
export function addDays(isoDate, days) {
	const dt = parseIsoDateUtc(isoDate);
	return toIsoDateUtc(new Date(dt.getTime() + days * DAY_MS));
}

/**
 * Adds months (UTC), keeping day-of-month where possible.
 * If the resulting month has fewer days, clamps to the last day.
 * @param {string} isoDate
 * @param {number} months
 */
export function addMonths(isoDate, months) {
	const { y, m, d } = parseIsoParts(isoDate);
	const startMonthIndex = y * 12 + (m - 1);
	const nextMonthIndex = startMonthIndex + months;
	const ny = Math.floor(nextMonthIndex / 12);
	const nm = (nextMonthIndex % 12) + 1;
	const last = lastDayOfMonth(ny, nm);
	const nd = Math.min(d, last);
	return `${ny}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`;
}

/**
 * @param {number} year
 * @param {number} month1to12
 */
export function lastDayOfMonth(year, month1to12) {
	// Day 0 of next month = last day of current month
	return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

/**
 * @param {string} isoDate
 */
export function startOfMonth(isoDate) {
	const { y, m } = parseIsoParts(isoDate);
	return `${y}-${String(m).padStart(2, '0')}-01`;
}

/**
 * @param {string} isoDate
 */
export function endOfMonth(isoDate) {
	const { y, m } = parseIsoParts(isoDate);
	const last = lastDayOfMonth(y, m);
	return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

/**
 * Inclusive month count between start and end (by month component).
 * @param {string} startIso
 * @param {string} endIso
 */
export function monthsInclusive(startIso, endIso) {
	const s = parseIsoParts(startIso);
	const e = parseIsoParts(endIso);
	const si = s.y * 12 + (s.m - 1);
	const ei = e.y * 12 + (e.m - 1);
	return ei - si + 1;
}

/**
 * Inclusive day count between start and end.
 * @param {string} startIso
 * @param {string} endIso
 */
export function daysInclusive(startIso, endIso) {
	const start = parseIsoDateUtc(startIso).getTime();
	const end = parseIsoDateUtc(endIso).getTime();
	return Math.floor((end - start) / DAY_MS) + 1;
}

/**
 * @param {string} startIso
 * @param {string} endIso
 * @param {number} stepDays
 */
export function* iterateBuckets(startIso, endIso, stepDays) {
	let cursor = startIso;
	while (parseIsoDateUtc(cursor).getTime() <= parseIsoDateUtc(endIso).getTime()) {
		yield cursor;
		cursor = addDays(cursor, stepDays);
	}
}

/**
 * Iterates month bucket starts (YYYY-MM-01) across a date range.
 * @param {string} startIso
 * @param {string} endIso
 */
export function* iterateMonthBuckets(startIso, endIso) {
	let cursor = startOfMonth(startIso);
	const endMonth = startOfMonth(endIso);
	while (parseIsoDateUtc(cursor).getTime() <= parseIsoDateUtc(endMonth).getTime()) {
		yield cursor;
		cursor = startOfMonth(addMonths(cursor, 1));
	}
}

/**
 * Subtract 1 year while trying to preserve month/day.
 * @param {string} isoDate
 */
export function subYear(isoDate) {
	const dt = parseIsoDateUtc(isoDate);
	const y = dt.getUTCFullYear() - 1;
	const m = dt.getUTCMonth();
	const d = dt.getUTCDate();
	const shifted = new Date(Date.UTC(y, m, d));
	// Handle Feb 29 → Feb 28 when needed.
	if (shifted.getUTCMonth() !== m) {
		return toIsoDateUtc(new Date(Date.UTC(y, m, 28)));
	}
	return toIsoDateUtc(shifted);
}

export function todayIsoUtc() {
	return toIsoDateUtc(new Date());
}
