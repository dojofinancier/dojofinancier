/**
 * Check QuizQuestion records for null, empty, or invalid correctAnswer values.
 * Run: npx tsx scripts/check-quiz-correct-answers.ts
 */
import { prisma } from "../lib/prisma";

async function main() {
  const allQuestions = await prisma.quizQuestion.findMany({
    select: {
      id: true,
      quizId: true,
      order: true,
      question: true,
      correctAnswer: true,
      type: true,
      quiz: {
        select: {
          title: true,
          isMockExam: true,
          course: { select: { title: true } },
        },
      },
    },
    orderBy: [{ quizId: "asc" }, { order: "asc" }],
  });

  const problematic = allQuestions.filter((q) => {
    const ca = q.correctAnswer;
    return (
      ca == null ||
      typeof ca !== "string" ||
      ca.trim() === ""
    );
  });

  console.log(`\nChecked ${allQuestions.length} quiz questions.`);
  console.log(`Found ${problematic.length} with null/empty/invalid correctAnswer.\n`);

  if (problematic.length > 0) {
    console.log("Problematic questions:\n");
    for (const q of problematic) {
      console.log(`  ID: ${q.id}`);
      console.log(`  Quiz: ${q.quiz?.title ?? q.quizId} (mock: ${q.quiz?.isMockExam})`);
      console.log(`  Course: ${q.quiz?.course?.title ?? "—"}`);
      console.log(`  Order: ${q.order}`);
      console.log(`  correctAnswer: ${JSON.stringify(q.correctAnswer)}`);
      console.log(`  Question preview: ${(q.question || "").slice(0, 80)}...`);
      console.log("");
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
