-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');

-- AlterTable
ALTER TABLE "ExerciseAttempt" ADD COLUMN     "assignmentId" TEXT;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "inClassTimerMinutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "lastSuccessPercent" DOUBLE PRECISION,
ADD COLUMN     "passThresholdPercent" INTEGER NOT NULL DEFAULT 70;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "nickname" TEXT;

-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassEnrollment" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkAssignment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT,
    "knowledgePointId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "exerciseCount" INTEGER NOT NULL DEFAULT 5,
    "subtopics" JSONB,
    "spacedLearningEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeworkAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkAssignmentExercise" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeworkAssignmentExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkAssignmentTarget" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "progressPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "HomeworkAssignmentTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSpacedTopic" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "knowledgePointId" TEXT NOT NULL,
    "sourceAssignmentId" TEXT,
    "nextDueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "intervalDays" INTEGER NOT NULL DEFAULT 2,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSpacedTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_teacherId_name_key" ON "Classroom"("teacherId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ClassEnrollment_classroomId_studentId_key" ON "ClassEnrollment"("classroomId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "HomeworkAssignmentExercise_assignmentId_exerciseId_key" ON "HomeworkAssignmentExercise"("assignmentId", "exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "HomeworkAssignmentTarget_assignmentId_studentId_key" ON "HomeworkAssignmentTarget"("assignmentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSpacedTopic_studentId_knowledgePointId_key" ON "StudentSpacedTopic"("studentId", "knowledgePointId");

-- AddForeignKey
ALTER TABLE "ExerciseAttempt" ADD CONSTRAINT "ExerciseAttempt_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "HomeworkAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkAssignment" ADD CONSTRAINT "HomeworkAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkAssignment" ADD CONSTRAINT "HomeworkAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkAssignment" ADD CONSTRAINT "HomeworkAssignment_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkAssignmentExercise" ADD CONSTRAINT "HomeworkAssignmentExercise_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "HomeworkAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkAssignmentExercise" ADD CONSTRAINT "HomeworkAssignmentExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkAssignmentTarget" ADD CONSTRAINT "HomeworkAssignmentTarget_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "HomeworkAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkAssignmentTarget" ADD CONSTRAINT "HomeworkAssignmentTarget_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSpacedTopic" ADD CONSTRAINT "StudentSpacedTopic_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSpacedTopic" ADD CONSTRAINT "StudentSpacedTopic_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSpacedTopic" ADD CONSTRAINT "StudentSpacedTopic_sourceAssignmentId_fkey" FOREIGN KEY ("sourceAssignmentId") REFERENCES "HomeworkAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
