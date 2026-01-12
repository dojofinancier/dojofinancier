import { appendFileSync, writeFileSync } from "fs";
import { prisma } from "../lib/prisma";
import { generateEnhancedStudyPlan } from "../lib/utils/enhanced-study-plan";
import { StudyPlanConfig } from "../lib/utils/study-plan";

const LOG_FILE = "manual-regenerate.log";

function log(message: string) {
  console.log(message);
  appendFileSync(LOG_FILE, message + "\n");
}

async function main() {
  writeFileSync(LOG_FILE, "");

  const userEmail = process.argv[2] ?? "student003@test.com";
  const courseSlug = process.argv[3] ?? "ccvm-1";

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    throw new Error(`User with email ${userEmail} not found`);
  }

  const course = await prisma.course.findFirst({
    where: { slug: courseSlug },
  });

  if (!course) {
    throw new Error(`Course with slug ${courseSlug} not found`);
  }

  const settings = await prisma.userCourseSettings.findUnique({
    where: {
      userId_courseId: {
        userId: user.id,
        courseId: course.id,
      },
    },
  });

  if (!settings || !settings.examDate || !settings.planCreatedAt) {
    throw new Error("User course settings are incomplete");
  }

  const config: StudyPlanConfig = {
    examDate: settings.examDate,
    studyHoursPerWeek: settings.studyHoursPerWeek ?? 6,
    selfRating: settings.selfRating,
    preferredStudyDays: (settings.preferredStudyDays as number[]) || [1, 2, 3, 4, 5],
    planCreatedAt: settings.planCreatedAt,
  };

  const result = await generateEnhancedStudyPlan(course.id, user.id, config);

  log(
    `[manual-regenerate-plan] Generated ${result.blocks.length} blocks with ${result.warnings.length} warnings`
  );

  await prisma.dailyPlanEntry.deleteMany({
    where: {
      userId: user.id,
      courseId: course.id,
    },
  });

  let inserted = 0;
  for (let i = 0; i < result.blocks.length; i += 100) {
    const batch = result.blocks.slice(i, i + 100);
    const createResult = await prisma.dailyPlanEntry.createMany({
      data: batch.map((block) => ({
        userId: user.id,
        courseId: course.id,
        date: block.date,
        taskType: block.taskType,
        targetModuleId: block.targetModuleId,
        targetContentItemId: block.targetContentItemId,
        targetQuizId: block.targetQuizId,
        targetFlashcardIds: block.targetFlashcardIds ? (block.targetFlashcardIds as any) : null,
        status: "PENDING",
        estimatedBlocks: block.estimatedBlocks,
        order: block.order,
      })),
    });
    inserted += createResult.count;
  }

  log(`[manual-regenerate-plan] Inserted ${inserted} plan entries`);
  if (result.warnings.length > 0) {
    result.warnings.forEach((warning) => log(`[warning] ${warning}`));
  }
}

main()
  .catch((err) => {
    log(`ERROR: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

