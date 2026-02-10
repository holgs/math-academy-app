export type GraphTopic = {
  id: string;
  title: string;
  description: string;
  layer: number;
  prerequisites: string[];
  interferenceLinks?: Array<{ topicId: string; reason?: string }>;
  status?: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'MASTERED';
};

type GraphCategory<T extends GraphTopic = GraphTopic> = {
  name: string;
  color: string;
  topics: T[];
};

export type GraphStructure<T extends GraphTopic = GraphTopic> = Record<string, Record<string, GraphCategory<T>>>;

export const SCHOOL_YEARS = ['1°', '2°', '3°', '4°', '5°'] as const;

const SECTION_LABELS: Record<string, string> = {
  base: 'Fondamenti',
  set: 'Insiemi',
  num: 'Numeri',
  alg: 'Algebra',
  alg1: 'Algebra 1',
  eq: 'Equazioni',
  diseq: 'Disequazioni',
  geom: 'Geometria',
  comb: 'Combinatoria',
  stat: 'Statistica',
  prob: 'Probabilita',
};

const FRIENDLY_TOKEN_LABELS: Record<string, string> = {
  // Macro aree
  base: 'Fondamenti di matematica',
  set: 'Insiemi e logica',
  num: 'Numeri e operazioni',
  alg: 'Algebra',
  alg1: 'Algebra di base',
  eq: 'Equazioni',
  diseq: 'Disequazioni',
  geom: 'Geometria',
  comb: 'Combinatoria e conteggio',
  stat: 'Statistica',
  prob: 'Probabilita',
  // Sotto-argomenti frequenti
  nat: 'Numeri naturali',
  int: 'Numeri interi',
  rat: 'Numeri razionali e frazioni',
  div: 'Divisibilita e numeri primi',
  mono: 'Monomi',
  monomials: 'Monomi',
  poly: 'Polinomi',
  polynomials: 'Polinomi',
  prod: 'Prodotti notevoli',
  fact: 'Scomposizione in fattori',
  fraz: 'Frazioni algebriche',
  lin: 'Equazioni lineari',
  linear: 'Equazioni lineari',
  arithmetic: 'Aritmetica',
  arithmetic_op: 'Aritmetica con interi',
  literal_exp: 'Espressioni letterali',
  fractions_intro: 'Introduzione alle frazioni',
  fractions_sum: 'Somma di frazioni',
  fractions_mul: 'Moltiplicazione di frazioni',
  fractions_div: 'Divisione di frazioni',
  add_sub: 'Addizione e sottrazione',
  mul: 'Moltiplicazione',
  div_basic: 'Divisione',
  def: 'Definizioni di base',
  rel: 'Relazioni tra insiemi',
  op: 'Operazioni',
  spec: 'Casi particolari',
  cong: 'Congruenza dei triangoli',
  tri: 'Triangoli',
  rette: 'Rette nel piano',
  quad: 'Quadrilateri',
  circ: 'Circonferenza e cerchio',
  punti: 'Punti notevoli',
  ang: 'Angoli',
};

const SECTION_COLORS: Record<string, string> = {
  base: '#3B82F6',
  set: '#3B82F6',
  num: '#10B981',
  alg: '#8B5CF6',
  alg1: '#8B5CF6',
  eq: '#F59E0B',
  diseq: '#F59E0B',
  geom: '#EC4899',
  comb: '#14B8A6',
  stat: '#14B8A6',
  prob: '#14B8A6',
};

const FALLBACK_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6'];

function titleCaseToken(token: string) {
  const value = token.replace(/_/g, ' ').trim();
  if (!value) return 'Generale';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function labelFromToken(token: string) {
  const lower = token.toLowerCase();
  return FRIENDLY_TOKEN_LABELS[lower] || SECTION_LABELS[lower] || titleCaseToken(lower);
}

function colorFromToken(token: string) {
  const lower = token.toLowerCase();
  return SECTION_COLORS[lower] || null;
}

function inferYear(point: GraphTopic): string {
  if (point.layer <= 0) return '1°';
  if (point.layer === 1) return '2°';
  if (point.layer === 2) return '3°';
  if (point.layer === 3) return '4°';
  return '5°';
}

function inferCategory(point: GraphTopic): string {
  const parts = point.id.split('.');
  const token = parts[1] || 'generale';
  return labelFromToken(token);
}

function inferSubcategory(point: GraphTopic): string {
  const parts = point.id.split('.');
  const token = parts[2] || 'argomenti';
  return labelFromToken(token);
}

export function buildStructure<T extends GraphTopic>(points: T[]): GraphStructure<T> {
  const sorted = [...points].sort(
    (a, b) => a.layer - b.layer || a.title.localeCompare(b.title, 'it')
  );
  const structure: GraphStructure<T> = {};
  const colorCache = new Map<string, string>();
  let colorIdx = 0;

  for (const point of sorted) {
    const year = inferYear(point);
    const category = inferCategory(point);
    const subcategory = inferSubcategory(point);
    const categoryKey = `${category}::${subcategory}`;

    if (!structure[year]) {
      structure[year] = {};
    }

    if (!structure[year][categoryKey]) {
      const colorKey = point.id.split('.')[1] || subcategory.toLowerCase();
      const explicitColor = colorFromToken(colorKey);
      if (!colorCache.has(subcategory)) {
        colorCache.set(subcategory, explicitColor || FALLBACK_COLORS[colorIdx % FALLBACK_COLORS.length]);
        colorIdx += 1;
      }
      structure[year][categoryKey] = {
        name: `${category} / ${subcategory}`,
        color: colorCache.get(subcategory)!,
        topics: [],
      };
    }

    structure[year][categoryKey].topics.push(point);
  }

  return structure;
}

export function findTopicById(points: GraphTopic[], id: string) {
  return points.find((point) => point.id === id) || null;
}

export function findDependents(points: GraphTopic[], id: string) {
  return points.filter((point) => point.prerequisites.includes(id));
}

export function makeTopicPath(point: GraphTopic) {
  return `${inferYear(point)} > ${inferCategory(point)} > ${point.title}`;
}
