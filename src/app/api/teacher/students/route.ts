import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getRequestIp, rateLimit } from '@/lib/rate-limit';
import { initializeStudentProgress } from '@/lib/student-onboarding';

async function requireTeacherOrAdmin() {
  const session = await getServerSession(authOptions) as { user: { id: string; role: string } } | null;
  if (!session?.user?.id) {
    return null;
  }
  if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
    return null;
  }
  return session;
}

// GET /api/teacher/students - Get all students with progress and stats
export async function GET() {
  try {
    const session = await requireTeacherOrAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        xp: true,
        level: true,
        streak: true,
        coins: true,
        lastActivity: true,
        createdAt: true,
        progress: {
          select: {
            masteryLevel: true,
            status: true,
          },
        },
        _count: {
          select: {
            attempts: true,
          },
        },
      },
      orderBy: { xp: 'desc' },
    });

    const studentsWithMastery = students.map(student => {
      const avgMastery = student.progress.length > 0
        ? student.progress.reduce((sum, p) => sum + p.masteryLevel, 0) / student.progress.length
        : 0;

      const masteredCount = student.progress.filter(p => p.status === 'MASTERED').length;
      const activeCount = student.progress.filter(p => p.status === 'IN_PROGRESS' || p.status === 'AVAILABLE').length;

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        xp: student.xp,
        level: student.level,
        streak: student.streak,
        coins: student.coins,
        lastActivity: student.lastActivity,
        createdAt: student.createdAt,
        masteryAvg: avgMastery,
        masteredCount,
        activeCount,
        attemptsCount: student._count.attempts,
      };
    });

    return NextResponse.json({ students: studentsWithMastery });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/teacher/students - Create student
export async function POST(req: Request) {
  try {
    const session = await requireTeacherOrAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const limit = rateLimit(`teacher-students-create:${session.user.id}:${ip}`, 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { name, email, password } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (String(password).length < 8) {
      return NextResponse.json({ error: 'Password too short' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    });
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const student = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: String(email).toLowerCase().trim(),
        password: hashedPassword,
        role: 'STUDENT',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    await initializeStudentProgress(student.id);

    return NextResponse.json({ student }, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/teacher/students - Update student and optionally reset password
export async function PATCH(req: Request) {
  try {
    const session = await requireTeacherOrAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getRequestIp(req);
    const limit = rateLimit(`teacher-students-update:${session.user.id}:${ip}`, 30, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { id, name, email, password } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing student id' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!target || target.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const data: Record<string, string> = {};
    if (typeof name === 'string') {
      data.name = name.trim();
    }
    if (typeof email === 'string') {
      data.email = email.toLowerCase().trim();
    }
    if (typeof password === 'string' && password.length > 0) {
      if (password.length < 8) {
        return NextResponse.json({ error: 'Password too short' }, { status: 400 });
      }
      data.password = await bcrypt.hash(password, 12);
    }

    const student = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({ student });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/teacher/students?id=... - Delete student
export async function DELETE(req: Request) {
  try {
    const session = await requireTeacherOrAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing student id' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!target || target.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
