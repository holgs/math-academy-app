import { prisma } from '@/lib/prisma';

export async function initializeStudentProgress(userId: string) {
  const availableKPs = await prisma.knowledgePoint.findMany({
    where: {
      layer: 0,
      prerequisites: { isEmpty: true },
    },
    select: { id: true },
  });

  if (availableKPs.length === 0) {
    return;
  }

  await prisma.userProgress.createMany({
    data: availableKPs.map((kp) => ({
      userId,
      knowledgePointId: kp.id,
      status: 'AVAILABLE',
    })),
    skipDuplicates: true,
  });
}
