/**
 * One-time script: copy explanation from question_bank_questions into quiz_questions
 * for Phase 1 quizzes where quiz_questions.explanation is empty.
 * Matches by same course and normalized question text so existing data can display
 * without re-uploading or re-assigning.
 *
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-quiz-explanations-from-bank.ts
 * Or: npx tsx scripts/backfill-quiz-explanations-from-bank.ts
 *
 * Optional: set COURSE_ID=xxx to run only for that course (e.g. ERCI).
 */

import { prisma } from "../lib/prisma";

const COURSE_ID_FILTER = process.env.COURSE_ID ?? null;

function normalizeQuestionText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

async function main() {
  // Phase 1 quiz questions with missing explanation
  const quizQuestionsNeedingExplanation = await prisma.quizQuestion.findMany({
    where: {
      OR: [{ explanation: null }, { explanation: "" }],
      quiz: {
        isMockExam: false,
        ...(COURSE_ID_FILTER ? { courseId: COURSE_ID_FILTER } : {}),
      },
    },
    include: {
      quiz: {
        select: { courseId: true },
      },
    },
  });

  if (quizQuestionsNeedingExplanation.length === 0) {
    console.log("No Phase 1 quiz questions missing explanation. Nothing to do.");
    return;
  }

  console.log(
    `Found ${quizQuestionsNeedingExplanation.length} Phase 1 quiz questions with no explanation.`
  );

  // All question bank questions for those courses (with non-empty explanation)
  const courseIds = [...new Set(quizQuestionsNeedingExplanation.map((q) => q.quiz.courseId))];
  const bankQuestionsByCourse = await prisma.questionBankQuestion.findMany({
    where: {
      questionBank: {
        courseId: { in: courseIds },
        ...(COURSE_ID_FILTER ? { courseId: COURSE_ID_FILTER } : {}),
      },
      explanation: { not: null },
    },
    include: {
      questionBank: { select: { courseId: true } },
    },
  });

  // Index bank questions by (courseId, normalized question text) -> first with explanation
  const bankByCourseAndText = new Map<string, { id: string; explanation: string | null }>();
  for (const bq of bankQuestionsByCourse) {
    if (!bq.explanation?.trim()) continue;
    const key = `${bq.questionBank.courseId}\t${normalizeQuestionText(bq.question)}`;
    if (!bankByCourseAndText.has(key)) {
      bankByCourseAndText.set(key, { id: bq.id, explanation: bq.explanation });
    }
  }

  let updated = 0;
  let skipped = 0;

  for (const qq of quizQuestionsNeedingExplanation) {
    const key = `${qq.quiz.courseId}\t${normalizeQuestionText(qq.question)}`;
    const match = bankByCourseAndText.get(key);
    if (!match?.explanation) {
      skipped++;
      continue;
    }
    await prisma.quizQuestion.update({
      where: { id: qq.id },
      data: { explanation: match.explanation },
    });
    updated++;
  }

  console.log(`Updated ${updated} quiz questions with explanation from question bank.`);
  console.log(`Skipped ${skipped} (no matching bank question with explanation).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
