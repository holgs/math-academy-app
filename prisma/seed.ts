import { PrismaClient } from '@prisma/client';
import { knowledgeGraph } from '../src/data/knowledgeGraph';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Check if already seeded
  const existingCount = await prisma.knowledgePoint.count();
  if (existingCount > 0) {
    console.log(`⚠️  Database already has ${existingCount} knowledge points. Skipping seed.`);
    console.log('   Use `npx prisma migrate reset` to reseed.');
    return;
  }

  // Import knowledge points from the local data file
  console.log(`📚 Found ${knowledgeGraph.length} knowledge points to import`);

  // Import in order by layer to respect prerequisites
  const sortedNodes = [...knowledgeGraph].sort((a, b) => a.layer - b.layer);

  for (const node of sortedNodes) {
    await prisma.knowledgePoint.create({
      data: {
        id: node.id,
        title: node.title,
        description: node.description,
        layer: node.layer,
        prerequisites: node.prerequisites || [],
        interferenceLinks: node.interference_links || [],
        encompassedSkills: node.encompassed_skills || [],
      },
    });
    console.log(`  ✓ ${node.id}: ${node.title}`);
  }

  // Create sample exercises for each knowledge point
  const sampleExercises = [
    // Operazioni Base
    {
      kpId: 'math.base.arithmetic_op',
      question: 'Calcola: 15 + (-8) = ?',
      answer: '7',
      hint: 'Ricorda: sommare un numero negativo è come sottrarre il suo valore assoluto.',
      difficulty: 1,
    },
    {
      kpId: 'math.base.arithmetic_op',
      question: 'Calcola: -12 - (-5) = ?',
      answer: '-7',
      hint: 'Sottrarre un numero negativo è come sommare il suo valore assoluto.',
      difficulty: 2,
    },
    // Frazioni
    {
      kpId: 'math.base.fractions_intro',
      question: 'Quale frazione rappresenta la metà di una pizza?',
      answer: '1/2',
      hint: 'La metà si scrive come 1 diviso 2.',
      difficulty: 1,
    },
    {
      kpId: 'math.base.fractions_sum',
      question: 'Calcola: 1/4 + 2/4 = ?',
      answer: '3/4',
      hint: 'Con lo stesso denominatore, somma solo i numeratori.',
      difficulty: 1,
    },
    {
      kpId: 'math.base.fractions_sum',
      question: 'Calcola: 1/2 + 1/3 = ? (riduci ai minimi termini)',
      answer: '5/6',
      hint: 'Trova il minimo comune denominatore (6), poi converti entrambe le frazioni.',
      difficulty: 2,
    },
    {
      kpId: 'math.base.fractions_mul',
      question: 'Calcola: 2/3 × 3/4 = ?',
      answer: '1/2',
      hint: 'Moltiplica i numeratori tra loro e i denominatori tra loro, poi semplifica.',
      difficulty: 2,
    },
    {
      kpId: 'math.base.fractions_div',
      question: 'Calcola: 3/4 ÷ 2/5 = ?',
      answer: '15/8',
      hint: 'Moltiplica per il reciproco: 3/4 × 5/2.',
      difficulty: 3,
    },
    // Algebra
    {
      kpId: 'math.alg1.literal_exp',
      question: 'Se a = 3, quanto vale 2a + 5?',
      answer: '11',
      hint: 'Sostituisci a con 3: 2×3 + 5.',
      difficulty: 1,
    },
    {
      kpId: 'math.alg1.monomials',
      question: 'Qual è il grado del monomio 4x³y²?',
      answer: '5',
      hint: 'Somma gli esponenti: 3 + 2.',
      difficulty: 1,
    },
    {
      kpId: 'math.alg1.monomials',
      question: 'Semplifica: 3x²y + 5x²y = ?',
      answer: '8x²y',
      hint: 'Somma i coefficienti dei monomi simili.',
      difficulty: 2,
    },
    // Polinomi
    {
      kpId: 'math.alg1.polynomials_add_sub',
      question: 'Semplifica: (3x + 2) + (5x - 4) = ?',
      answer: '8x - 2',
      hint: 'Somma i termini simili: 3x + 5x e 2 - 4.',
      difficulty: 1,
    },
    {
      kpId: 'math.alg1.polynomials_mul',
      question: 'Espandi: (x + 2)(x + 3) = ?',
      answer: 'x² + 5x + 6',
      hint: 'Usa la proprietà distributiva: x·x + x·3 + 2·x + 2·3.',
      difficulty: 2,
    },
    // Equazioni
    {
      kpId: 'math.alg1.linear_eq_basic',
      question: 'Risolvi: x + 5 = 12',
      answer: '7',
      hint: 'Sottrai 5 da entrambi i lati.',
      difficulty: 1,
    },
    {
      kpId: 'math.alg1.linear_eq_basic',
      question: 'Risolvi: 3x = 27',
      answer: '9',
      hint: 'Dividi entrambi i lati per 3.',
      difficulty: 1,
    },
    {
      kpId: 'math.alg1.linear_eq_advanced',
      question: 'Risolvi: 2(x - 3) + 4 = 10',
      answer: '6',
      hint: 'Prima distribuisci: 2x - 6 + 4 = 10, poi risolvi.',
      difficulty: 2,
    },
    // Fattorizzazione
    {
      kpId: 'math.alg1.factoring_gcf',
      question: 'Raccogli il fattore comune: 6x + 9',
      answer: '3(2x + 3)',
      hint: 'Il MCD tra 6 e 9 è 3.',
      difficulty: 2,
    },
    {
      kpId: 'math.alg1.factoring_special',
      question: 'Fattorizza: x² - 9',
      answer: '(x + 3)(x - 3)',
      hint: 'Differenza di quadrati: a² - b² = (a+b)(a-b).',
      difficulty: 2,
    },
    {
      kpId: 'math.alg1.factoring_special',
      question: 'Fattorizza: x² + 6x + 9',
      answer: '(x + 3)²',
      hint: 'Quadrato di un binomio: (a+b)² = a² + 2ab + b².',
      difficulty: 3,
    },
  ];

  for (const ex of sampleExercises) {
    await prisma.exercise.create({
      data: {
        knowledgePointId: ex.kpId,
        question: ex.question,
        answer: ex.answer,
        hint: ex.hint,
        difficulty: ex.difficulty,
      },
    });
  }

  console.log(`✅ Seeded ${knowledgeGraph.length} knowledge points and ${sampleExercises.length} exercises`);
  
  // Create a default admin user
  const adminExists = await prisma.user.findUnique({
    where: { email: 'admin@mathacademy.it' }
  });
  
  if (!adminExists) {
    await prisma.user.create({
      data: {
        email: 'admin@mathacademy.it',
        name: 'Admin Math Academy',
        password: '$2a$10$YourHashedPasswordHere', // Placeholder - should be properly hashed
        role: 'ADMIN',
      }
    });
    console.log('✅ Created default admin user: admin@mathacademy.it');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
