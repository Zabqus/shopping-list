import type { ParsedItem } from '#lib/types.js';

const UNITS = ['kg', 'dag', 'g', 'l', 'ml', 'szt', 'op', 'opak', 'butelki', 'puszki'];
const unitPattern = UNITS.join('|');

// „2 mleko”, „1kg ziemniaki”, „1,5 l mleka”
const leading = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${unitPattern})?\\.?\\s+(.+)$`, 'i');
// „mleko x2”, „mleko 2x”, „ziemniaki 1kg”
const trailing = new RegExp(`^(.+?)\\s+(?:x\\s*(\\d+(?:[.,]\\d+)?)|(\\d+(?:[.,]\\d+)?)\\s*(x|${unitPattern})\\.?)$`, 'i');

const toNumber = (value: string) => Number(value.replace(',', '.'));

export function parseItem(input: string): ParsedItem {
	const text = input.trim().replace(/\s+/g, ' ');

	const lead = text.match(leading);
	if (lead) {
		return { name: lead[3], quantity: toNumber(lead[1]), unit: lead[2]?.toLowerCase() ?? null };
	}

	const trail = text.match(trailing);
	if (trail) {
		const quantity = toNumber(trail[2] ?? trail[3]);
		const unit = trail[4] && trail[4].toLowerCase() !== 'x' ? trail[4].toLowerCase() : null;
		return { name: trail[1], quantity, unit };
	}

	return { name: text, quantity: null, unit: null };
}
