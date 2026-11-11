/**
 * Wbudowany słownik: rdzeń słowa → nazwa kategorii (musi istnieć w tabeli categories).
 * Rdzenie ≥ 4 znaków dopasowują początek słowa („mlek” → „mleko”, „mleka”),
 * krótsze muszą pasować do całego słowa („ser”, „sok”).
 * Wybory użytkownika (tabela products) mają pierwszeństwo przed słownikiem.
 */
const DICTIONARY: Record<string, string[]> = {
	'Warzywa i owoce': [
		'ziemniak', 'kartof', 'pomidor', 'ogór', 'marchew', 'marchw', 'cebul', 'czosn', 'papryk',
		'sałat', 'kapust', 'brokuł', 'kalafior', 'por', 'pory', 'seler', 'pietruszk', 'koperek',
		'szczypior', 'rzodkiew', 'burak', 'buraczk', 'cukini', 'bakłażan', 'dynia', 'dyni', 'szpinak',
		'rukol', 'awokado', 'jabłk', 'jabłek', 'gruszk', 'gruszek', 'banan', 'pomarańcz', 'mandaryn',
		'cytryn', 'limonk', 'winogron', 'truskaw', 'malin', 'borówk', 'jagod', 'czereśn', 'wiśni',
		'śliwk', 'brzoskwin', 'nektaryn', 'arbuz', 'melon', 'kiwi', 'ananas', 'mango', 'grejpfrut',
		'pieczark', 'grzyb', 'imbir', 'natk', 'kiełk', 'owoc', 'warzyw', 'zielenin', 'szparag',
		'kukurydz', 'groszek', 'fasolka', 'rabarbar'
	],
	Pieczywo: [
		'chleb', 'chleba', 'bułk', 'bułek', 'bagiet', 'rogal', 'croissant', 'chałk', 'bajgl', 'tortill',
		'pieczyw', 'grahamk', 'kajzerk', 'pita', 'tost', 'pumpernikiel', 'precel'
	],
	Nabiał: [
		'mlek', 'mleczn', 'ser', 'sera', 'sery', 'serek', 'serki', 'twaróg', 'twarożek', 'jogurt',
		'kefir', 'maślank', 'śmietan', 'masło', 'masła', 'jaja', 'jajk', 'jajek', 'mozzarell',
		'parmezan', 'feta', 'skyr', 'mascarpone', 'ricott', 'margaryn', 'gouda', 'cheddar', 'brie',
		'camembert', 'halloumi'
	],
	'Mięso i ryby': [
		'mięso', 'mięsa', 'mięsny', 'mięsne', 'kurczak', 'kurczę', 'filet', 'piers', 'udko', 'udka',
		'udek', 'schab', 'karkówk', 'boczek', 'boczk', 'szynk', 'kiełbas', 'parówk', 'salami',
		'wołowin', 'wieprzow', 'indyk', 'indycz', 'mielon', 'kabanos', 'pasztet', 'ryba', 'ryby',
		'łosoś', 'łososi', 'tuńczyk', 'dorsz', 'śledź', 'śledzi', 'krewetk', 'makrel', 'pstrąg',
		'mintaj', 'wędlin', 'polędwic', 'żeberk', 'kaszank', 'golonk', 'baleron', 'kotlet', 'stek',
		'burger', 'mortadel'
	],
	Mrożonki: ['mrożon', 'lody', 'lodów', 'frytk', 'mrożonk', 'kostki lodu'],
	'Suche produkty': [
		'makaron', 'spaghetti', 'penne', 'fusilli', 'lasagne', 'ryż', 'ryżu', 'kasza', 'kaszy',
		'kaszę', 'mąka', 'mąki', 'mąkę', 'płatk', 'musli', 'owsian', 'cukier', 'cukru', 'olej',
		'oliw', 'ocet', 'octu', 'fasol', 'ciecierzyc', 'soczewic', 'groch', 'konserw', 'puszk',
		'sos', 'sosy', 'sosu', 'ketchup', 'majonez', 'musztard', 'przecier', 'koncentrat', 'passat',
		'dżem', 'miód', 'miodu', 'nutell', 'krem orzech', 'kuskus', 'bulgur', 'quinoa', 'komos',
		'drożdż', 'proszek do piecz', 'soda', 'chrzan', 'oliwk', 'pesto', 'tuńczyk w puszce'
	],
	Przyprawy: [
		'sól', 'soli', 'pieprz', 'przypraw', 'oregano', 'bazyli', 'tymianek', 'kminek', 'cynamon',
		'curry', 'kurkum', 'majeranek', 'laurow', 'ziele', 'gałka', 'wanili', 'chili', 'rozmaryn',
		'bulion', 'kostk rosoł', 'vegeta', 'gożdzik', 'goździk', 'kardamon'
	],
	Słodycze: [
		'czekolad', 'cukierk', 'baton', 'ciastk', 'ciasto', 'ciasta', 'wafel', 'wafl', 'chips',
		'paluszk', 'żelk', 'lizak', 'herbatnik', 'krakers', 'orzeszk', 'orzech', 'popcorn', 'draż',
		'pianki', 'sezamk', 'budyń', 'budyni', 'kisiel', 'galaretk', 'tort', 'pączk', 'pączek',
		'drożdżówk', 'słodycz', 'rodzynk', 'migdał', 'bakalie', 'delicje', 'pralin', 'chałw'
	],
	Napoje: [
		'woda', 'wody', 'wodę', 'wodą', 'sok', 'soki', 'soku', 'napój', 'napoje', 'napoju', 'cola',
		'coli', 'pepsi', 'fanta', 'sprite', 'piwo', 'piwa', 'wino', 'wina', 'wódk', 'whisky', 'kawa',
		'kawy', 'kawę', 'herbat', 'lemoniad', 'izoton', 'energetyk', 'tonik', 'kompot', 'nektar',
		'kakao', 'gin', 'rum', 'prosecco', 'szampan', 'cydr', 'mleko roślinne', 'oranżad'
	],
	Chemia: [
		'proszek', 'proszk', 'płyn', 'kapsułk', 'domestos', 'ludwik', 'cif', 'ajax', 'vanish',
		'zmywark', 'gąbk', 'gąbek', 'ścierk', 'odplamiacz', 'płukan', 'wybielacz', 'odświeżacz',
		'odkamieniacz', 'czyszcz', 'rękawiczk', 'worki', 'worek', 'kret', 'pronto', 'mop', 'mopa',
		'zmiotk', 'detergent', 'perwoll', 'lenor', 'finish'
	],
	Higiena: [
		'toaletow', 'mydło', 'mydła', 'mydeł', 'szampon', 'odżywk', 'zębów', 'szczoteczk',
		'dezodorant', 'antyperspirant', 'prysznic', 'krem', 'kremy', 'kremu', 'chusteczk', 'podpask',
		'tampon', 'pieluch', 'pampers', 'wacik', 'patyczk', 'maszynk', 'golark', 'nici', 'balsam',
		'płatki kosmet', 'pomadk', 'tusz', 'perfum', 'plaster', 'plastry', 'witamin', 'tabletk',
		'apap', 'ibuprom', 'higien'
	],
	Dom: [
		'żarów', 'bateri', 'ręcznik', 'świecz', 'świeczk', 'folia', 'folii', 'zapałk', 'zapalniczk',
		'serwetk', 'talerzyk', 'kubeczk', 'sztućc', 'taśm', 'klej', 'długopis', 'zeszyt', 'kwiat',
		'ziemia', 'ziemi', 'nawóz', 'papier do piecz', 'rękaw do piecz', 'woreczk', 'filtr',
		'karma', 'karmy', 'żwirek', 'przedłużacz'
	]
};

