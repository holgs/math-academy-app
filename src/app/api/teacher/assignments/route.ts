import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRequestIp, rateLimit } from '@/lib/rate-limit';

type SessionUser = { user: { id: string; role: string } };

async function requireTeacherOrAdmin() {
  const session = await getServerSession(authOptions) as SessionUser | null;
  if (!session?.user?.id) return null;
  if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') return null;
  return session;
}

function uniqueStrings(values: unknown[]) {
  const out = new Set<string>();
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      out.add(value.trim());
    }
  }
  return Array.from(out);
}

export async function GET() {
  try {
    const session = await requireTeacherOrAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assignments = await prisma.homeworkAssignment.findMany({
      where: { teacherId: session.user.id },
      include: {
        knowledgePoint: { select: { id: true, title: true } },
        classroom: { select: { id: true, name: true } },
        _count: {
          select: {
            targets: true,
            items: true,
          },
        },
        targets: {
          select: {
            status: true,
            progressPct: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      assignments: assignments.map((assignment) => {
        const done = assignment.targets.filter((t) => t.status === 'COMPLETED').length;
        const avgProgress = assignment.targets.length > 0
          ? assignment.targets.reduce((sum, t) => sum + t.progressPct, 0) / assignment.targets.length
          : 0;

        return {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          dueDate: assignment.dueDate,
          spacedLearningEnabled: assignment.spacedLearningEnabled,
          knowledgePoint: assignment.knowledgePoint,
          classroom: assignment.classroom,
          studentsCount: assignment._count.targets,
          exercisesCount: assignment._count.items,
          completedCount: done,
          avgProgress,
          createdAt: assignment.createdAt,
        };
      }),
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireTeacherOrAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const limit = rateLimit(`teacher-assignments-create:${session.user.id}:${ip}`, 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const {
      title,
      description,
      dueDate,
      classId,
      studentIds = [],
      knowledgePointId,
      subtopics = [],
      exerciseCount = 5,
      spacedLearningEnabled = false,
    } = await req.json();

    if (!title || !dueDate || !knowledgePointId) {
      return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 });
    }

    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) {
      return NextResponse.json({ error: 'Scadenza non valida' }, { status: 400 });
    }

    const rootKp = await prisma.knowledgePoint.findUnique({ where: { id: knowledgePointId }, select: { id: true } });
    if (!rootKp) {
      return NextResponse.json({ error: 'Argomento principale non trovato' }, { status: 404 });
    }

    const topicIds = uniqueStrings([knowledgePointId, ...subtopics]);
    const exercisesRequested = Math.min(30, Math.max(1, Number(exerciseCount) || 5));

    const classStudentIds = classId
      ? await prisma.classEnrollment.findMany({
          where: {
            classroomId: classId,
            classroom: { teacherId: session.user.id },
          },
          select: { studentId: true },
        }).then((rows) => rows.map((r) => r.studentId))
      : [];

    if (classId && classStudentIds.length === 0) {
      return NextResponse.json({ error: 'Classe non trovata o senza studenti' }, { status: 404 });
    }

    const explicitStudentIds = uniqueStrings(Array.isArray(studentIds) ? studentIds : []);
    const candidateStudentIds = uniqueStrings([...classStudentIds, ...explicitStudentIds]);

    if (candidateStudentIds.length === 0) {
      return NextResponse.json({ error: 'Seleziona almeno uno studente o una classe' }, { status: 400 });
    }

    const validStudents = await prisma.user.findMany({
      where: {
        id: { in: candidateStudentIds },
        role: 'STUDENT',
      },
      select: { id: true },
    });

    if (validStudents.length === 0) {
      return NextResponse.json({ error: 'Nessuno studente valido selezionato' }, { status: 400 });
    }

    const validStudentIds = validStudents.map((s) => s.id);

    const pool = await prisma.exercise.findMany({
      where: {
        knowledgePointId: { in: topicIds },
      },
      orderBy: [{ difficulty: 'asc' }, { createdAt: 'desc' }],
      take: 300,
      select: { id: true, knowledgePointId: true },
    });

    if (pool.length === 0) {
      return NextResponse.json({ error: 'Nessun esercizio disponibile per gli argomenti selezionati' }, { status: 400 });
    }

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selectedExercises = shuffled.slice(0, Math.min(exercisesRequested, shuffled.length));

    const assignment = await prisma.homeworkAssignment.create({
      data: {
        title: String(title).trim(),
        description: typeof description === 'string' ? description : null,
        teacherId: session.user.id,
        classId: classId || null,
        knowledgePointId,
        dueDate: due,
        exerciseCount: selectedExercises.length,
        subtopics: topicIds,
        spacedLearningEnabled: Boolean(spacedLearningEnabled),
        items: {
          create: selectedExercises.map((exercise) => ({
            exerciseId: exercise.id,
          })),
        },
        targets: {
          create: validStudentIds.map((studentId) => ({
            studentId,
            status: 'ASSIGNED',
          })),
        },
      },
      include: {
        _count: { select: { targets: true, items: true } },
      },
    });

    if (spacedLearningEnabled) {
      for (const studentId of validStudentIds) {
        for (const topicId of topicIds) {
          await prisma.studentSpacedTopic.upsert({
            where: {
              studentId_knowledgePointId: {
                studentId,
                knowledgePointId: topicId,
              },
            },
            update: {
              active: true,
              sourceAssignmentId: assignment.id,
              nextDueAt: due,
            },
            create: {
              studentId,
              knowledgePointId: topicId,
              sourceAssignmentId: assignment.id,
              nextDueAt: due,
              active: true,
            },
          });
        }
      }
    }

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        studentsCount: assignment._count.targets,
        exercisesCount: assignment._count.items,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
