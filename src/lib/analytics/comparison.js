import {
	addDays,
	addMonths,
	daysInclusive,
	endOfMonth,
	monthsInclusive,
	startOfMonth,
	subYear
} from './date.js';

/**
 * @param {import('./types.js').DateRange} range
 * @param {import('./types.js').CompareMode} mode
 * @returns {import('./types.js').DateRange|null}
 */
export function computeCompareRange(range, mode) {
	if (!range?.start || !range?.end) return null;
	if (mode === 'off') return null;

	if (mode === 'mom') {
		// If the range is full-month aligned, treat MoM as previous month range (same number of months).
		const fullMonthAligned =
			range.start === startOfMonth(range.start) && range.end === endOfMonth(range.end);

		if (fullMonthAligned) {
			const months = monthsInclusive(range.start, range.end);
			const compareEnd = endOfMonth(addMonths(range.start, -1));
			const compareStart = startOfMonth(addMonths(range.start, -months));
			return { start: compareStart, end: compareEnd };
		}

		const len = daysInclusive(range.start, range.end);
		const compareEnd = addDays(range.start, -1);
		const compareStart = addDays(compareEnd, -(len - 1));
		return { start: compareStart, end: compareEnd };
	}

	if (mode === 'yoy') {
		return { start: subYear(range.start), end: subYear(range.end) };
	}

	return null;
}

/**
 * @param {number} current
 * @param {number} compare
 */
export function computeDelta(current, compare) {
	const deltaAbs = current - compare;
	const deltaPct = compare === 0 ? null : deltaAbs / compare;
	return { deltaAbs, deltaPct };
}
