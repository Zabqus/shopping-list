import { error } from '@sveltejs/kit';
import type { ItemPatch } from '#lib/types.js';

export function parseId(value: string | undefined): number {
	const id = Number(value);
	if (!Number.isInteger(id) || id <= 0) error(400, 'Nieprawidłowe id');
	return id;
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
	try {
		const body = await request.json();
		if (body && typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>;
	} catch {
		// niżej zwracamy 400
	}
	error(400, 'Oczekiwano obiektu JSON');
}

/** Id klienta (karty przeglądarki) — trafia do zdarzeń SSE, żeby klient mógł zignorować własne zmiany. */
export const clientId = (request: Request) => request.headers.get('x-client-id')?.slice(0, 64) || undefined;

export function text(value: unknown, field: string, max = 200): string {
	if (typeof value !== 'string' || !value.trim()) error(400, `Pole „${field}” jest wymagane`);
	return value.trim().slice(0, max);
}

function optionalText(value: unknown, field: string, max: number): string | null {
	if (value === null || value === '') return null;
	if (typeof value !== 'string') error(400, `Pole „${field}” musi być tekstem`);
	return value.trim().slice(0, max) || null;
}

export function optionalIcon(value: unknown): string | null {
	return optionalText(value, 'icon', 16);
}

export function itemPatch(body: Record<string, unknown>): ItemPatch {
	const patch: ItemPatch = {};

	if ('name' in body) patch.name = text(body.name, 'name');
	if ('note' in body) patch.note = optionalText(body.note, 'note', 500);
	if ('unit' in body) patch.unit = optionalText(body.unit, 'unit', 20);
	if ('checked' in body) {
		if (typeof body.checked !== 'boolean') error(400, 'Pole „checked” musi być true/false');
		patch.checked = body.checked;
	}
	if ('quantity' in body) {
		const q = body.quantity;
		if (q !== null && (typeof q !== 'number' || !Number.isFinite(q) || q < 0)) {
			error(400, 'Pole „quantity” musi być liczbą ≥ 0 lub null');
		}
		patch.quantity = q === 0 ? null : (q as number | null);
	}
	if ('category_id' in body) {
		const c = body.category_id;
		if (c !== null && (typeof c !== 'number' || !Number.isInteger(c))) {
			error(400, 'Pole „category_id” musi być liczbą lub null');
		}
		patch.category_id = c as number | null;
	}

	return patch;
}
