import type { Category } from '#lib/types.js';

/** Odcień (hue) akcentu dla kategorii — kolor podpowiada, co to za alejka. */
const HUES: Record<string, number> = {
	'Warzywa i owoce': 135,
	Pieczywo: 32,
	Nabiał: 48,
	'Mięso i ryby': 4,
	Mrożonki: 195,
	'Suche produkty': 24,
	Przyprawy: 14,
	Słodycze: 330,
	Napoje: 215,
	Chemia: 270,
	Higiena: 175,
	Dom: 240,
	Inne: 220
};

export function categoryHue(category: Pick<Category, 'id' | 'name'> | undefined): number {
	if (!category) return 220;
	return HUES[category.name] ?? (category.id * 47) % 360;
}
