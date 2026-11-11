const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 365 * 86400],
	['month', 30 * 86400],
	['day', 86400],
	['hour', 3600],
	['minute', 60]
];

/** `date` (Unix seconds) relative to `now` (milliseconds), such as "2 hr. ago". */
export function ago(date: number, now: number): string {
	const seconds = Math.max(0, now / 1000 - date);
	for (const [unit, size] of UNITS) {
		if (seconds >= size) return relative.format(-Math.floor(seconds / size), unit);
	}
	return relative.format(0, 'minute');
}

export const longDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' });
