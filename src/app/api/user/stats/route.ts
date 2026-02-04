import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

// XP required for each level (exponential growth)
const XP_FOR_LEVEL = (level: number) => Math.floor(100 * Math.pow(1.5, level - 1));

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        xp: true,
        coins: true,
        level: true,
        streak: true,
        lastActivity: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate next level XP
    const nextLevelXp = XP_FOR_LEVEL(user.level + 1);
    
    // Check and update streak
    const now = new Date();
    const lastActivity = user.lastActivity;
    let currentStreak = user.streak;
    
    if (lastActivity) {
      const daysSinceLastActivity = Math.floor(
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastActivity > 1) {
        // Streak broken
        currentStreak = 0;
        await prisma.user.update({
          where: { id: session.user.id },
          data: { streak: 0 }
        });
      }
    }

    return NextResponse.json({
      xp: user.xp,
      coins: user.coins,
      level: user.level,
      streak: currentStreak,
      nextLevelXp,
      progress: {
        current: user.xp,
        total: nextLevelXp,
        percentage: Math.min(100, Math.floor((user.xp / nextLevelXp) * 100))
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Award XP and coins for completing exercises
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { xpEarned, coinsEarned, exerciseId }: {
      xpEarned: number;
      coinsEarned: number;
      exerciseId: string;
    } = await request.json();

    // Get current user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { xp: true, level: true, coins: true, streak: true, lastActivity: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate new XP and check for level up
    const newXp = user.xp + xpEarned;
    const newCoins = user.coins + coinsEarned;
    let newLevel = user.level;
    let levelUp = false;

    // Check if user leveled up
    while (newXp >= XP_FOR_LEVEL(newLevel + 1)) {
      newLevel++;
      levelUp = true;
    }

    // Update streak
    const now = new Date();
    const lastActivity = user.lastActivity;
    let newStreak = user.streak;
    
    if (lastActivity) {
      const daysSinceLastActivity = Math.floor(
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastActivity === 1) {
        // Consecutive day
        newStreak++;
      } else if (daysSinceLastActivity > 1) {
        // Streak broken, start new
        newStreak = 1;
      }
      // If same day, don't change streak
    } else {
      newStreak = 1;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        xp: newXp,
        coins: newCoins,
        level: newLevel,
        streak: newStreak,
        lastActivity: now,
      }
    });

    // Record the attempt
    await prisma.exerciseAttempt.create({
      data: {
        userId: session.user.id,
        exerciseId,
        answer: 'completed',
        isCorrect: true,
        xpEarned,
        coinsEarned,
      }
    });

    return NextResponse.json({
      success: true,
      xp: updatedUser.xp,
      coins: updatedUser.coins,
      level: updatedUser.level,
      streak: updatedUser.streak,
      levelUp,
      xpEarned,
      coinsEarned,
    });
  } catch (error) {
    console.error('Error awarding XP:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
