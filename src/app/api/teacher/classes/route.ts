import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRequestIp, rateLimit } from '@/lib/rate-limit';
import { initializeStudentProgress } from '@/lib/student-onboarding';

type SessionUser = { user: { id: string; role: string } };

function parseCsvLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function pickDelimiter(content: string) {
  const firstLine = content.split(/\r?\n/)[0] || '';
  const commas = (firstLine.match(/,/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;
  return semicolons > commas ? ';' : ',';
}

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

function generatePassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function parseStudentsCsv(csv: string) {
  const cleaned = csv.trim();
  if (!cleaned) return [] as { firstName: string; lastName: string; email: string }[];

  const delimiter = pickDelimiter(cleaned);
  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0], delimiter).map((h) => h.toLowerCase().trim());
  const hasHeader = header.some((h) => ['email', 'mail', 'e-mail'].includes(h));

  const start = hasHeader ? 1 : 0;
  const students: { firstName: string; lastName: string; email: string }[] = [];

  for (let i = start; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    if (cols.length < 3) continue;

    const firstName = String(cols[0] || '').trim();
    const lastName = String(cols[1] || '').trim();
    const email = normalizeEmail(String(cols[2] || ''));

    if (!firstName || !lastName || !email) continue;
    if (!email.includes('@')) continue;

    students.push({ firstName, lastName, email });
  }

  return students;
}

async function requireTeacherOrAdmin() {
  const session = await getServerSession(authOptions) as SessionUser | null;
  if (!session?.user?.id) return null;
  if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') return null;
  return session;
}

async function importStudentsIntoClass(classroomId: string, csv: string) {
  const rows = parseStudentsCsv(csv);
  const imported: Array<{ email: string; name: string; generatedPassword?: string; status: string }> = [];

  for (const row of rows) {
    const fullName = `${row.firstName} ${row.lastName}`.trim();
    const existing = await prisma.user.findUnique({
      where: { email: row.email },
      select: { id: true, role: true },
    });

    let studentId: string | null = null;
    let generatedPassword: string | undefined;

    if (!existing) {
      generatedPassword = generatePassword();
      const hashed = await bcrypt.hash(generatedPassword, 12);
      const created = await prisma.user.create({
        data: {
          name: fullName,
          email: row.email,
          password: hashed,
          role: 'STUDENT',
        },
        select: { id: true },
      });
      studentId = created.id;
      await initializeStudentProgress(studentId);
      imported.push({ email: row.email, name: fullName, generatedPassword, status: 'created' });
    } else if (existing.role !== 'STUDENT') {
      imported.push({ email: row.email, name: fullName, status: 'skipped_non_student' });
      continue;
    } else {
      studentId = existing.id;
      imported.push({ email: row.email, name: fullName, status: 'linked_existing' });
    }

    await prisma.classEnrollment.upsert({
      where: {
        classroomId_studentId: {
          classroomId,
          studentId,
        },
      },
      update: {},
      create: {
        classroomId,
        studentId,
      },
    });
  }

  return imported;
}

export async function GET() {
  try {
    const session = await requireTeacherOrAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const classes = await prisma.classroom.findMany({
      where: { teacherId: session.user.id },
      include: {
        _count: {
          select: { enrollments: true, assignments: true },
        },
        enrollments: {
          take: 5,
          include: {
            student: {
              select: { id: true, name: true, email: true, level: true, xp: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ classes });
  } catch (error) {
    console.error('Error fetching classes:', error);
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
    const limit = rateLimit(`teacher-classes-create:${session.user.id}:${ip}`, 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { name, csv } = await req.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Nome classe obbligatorio' }, { status: 400 });
    }

    const classroom = await prisma.classroom.create({
      data: {
        name: name.trim(),
        teacherId: session.user.id,
      },
    });

    const imported = typeof csv === 'string' && csv.trim()
      ? await importStudentsIntoClass(classroom.id, csv)
      : [];

    return NextResponse.json({ classroom, imported }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Classe già esistente con questo nome' }, { status: 409 });
    }
    console.error('Error creating class:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireTeacherOrAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId, name, csv } = await req.json();
    if (!classId || typeof classId !== 'string') {
      return NextResponse.json({ error: 'classId obbligatorio' }, { status: 400 });
    }

    const classroom = await prisma.classroom.findFirst({
      where: {
        id: classId,
        teacherId: session.user.id,
      },
      select: { id: true },
    });

    if (!classroom) {
      return NextResponse.json({ error: 'Classe non trovata' }, { status: 404 });
    }

    if (typeof name === 'string' && name.trim()) {
      await prisma.classroom.update({
        where: { id: classId },
        data: { name: name.trim() },
      });
    }

    const imported = typeof csv === 'string' && csv.trim()
      ? await importStudentsIntoClass(classId, csv)
      : [];

    return NextResponse.json({ success: true, imported });
  } catch (error) {
    console.error('Error updating class:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireTeacherOrAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    if (!classId) {
      return NextResponse.json({ error: 'classId obbligatorio' }, { status: 400 });
    }

    const classroom = await prisma.classroom.findFirst({
      where: {
        id: classId,
        teacherId: session.user.id,
      },
      select: { id: true },
    });

    if (!classroom) {
      return NextResponse.json({ error: 'Classe non trovata' }, { status: 404 });
    }

    await prisma.classroom.delete({ where: { id: classId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting class:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
