import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/teacher/lessons/[id] - Get a specific lesson
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as { user: { id: string; role: string } } | null;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        knowledgePoint: {
          select: { title: true },
        },
        slides: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Check ownership
    if (lesson.teacherId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/teacher/lessons/[id] - Delete a lesson
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as { user: { id: string; role: string } } | null;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check ownership
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      select: { teacherId: true },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    if (lesson.teacherId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.lesson.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
