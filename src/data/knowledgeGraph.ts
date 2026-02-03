import { KnowledgePoint } from '@/types';

export const knowledgeGraph: KnowledgePoint[] = [
  // Livello 0 - Fondamenta
  {
    id: 'math.base.arithmetic_op',
    title: 'Operazioni Base (Interi)',
    description: 'Somma e sottrazione di numeri interi relativi.',
    layer: 0,
    prerequisites: []
  },
  {
    id: 'math.base.fractions_intro',
    title: 'Introduzione alle Frazioni',
    description: 'Concetto di parte dell\'intero e frazioni proprie/improprie.',
    layer: 0,
    prerequisites: []
  },
  // Livello 1 - Concetti Base
  {
    id: 'math.base.fractions_sum',
    title: 'Somma di Frazioni',
    description: 'Somma di frazioni con denominatore comune e non.',
    layer: 1,
    prerequisites: ['math.base.arithmetic_op', 'math.base.fractions_intro'],
    encompassed_skills: [
      { topicId: 'math.base.arithmetic_op', weight: 0.8 }
    ]
  },
  {
    id: 'math.base.fractions_mul',
    title: 'Moltiplicazione di Frazioni',
    description: 'Prodotto tra numeratori e denominatori.',
    layer: 1,
    prerequisites: ['math.base.fractions_intro'],
    interference_links: [
      { topicId: 'math.base.fractions_sum', reason: 'Confusione sull\'uso del denominatore comune' }
    ]
  },
  {
    id: 'math.base.fractions_div',
    title: 'Divisione di Frazioni',
    description: 'Divisione come moltiplicazione per l\'inverso.',
    layer: 1,
    prerequisites: ['math.base.fractions_mul'],
    interference_links: [
      { topicId: 'math.base.fractions_mul', reason: 'Rischio di confondere moltiplicare e dividere le frazioni' }
    ]
  },
  {
    id: 'math.alg1.literal_exp',
    title: 'Espressioni Letterali',
    description: 'Introduzione alle lettere come segnaposto di numeri.',
    layer: 1,
    prerequisites: ['math.base.arithmetic_op']
  },
  {
    id: 'math.alg1.monomials',
    title: 'Monomi',
    description: 'Introduzione ai monomi e loro grado.',
    layer: 1,
    prerequisites: ['math.base.arithmetic_op', 'math.alg1.literal_exp'],
    encompassed_skills: [
      { topicId: 'math.base.arithmetic_op', weight: 0.4 },
      { topicId: 'math.alg1.literal_exp', weight: 0.6 }
    ]
  },
  // Livello 2 - Polinomi Base
  {
    id: 'math.alg1.polynomials_add_sub',
    title: 'Addizione e Sottrazione di Polinomi',
    description: 'Somma e differenza di polinomi.',
    layer: 2,
    prerequisites: ['math.alg1.monomials'],
    encompassed_skills: [
      { topicId: 'math.base.arithmetic_op', weight: 0.3 }
    ]
  },
  {
    id: 'math.alg1.polynomials_mul',
    title: 'Moltiplicazione di Polinomi',
    description: 'Prodotto di polinomi (anche con la regola distributiva).',
    layer: 2,
    prerequisites: ['math.alg1.polynomials_add_sub'],
    encompassed_skills: [
      { topicId: 'math.base.arithmetic_op', weight: 0.3 },
      { topicId: 'math.alg1.monomials', weight: 0.5 }
    ]
  },
  {
    id: 'math.alg1.linear_eq_basic',
    title: 'Equazioni di I Grado (Base)',
    description: 'Risoluzione di x + a = b e ax = b.',
    layer: 2,
    prerequisites: ['math.base.arithmetic_op', 'math.alg1.literal_exp'],
    encompassed_skills: [
      { topicId: 'math.base.arithmetic_op', weight: 0.5 }
    ]
  },
  // Livello 3 - Concetti Avanzati
  {
    id: 'math.alg1.polynomials_div',
    title: 'Divisione di Polinomi',
    description: 'Divisione di polinomi con metodo di Ruffini o divisione lunga.',
    layer: 3,
    prerequisites: ['math.alg1.polynomials_mul'],
    interference_links: [
      { topicId: 'math.alg1.polynomials_mul', reason: 'Confusione tra moltiplicare e dividere i polinomi' }
    ]
  },
  {
    id: 'math.alg1.factoring_gcf',
    title: 'Raccoglimento a Fattore Comune',
    description: 'Estrarre il fattore comune da un polinomio.',
    layer: 3,
    prerequisites: ['math.alg1.polynomials_mul'],
    encompassed_skills: [
      { topicId: 'math.alg1.monomials', weight: 0.4 }
    ]
  },
  {
    id: 'math.alg1.factoring_special',
    title: 'Fattorizzazione con Prodotti Notevoli',
    description: 'Riconoscimento e applicazione di (a±b)² e (a+b)(a-b).',
    layer: 3,
    prerequisites: ['math.alg1.factoring_gcf'],
    interference_links: [
      { topicId: 'math.alg1.polynomials_mul', reason: 'Rischio di usare la moltiplicazione invece della fattorizzazione' }
    ]
  },
  {
    id: 'math.alg1.linear_eq_advanced',
    title: 'Equazioni di I Grado (Avanzate)',
    description: 'Equazioni con parentesi e frazioni.',
    layer: 3,
    prerequisites: ['math.alg1.linear_eq_basic', 'math.base.fractions_div', 'math.alg1.polynomials_add_sub'],
    encompassed_skills: [
      { topicId: 'math.base.fractions_div', weight: 0.3 },
      { topicId: 'math.alg1.polynomials_add_sub', weight: 0.3 }
    ]
  }
];