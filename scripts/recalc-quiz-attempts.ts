import { prisma } from "../lib/prisma";

const getOrderedOptionKeys = (options: Record<string, string>) => {
  const optionKeys = Object.keys(options || {});
  return optionKeys.slice().sort((a, b) => {
    const aNum = Number.parseInt(a.replace(/\D/g, ""), 10);
    const bNum = Number.parseInt(b.replace(/\D/g, ""), 10);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && aNum !== bNum) return aNum - bNum;
    return a.localeCompare(b);
  });
};

const resolveAnswerIndex = (answer: string | undefined, options: Record<string, string>) => {
  if (!answer) return null;
  const trimmed = answer.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  const orderedKeys = getOrderedOptionKeys(options);

  const directKey = orderedKeys.find((key) => key.toLowerCase() === lower);
  if (directKey) return orderedKeys.indexOf(directKey);

  const valueMatchKey = orderedKeys.find((key) => {
    const value = options[key];
    return value && value.trim().toLowerCase() === lower;
  });
  if (valueMatchKey) return orderedKeys.indexOf(valueMatchKey);

  const letterMatch = lower.match(/^([a-d])\s*[\).:\-]?/);
  if (letterMatch) {
    const idx = ["a", "b", "c", "d"].indexOf(letterMatch[1]);
    if (idx >= 0 && idx < orderedKeys.length) return idx;
  }

  const numberMatch = lower.match(/^([1-4])\s*[\).:\-]?/);
  if (numberMatch) {
    const idx = Number.parseInt(numberMatch[1], 10) - 1;
    if (idx >= 0 && idx < orderedKeys.length) return idx;
  }

  const optionMatch = lower.match(/^option\s*([1-9]\d*)/);
  if (optionMatch) {
    const idx = Number.parseInt(optionMatch[1], 10) - 1;
    if (idx >= 0 && idx < orderedKeys.length) return idx;
  }

  return null;
};

const recalcQuizAttempts = async (quizId: string) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!quiz) {
    console.error(`Quiz not found: ${quizId}`);
    process.exitCode = 1;
    return;
  }

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId },
    select: {
      id: true,
      score: true,
      answers: true,
    },
  });

  const totalQuestions = quiz.questions.length;
  let updatedCount = 0;

  for (const attempt of attempts) {
    const answers = (attempt.answers as Record<string, string>) || {};
    let correctAnswers = 0;

    quiz.questions.forEach((question) => {
      const options = (question.options as Record<string, string>) || {};
      const userIndex = resolveAnswerIndex(answers[question.id], options);
      const correctIndex = resolveAnswerIndex(question.correctAnswer, options);
      if (userIndex !== null && correctIndex !== null && userIndex === correctIndex) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / totalQuestions) * 100);
    if (score !== attempt.score) {
      await prisma.quizAttempt.update({
        where: { id: attempt.id },
        data: { score },
      });
      updatedCount++;
    }
  }

  console.log(
    `Recalculated ${attempts.length} attempts for quiz ${quizId}. Updated: ${updatedCount}.`
  );
};

const quizId = process.argv[2];
if (!quizId) {
  console.error("Usage: npx tsx scripts/recalc-quiz-attempts.ts <quizId>");
  process.exit(1);
}

recalcQuizAttempts(quizId)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
