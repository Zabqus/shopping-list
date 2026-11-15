/** Preferencja motywu: jawny jasny/ciemny albo podążanie za systemem. */
export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_KEY = 'zakupy:theme';
export const THEME_COLORS = { light: '#f3f4f1', dark: '#0f1112' } as const;

const CYCLE: ThemePreference[] = ['system', 'light', 'dark'];

export const theme = $state({
	preference: 'system' as ThemePreference,
	resolved: 'light' as ResolvedTheme
});

export function isThemePreference(value: string | null | undefined): value is ThemePreference {
	return value === 'light' || value === 'dark' || value === 'system';
}

export function readStoredTheme(): ThemePreference {
	try {
		const value = localStorage.getItem(THEME_KEY);
		if (isThemePreference(value)) return value;
	} catch {
		// brak localStorage — zostajemy przy systemie
	}
	return 'system';
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
	if (preference === 'light' || preference === 'dark') return preference;
	return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function nextTheme(preference: ThemePreference): ThemePreference {
	return CYCLE[(CYCLE.indexOf(preference) + 1) % CYCLE.length]!;
}

/** Ustawia data-theme, color-scheme i meta theme-color (bez migania przy starcie). */
export function applyTheme(preference: ThemePreference) {
	const resolved = resolveTheme(preference);
	const root = document.documentElement;
	root.dataset.theme = resolved;
	root.style.colorScheme = resolved;

	const meta = document.getElementById('theme-color');
	if (meta) meta.setAttribute('content', THEME_COLORS[resolved]);

	theme.preference = preference;
	theme.resolved = resolved;
}

export function setTheme(preference: ThemePreference) {
	applyTheme(preference);
	try {
		localStorage.setItem(THEME_KEY, preference);
	} catch {
		// ustawienie nie przetrwa odświeżenia
	}
}

export function cycleTheme() {
	setTheme(nextTheme(theme.preference));
	navigator.vibrate?.(10);
}

let ready = false;

/** Jednorazowa inicjalizacja po starcie aplikacji (layout). */
export function initTheme() {
	if (ready || typeof document === 'undefined') return;
	ready = true;
	applyTheme(readStoredTheme());

	const mq = matchMedia('(prefers-color-scheme: dark)');
	const onChange = () => {
		if (theme.preference === 'system') applyTheme('system');
	};
	mq.addEventListener('change', onChange);
}
