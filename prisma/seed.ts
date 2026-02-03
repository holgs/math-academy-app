import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Check if already seeded
  const existingCount = await prisma.knowledgePoint.count();
  if (existingCount > 0) {
    console.log(`⚠️  Database already has ${existingCount} knowledge points. Skipping seed.`);
    return;
  }

  // Load KG JSON files
  const kgDir = path.join(process.cwd(), '..', 'math-academy-method', 'kg', 'KG.json');
  const file1 = JSON.parse(fs.readFileSync(path.join(kgDir, '1.JSON'), 'utf-8'));
  const file2 = JSON.parse(fs.readFileSync(path.join(kgDir, '2.JSON'), 'utf-8'));
  const allNodes = [...file1, ...file2];

  console.log(`📚 Found ${allNodes.length} knowledge points to import`);

  // Import in batches to respect prerequisites order (by layer)
  const sortedNodes = allNodes.sort((a: any, b: any) => a.layer - b.layer);

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

  // Create sample exercises for first few nodes
  const sampleExercises = [
    {
      kpId: 'math.set.def.01',
      question: 'Quale di queste è un\'insieme ben definito?',
      answer: 'I numeri pari maggiori di 10',
      hint: 'Un insieme deve avere criteri chiari per decidere se un elemento appartiene o no.',
      difficulty: 1,
    },
    {
      kpId: 'math.set.def.01',
      question: 'Rappresenta l\'insieme dei numeri primi minori di 10 con la notazione a elencazione.',
      answer: '{2, 3, 5, 7}',
      hint: 'I numeri primi sono divisibili solo per 1 e per sé stessi.',
      difficulty: 2,
    },
    {
      kpId: 'math.set.def.02',
      question: 'Scrivi l\'insieme delle vocali usando la notazione a elencazione.',
      answer: '{a, e, i, o, u}',
      hint: 'Le vocali sono 5 lettere dell\'alfabeto.',
      difficulty: 1,
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

  console.log(`✅ Seeded ${allNodes.length} knowledge points and ${sampleExercises.length} exercises`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });