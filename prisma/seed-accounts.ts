import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Luca0001!', 10);

  // Upsert Admin
  const admin = await prisma.user.upsert({
    where: { email: 'f.prof.h@gmail.com' },
    update: {
      password,
      role: 'ADMIN',
      name: 'Professor Ferrero',
    },
    create: {
      email: 'f.prof.h@gmail.com',
      password,
      role: 'ADMIN',
      name: 'Professor Ferrero',
    },
  });
  console.log('Admin upserted:', admin.email);

  // Upsert Teacher
  const teacher = await prisma.user.upsert({
    where: { email: 'holger.ferrero@piaggia.it' },
    update: {
      password,
      role: 'TEACHER',
      name: 'Holger Ferrero',
    },
    create: {
      email: 'holger.ferrero@piaggia.it',
      password,
      role: 'TEACHER',
      name: 'Holger Ferrero',
    },
  });
  console.log('Teacher upserted:', teacher.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
