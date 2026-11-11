-- 🪥 nie ma w czcionkach Windows 10 (wyświetla się jako prostokąt) — zamiana na szerzej wspierane emoji.
UPDATE categories SET icon = '🧼' WHERE name = 'Higiena' AND icon = '🪥';
