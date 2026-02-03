import { Problem } from '@/types';

export const generateProblem = (topicId: string): Problem => {
  const problems: Record<string, Problem[]> = {
    'math.base.arithmetic_op': [
      {
        id: 'arith-001',
        question: 'Calcola: $5 + (-3)$',
        answer: '2',
        type: 'free_input',
        explanation: 'Somma di numeri relativi: $5 + (-3) = 5 - 3 = 2$'
      },
      {
        id: 'arith-002',
        question: 'Calcola: $-7 - 4$',
        answer: '-11',
        type: 'free_input',
        explanation: 'Sottrazione di numeri relativi: $-7 - 4 = -(7 + 4) = -11$'
      }
    ],
    'math.base.fractions_intro': [
      {
        id: 'frac-intro-001',
        question: 'Quale frazione rappresenta \"tre quarti\"?',
        answer: '3/4',
        type: 'free_input',
        explanation: 'Tre quarti significa 3 parti su 4 totali'
      }
    ],
    'math.base.fractions_sum': [
      {
        id: 'frac-sum-001',
        question: 'Calcola: $\\frac{2}{5} + \\frac{1}{5}$',
        answer: '3/5',
        type: 'free_input',
        explanation: 'Frazioni con stesso denominatore: si sommano i numeratori'
      },
      {
        id: 'frac-sum-002',
        question: 'Calcola: $\\frac{1}{2} + \\frac{1}{4}$',
        answer: '3/4',
        type: 'free_input',
        hints: ['Trova il denominatore comune', '1/2 = 2/4'],
        explanation: 'm.c.m. di 2 e 4 è 4: $\\frac{2}{4} + \\frac{1}{4} = \\frac{3}{4}$'
      }
    ],
    'math.alg1.literal_exp': [
      {
        id: 'literal-001',
        question: 'Se $x = 3$, quanto vale $x + 5$?',
        answer: '8',
        type: 'free_input',
        explanation: 'Sostituisci x con 3: $3 + 5 = 8$'
      }
    ],
    'math.alg1.polynomials_add_sub': [
      {
        id: 'poly-add-001',
        question: 'Somma: $(2x + 3) + (x - 1)$',
        answer: '3x + 2',
        type: 'free_input',
        explanation: 'Somma i termini simili: $(2x + x) + (3 - 1) = 3x + 2$'
      }
    ],
    'math.alg1.linear_eq_basic': [
      {
        id: 'eq-basic-001',
        question: 'Risolvi: $x + 5 = 12$',
        answer: '7',
        type: 'free_input',
        explanation: 'Isola x: $x = 12 - 5 = 7$'
      },
      {
        id: 'eq-basic-002',
        question: 'Risolvi: $3x = 15$',
        answer: '5',
        type: 'free_input',
        explanation: 'Dividi entrambi i membri per 3: $x = 15 \\div 3 = 5$'
      }
    ]
  };

  const topicProblems = problems[topicId] || problems['math.base.arithmetic_op'];
  return topicProblems[Math.floor(Math.random() * topicProblems.length)];
};