const normalize = (text: string) =>
	text
		.toLowerCase()
		.replace(/ł/g, 'l')
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '');

interface Rule {
	words: string[];
	category: string;
}

// Wielowyrazowe wpisy sprawdzamy najpierw (są bardziej szczegółowe).
const rules: Rule[] = Object.entries(DICTIONARY)
	.flatMap(([category, stems]) => stems.map((stem) => ({ words: normalize(stem).split(' '), category })))
	.sort((a, b) => b.words.length - a.words.length);

const wordMatches = (word: string, stem: string) =>
	stem.length >= 4 ? word.startsWith(stem) : word === stem;

/** Zwraca nazwę kategorii ze słownika albo null, jeśli nic nie pasuje. */
export function guessCategoryName(productName: string): string | null {
	const words = normalize(productName).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
	if (words.length === 0) return null;

	// Najpierw frazy wielowyrazowe (np. „papier do pieczenia”).
	for (const rule of rules) {
		if (rule.words.length < 2) break;
		for (let i = 0; i + rule.words.length <= words.length; i++) {
			if (rule.words.every((stem, j) => wordMatches(words[i + j], stem))) return rule.category;
		}
	}

	// Potem pojedyncze słowa — w kolejności, w jakiej występują w nazwie.
	for (const word of words) {
		for (const rule of rules) {
			if (rule.words.length === 1 && wordMatches(word, rule.words[0])) return rule.category;
		}
	}

	return null;
}
