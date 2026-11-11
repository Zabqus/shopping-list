const number = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 3 });

/** „1,5 kg”, „×2” albo pusty tekst. */
export function formatQuantity(quantity: number | null, unit: string | null): string {
	if (quantity === null) return unit ?? '';
	return unit ? `${number.format(quantity)} ${unit}` : `×${number.format(quantity)}`;
}

/** Tekst do pola dodawania: „2 kg ” + nazwa — używane przy wyborze podpowiedzi. */
export function quantityPrefix(quantity: number | null, unit: string | null): string {
	if (quantity === null) return '';
	return `${String(quantity).replace('.', ',')}${unit ? ` ${unit}` : ''} `;
}
